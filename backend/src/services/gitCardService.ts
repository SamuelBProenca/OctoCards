import axios, { type AxiosInstance } from 'axios';
import config from '../config/octoConfig';
import { OctoCardError } from '../types/octoCardError';
import { PropsGitCard } from '../types/gitCardType';

interface GithubRepository {
    private?: boolean;
    name?: string | null;
    stargazers_count?: number;
    forks_count?: number;
    html_url?: string;
}

interface GithubContentEntry {
    name?: string;
    type?: string;
    download_url?: string | null;
}

type GithubClient = Pick<AxiosInstance, 'get'>;
type CachedCard = { expiresAt: number; value: Promise<PropsGitCard> };

const CARD_CACHE_TTL_MS = 5 * 60 * 1000;
const CARD_CACHE_MAX_ENTRIES = 500;

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
        readmeContent: string
    ): Promise<string> => {
        let illustrationImageUrl = '';

        try {
            const response = await client.get<GithubContentEntry[]>(
                '/repos/' + encodePathSegment(owner) + '/' + encodePathSegment(repo) + '/contents/'
            );
            const illustrationImage = response.data.find((file) =>
                file.type === 'file' &&
                typeof file.name === 'string' &&
                file.name.toLowerCase().includes('illustration') &&
                typeof file.download_url === 'string'
            );

            if (illustrationImage?.download_url) {
                illustrationImageUrl = illustrationImage.download_url;
            }
        } catch (error) {
            // Image lookup is optional; keep rate-limit failures visible to the caller.
            if (isGithubRateLimited(error)) {
                throw normalizeGithubError(error);
            }
        }

        if (!illustrationImageUrl) {
            const readmeImageMatch = readmeContent.match(/!\[.*?\]\((.*?)\)/);
            if (readmeImageMatch) {
                illustrationImageUrl = readmeImageMatch[1];
            }
        }

        return illustrationImageUrl || 'https://placehold.co/600x400';
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
        const illustrationImage = await fetchRepoIllustrationImage(owner, repo, readmeContent);

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
