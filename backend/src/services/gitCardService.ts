import axios, { type AxiosInstance } from 'axios';
import config from '../config/octoConfig';
import { OctoCardError } from '../types/octoCardError';
import { PropsGitCard } from '../types/gitCardType';

interface GithubRepository {
    private?: boolean;
    name?: string | null;
    default_branch?: string;
    stargazers_count?: number;
    forks_count?: number;
    html_url?: string;
}

interface GithubTreeEntry {
    path?: string;
    type?: string;
}

interface GithubTree {
    tree?: GithubTreeEntry[];
    truncated?: boolean;
}

type GithubClient = Pick<AxiosInstance, 'get'>;
type CachedCard = { expiresAt: number; value: Promise<PropsGitCard> };
type ImageCandidate = { url: string; label: string; readmeLinked: boolean };

const CARD_CACHE_TTL_MS = 5 * 60 * 1000;
const CARD_CACHE_MAX_ENTRIES = 500;
const IMAGE_FILE_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|tiff?|webp)(?:$|[?#])/i;

const createGithubClient = (): AxiosInstance => {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'
    };

    if (config.token) {
        headers.Authorization = 'Bearer ' + config.token;
    }

    return axios.create({
        baseURL: 'https://api.github.com',
        timeout: config.githubTimeoutMs,
        headers
    });
};

const normalizeGithubError = (error: unknown): OctoCardError => {
    if (error instanceof OctoCardError) {
        return error;
    }

    if (!axios.isAxiosError(error)) {
        return new OctoCardError('UPSTREAM_ERROR', 502, 'GitHub API request failed.');
    }

    const status = error.response?.status;
    const headers = error.response?.headers;
    const remaining = headers?.['x-ratelimit-remaining'];
    const retryAfter = headers?.['retry-after'];
    const rateLimited = status === 429 || (
        status === 403 && (String(remaining) === '0' || retryAfter !== undefined)
    );

    if (rateLimited) {
        return new OctoCardError('GITHUB_RATE_LIMITED', 429, 'GitHub API rate limit exceeded.');
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new OctoCardError('GITHUB_TIMEOUT', 504, 'GitHub API request timed out.');
    }

    if (status === 401) {
        return new OctoCardError('GITHUB_UNAUTHORIZED', 401, 'GitHub rejected the configured credentials.');
    }

    if (status === 403) {
        return new OctoCardError('GITHUB_FORBIDDEN', 403, 'GitHub denied access to this resource.');
    }

    if (status === 404) {
        return new OctoCardError('REPOSITORY_NOT_FOUND', 404, 'Repository not found.');
    }

    return new OctoCardError('UPSTREAM_ERROR', 502, 'GitHub API request failed.');
};

const isGithubNotFound = (error: unknown): boolean =>
    axios.isAxiosError(error) && error.response?.status === 404;

const isGithubRateLimited = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) {
        return false;
    }

    const headers = error.response?.headers;
    return error.response?.status === 429 || (
        error.response?.status === 403 && (
            String(headers?.['x-ratelimit-remaining']) === '0' ||
            headers?.['retry-after'] !== undefined
        )
    );
};

const encodePathSegment = (value: string): string => encodeURIComponent(value);

const normalizeRepositoryPath = (value: string): string | null => {
    const segments: string[] = [];
    for (const segment of value.replace(/\\/g, '/').split('/')) {
        if (!segment || segment === '.') {
            continue;
        }
        if (segment === '..') {
            if (segments.length === 0) {
                return null;
            }
            segments.pop();
            continue;
        }
        segments.push(segment);
    }
    return segments.join('/');
};

const decodePathSegments = (value: string): string => value
    .split('/')
    .map((segment) => {
        try {
            return decodeURIComponent(segment);
        } catch {
            return segment;
        }
    })
    .join('/');

const buildRawImageUrl = (
    owner: string,
    repo: string,
    branch: string,
    path: string
): string => {
    const encodedBranch = branch.split('/').map(encodePathSegment).join('/');
    const encodedPath = path.split('/').map(encodePathSegment).join('/');
    return 'https://raw.githubusercontent.com/' + encodePathSegment(owner) + '/' +
        encodePathSegment(repo) + '/' + encodedBranch + '/' + encodedPath;
};

const resolveImageReference = (
    reference: string,
    owner: string,
    repo: string,
    branch: string
): string | null => {
    const value = reference.trim().replace(/^<|>$/g, '').replace(/&amp;/gi, '&');
    if (!value || /^data:/i.test(value) || /^javascript:/i.test(value)) {
        return null;
    }

    if (value.startsWith('//')) {
        return 'https:' + value;
    }

    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:') {
                return null;
            }

            const blobPrefix = '/' + owner + '/' + repo + '/blob/';
            if (url.hostname.toLowerCase() === 'github.com' && url.pathname.startsWith(blobPrefix)) {
                const branchAndPath = url.pathname.slice(blobPrefix.length);
                const branchPrefix = branch.replace(/^\/+|\/+$/g, '') + '/';
                const path = branchAndPath.startsWith(branchPrefix)
                    ? branchAndPath.slice(branchPrefix.length)
                    : branchAndPath.split('/').slice(1).join('/');
                const normalizedPath = normalizeRepositoryPath(decodePathSegments(path));
                if (normalizedPath) {
                    return buildRawImageUrl(owner, repo, branch, normalizedPath);
                }
            }

            return url.href;
        } catch {
            return null;
        }
    }

    const repositoryPath = value.split(/[?#]/, 1)[0];
    const normalizedPath = normalizeRepositoryPath(decodePathSegments(repositoryPath));
    return normalizedPath ? buildRawImageUrl(owner, repo, branch, normalizedPath) : null;
};

const readmeImageReferences = (readmeContent: string): Array<{ reference: string; label: string }> => {
    const references: Array<{ reference: string; label: string }> = [];
    const add = (reference: string, label: string): void => {
        if (reference.trim()) {
            references.push({ reference: reference.trim(), label: label.trim() });
        }
    };

    const definitions = new Map<string, string>();
    const definitionPattern = /^\s*\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm;
    let definition: RegExpExecArray | null;
    while ((definition = definitionPattern.exec(readmeContent)) !== null) {
        definitions.set(definition[1].toLowerCase(), definition[2] || definition[3]);
    }

    const markdownPattern = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))/g;
    let markdownImage: RegExpExecArray | null;
    while ((markdownImage = markdownPattern.exec(readmeContent)) !== null) {
        add(markdownImage[2] || markdownImage[3], markdownImage[1]);
    }

    const referencePattern = /!\[([^\]]*)\](?:\[([^\]]*)\])/g;
    let referenceImage: RegExpExecArray | null;
    while ((referenceImage = referencePattern.exec(readmeContent)) !== null) {
        const key = (referenceImage[2] || referenceImage[1]).toLowerCase();
        const source = definitions.get(key);
        if (source) {
            add(source, referenceImage[1]);
        }
    }

    const htmlImagePattern = /<img\b([^>]*)>/gi;
    let htmlImage: RegExpExecArray | null;
    while ((htmlImage = htmlImagePattern.exec(readmeContent)) !== null) {
        const sourceMatch = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(htmlImage[1]);
        const labelMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(htmlImage[1]);
        const source = sourceMatch && (sourceMatch[1] || sourceMatch[2] || sourceMatch[3]);
        const label = labelMatch && (labelMatch[1] || labelMatch[2]);
        if (source) {
            add(source, label || '');
        }
    }

    return references;
};

const imageCandidateScore = (candidate: ImageCandidate): number => {
    const description = (candidate.label + ' ' + candidate.url).toLowerCase();
    if (/badge|shield|shields\.io/.test(description)) {
        return -1;
    }
    if (/\b(?:banner|cover|header|hero)\b|social[-_ ]?preview|open[-_ ]?graph/.test(description)) {
        return 100;
    }
    if (/illustration|artwork|feature[-_ ]?image/.test(description)) {
        return 90;
    }
    if (/showcase|screenshot|preview|demo[-_ ]?image/.test(description)) {
        return 75;
    }
    if (/\b(?:logo|brand|icon)\b/.test(description)) {
        return 60;
    }
    return candidate.readmeLinked ? 40 : 10;
};

export const createGitCardService = (client: GithubClient = createGithubClient()) => {
    const cardCache = new Map<string, CachedCard>();

    const fetchRepoInfo = async (owner: string, repo: string): Promise<GithubRepository> => {
        try {
            const response = await client.get<GithubRepository>(
                '/repos/' + encodePathSegment(owner) + '/' + encodePathSegment(repo)
            );
            return response.data;
        } catch (error) {
            throw normalizeGithubError(error);
        }
    };

    const fetchRepoReadme = async (owner: string, repo: string): Promise<string> => {
        try {
            const response = await client.get<string>(
                '/repos/' + encodePathSegment(owner) + '/' + encodePathSegment(repo) + '/readme',
                { headers: { Accept: 'application/vnd.github.raw+json' } }
            );
            return response.data || '';
        } catch (error) {
            // A missing README is optional data; other failures must remain visible.
            if (isGithubNotFound(error)) {
                return '';
            }
            throw normalizeGithubError(error);
        }
    };

    const fetchRepoLanguages = async (owner: string, repo: string): Promise<string[]> => {
        try {
            const response = await client.get<Record<string, number>>(
                '/repos/' + encodePathSegment(owner) + '/' + encodePathSegment(repo) + '/languages'
            );
            return Object.keys(response.data || {});
        } catch (error) {
            throw normalizeGithubError(error);
        }
    };

    const fetchRepoIllustrationImage = async (
        owner: string,
        repo: string,
        readmeContent: string,
        branch: string
    ): Promise<string> => {
        const candidates: ImageCandidate[] = readmeImageReferences(readmeContent)
            .map(({ reference, label }) => ({
                url: resolveImageReference(reference, owner, repo, branch) || '',
                label,
                readmeLinked: true
            }))
            .filter((candidate) => candidate.url.length > 0);

        try {
            const response = await client.get<GithubTree>(
                '/repos/' + encodePathSegment(owner) + '/' + encodePathSegment(repo) +
                    '/git/trees/' + encodePathSegment(branch),
                { params: { recursive: '1' } }
            );
            for (const entry of response.data.tree || []) {
                if (entry.type === 'blob' && entry.path && IMAGE_FILE_PATTERN.test(entry.path)) {
                    const url = resolveImageReference(entry.path, owner, repo, branch);
                    if (url) {
                        candidates.push({ url, label: entry.path, readmeLinked: false });
                    }
                }
            }
        } catch (error) {
            // Image lookup is optional; keep rate-limit failures visible to the caller.
            if (isGithubRateLimited(error)) {
                throw normalizeGithubError(error);
            }
        }

        const selected = candidates
            .map((candidate, index) => ({ candidate, index, score: imageCandidateScore(candidate) }))
            .filter((entry) => entry.score >= 0)
            .sort((left, right) => {
                if (left.score !== right.score) {
                    return right.score - left.score;
                }
                return left.index - right.index;
            })[0];

        if (selected) {
            return selected.candidate.url;
        }

        return 'https://placehold.co/600x400';
    };

    const loadRepositoryData = async (owner: string, repo: string): Promise<PropsGitCard> => {
        const repoInfo = await fetchRepoInfo(owner, repo);
        // The server token may have access to private repositories. Keep this API public-only.
        // Fail closed when GitHub does not explicitly mark the repository as public.
        if (repoInfo.private !== false) {
            throw new OctoCardError('REPOSITORY_NOT_FOUND', 404, 'Repository not found.');
        }
        const readmeContent = await fetchRepoReadme(owner, repo);
        const principalLanguages = await fetchRepoLanguages(owner, repo);
        const illustrationImage = await fetchRepoIllustrationImage(
            owner,
            repo,
            readmeContent,
            repoInfo.default_branch || 'HEAD'
        );

        return {
            name: repoInfo.name || 'Sem nome',
            // Preserve the current public contract: description currently carries README text.
            description: readmeContent || 'Sem descrição',
            principal_languages: principalLanguages.length > 0 ? principalLanguages : ['Desconhecido'],
            stars: repoInfo.stargazers_count ?? 0,
            forks: repoInfo.forks_count ?? 0,
            url: repoInfo.html_url || (
                'https://github.com/' + encodePathSegment(owner) + '/' + encodePathSegment(repo)
            ),
            illustration_image_url: illustrationImage
        };
    };

    const fetchRepositoryData = async (owner: string, repo: string): Promise<PropsGitCard> => {
        const cacheKey = JSON.stringify([owner.toLowerCase(), repo.toLowerCase()]);
        const cached = cardCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            // Refresh insertion order so frequently requested cards stay in the bounded cache.
            cardCache.delete(cacheKey);
            cardCache.set(cacheKey, cached);
            return cached.value;
        }
        if (cached) {
            cardCache.delete(cacheKey);
        }

        // Cache the in-flight request too, so concurrent requests share one GitHub API fetch.
        const value = loadRepositoryData(owner, repo);
        cardCache.set(cacheKey, { expiresAt: Date.now() + CARD_CACHE_TTL_MS, value });
        if (cardCache.size > CARD_CACHE_MAX_ENTRIES) {
            const oldestKey = cardCache.keys().next().value;
            if (oldestKey !== undefined) {
                cardCache.delete(oldestKey);
            }
        }

        try {
            return await value;
        } catch (error) {
            if (cardCache.get(cacheKey)?.value === value) {
                cardCache.delete(cacheKey);
            }
            throw error;
        }
    };

    return { fetchRepositoryData };
};

const gitCardService = createGitCardService();

export default gitCardService;
