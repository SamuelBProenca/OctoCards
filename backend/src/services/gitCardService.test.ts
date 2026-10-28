import { createGitCardService } from './gitCardService';
import { createGithubRequestBudget } from '../utils/githubRequestBudget';

const createClient = () => {
    const get = jest.fn();
    const client = { get } as unknown as Parameters<typeof createGitCardService>[0];
    return { get, client };
};

const githubError = (
    status?: number,
    headers: Record<string, string> = {},
    code?: string
) => Object.assign(new Error('GitHub request failed'), {
    isAxiosError: true,
    code,
    response: status === undefined ? undefined : { status, headers }
});

describe('gitCardService', () => {
    it('maps GitHub data to the existing PropsGitCard contract', async () => {
        const { get, client } = createClient();
        get
            .mockResolvedValueOnce({
                data: {
                    private: false,
                    name: 'project',
                    default_branch: 'main',
                    stargazers_count: 12,
                    forks_count: 3,
                    html_url: 'https://github.com/example/project'
                }
            })
            .mockResolvedValueOnce({ data: '# Project README' })
            .mockResolvedValueOnce({ data: { TypeScript: 200, JavaScript: 40 } })
            .mockResolvedValueOnce({ data: { tree: [{ path: 'illustration.png', type: 'blob' }] } });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(card).toEqual({
            name: 'project',
            description: '# Project README',
            principal_languages: ['TypeScript', 'JavaScript'],
            stars: 12,
            forks: 3,
            url: 'https://github.com/example/project',
            illustration_image_url: 'https://raw.githubusercontent.com/example/project/main/illustration.png'
        });
        expect(get).toHaveBeenNthCalledWith(
            2,
            '/repos/example/project/readme',
            { headers: { Accept: 'application/vnd.github.raw+json' } }
        );
        expect(get).toHaveBeenNthCalledWith(
            4,
            '/repos/example/project/git/trees/main',
            { params: { recursive: '1' } }
        );
    });

    it('starts README and language requests together after confirming the repository is public', async () => {
        const { get, client } = createClient();
        let resolveReadme!: (value: { data: string }) => void;
        let resolveLanguages!: (value: { data: Record<string, number> }) => void;
        const readmeResponse = new Promise<{ data: string }>((resolve) => { resolveReadme = resolve; });
        const languagesResponse = new Promise<{ data: Record<string, number> }>((resolve) => { resolveLanguages = resolve; });

        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', default_branch: 'main' } })
            .mockImplementationOnce(() => readmeResponse)
            .mockImplementationOnce(() => languagesResponse)
            .mockResolvedValueOnce({ data: { tree: [] } });

        const cardPromise = createGitCardService(client).fetchRepositoryData('example', 'project');
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(get).toHaveBeenCalledTimes(3);
        expect(get.mock.calls[1][0]).toContain('/readme');
        expect(get.mock.calls[2][0]).toContain('/languages');

        resolveReadme({ data: '# Project' });
        resolveLanguages({ data: { TypeScript: 10 } });
        const card = await cardPromise;
        expect(card.description).toBe('# Project');
        expect(card.principal_languages).toEqual(['TypeScript']);
    });

    it('prefers repository banners and resolves nested README image paths', async () => {
        const { get, client } = createClient();
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', default_branch: 'main' } })
            .mockResolvedValueOnce({
                data: '![Screenshot](docs/ui.png)\n\n![Project cover](./assets/project-cover.webp)'
            })
            .mockResolvedValueOnce({ data: { TypeScript: 10 } })
            .mockResolvedValueOnce({
                data: {
                    tree: [
                        { path: 'docs/ui.png', type: 'blob' },
                        { path: 'assets/project-cover.webp', type: 'blob' },
                        { path: 'dist/generated.js', type: 'blob' }
                    ]
                }
            });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(card.illustration_image_url).toBe(
            'https://raw.githubusercontent.com/example/project/main/assets/project-cover.webp'
        );
    });

    it('does not read or expose private repositories even with an authenticated server token', async () => {
        const { get, client } = createClient();
        get.mockResolvedValueOnce({ data: { private: true, name: 'private-project' } });

        await expect(
            createGitCardService(client).fetchRepositoryData('example', 'private-project')
        ).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND', statusCode: 404 });
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('reuses a short-lived card cache for concurrent and repeated requests', async () => {
        const { get, client } = createClient();
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', html_url: 'https://github.com/example/project' } })
            .mockResolvedValueOnce({ data: '# Project README' })
            .mockResolvedValueOnce({ data: { TypeScript: 20 } })
            .mockResolvedValueOnce({ data: { tree: [] } });

        const service = createGitCardService(client);
        const [first, concurrent] = await Promise.all([
            service.fetchRepositoryData('example', 'project'),
            service.fetchRepositoryData('example', 'project')
        ]);
        const repeated = await service.fetchRepositoryData('EXAMPLE', 'PROJECT');

        expect(first).toEqual(concurrent);
        expect(repeated).toEqual(first);
        expect(get).toHaveBeenCalledTimes(4);
    });

    it('treats a missing README as optional data', async () => {
        const { get, client } = createClient();
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', html_url: 'https://github.com/example/project' } })
            .mockRejectedValueOnce(githubError(404))
            .mockResolvedValueOnce({ data: {} })
            .mockResolvedValueOnce({ data: { tree: [] } });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(card.description).toBe('Sem descrição');
        expect(card.principal_languages).toEqual(['Desconhecido']);
        expect(card.illustration_image_url).toBe('https://placehold.co/600x400');
    });

    it('does not disguise non-404 README failures as a missing README', async () => {
        const { get, client } = createClient();
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project' } })
            .mockRejectedValueOnce(githubError(500));

        await expect(
            createGitCardService(client).fetchRepositoryData('example', 'project')
        ).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', statusCode: 502 });
    });

    it('keeps image lookup optional but records sanitized diagnostics for upstream failures', async () => {
        const { get, client } = createClient();
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', default_branch: 'main' } })
            .mockResolvedValueOnce({ data: '' })
            .mockResolvedValueOnce({ data: {} })
            .mockRejectedValueOnce(githubError(500, { authorization: 'never-log-this' }, 'ERR_BAD_RESPONSE'));

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(card.illustration_image_url).toBe('https://placehold.co/600x400');
        expect(warning).toHaveBeenCalledWith('OctoCards image lookup failed', {
            status: 500,
            code: 'ERR_BAD_RESPONSE'
        });
        expect(JSON.stringify(warning.mock.calls)).not.toContain('never-log-this');
    });

    it('stops image candidate processing at the limit and reports truncated GitHub trees', async () => {
        const { get, client } = createClient();
        const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        let entriesVisited = 0;
        const treeEntries = {
            *[Symbol.iterator]() {
                for (let index = 0; index < 1000; index += 1) {
                    entriesVisited += 1;
                    yield { path: `images/image-${index}.png`, type: 'blob' };
                }
            }
        };
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', default_branch: 'main' } })
            .mockResolvedValueOnce({ data: '' })
            .mockResolvedValueOnce({ data: {} })
            .mockResolvedValueOnce({ data: { truncated: true, tree: treeEntries } });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(entriesVisited).toBe(100);
        expect(card.illustration_image_url).toBe(
            'https://raw.githubusercontent.com/example/project/main/images/image-0.png'
        );
        expect(warning).toHaveBeenCalledWith('OctoCards repository image tree was truncated', {
            code: 'GITHUB_TREE_TRUNCATED'
        });
    });

    it('caps tree traversal when a repository has many non-image files', async () => {
        const { get, client } = createClient();
        let entriesVisited = 0;
        const treeEntries = {
            *[Symbol.iterator]() {
                for (let index = 0; index < 6000; index += 1) {
                    entriesVisited += 1;
                    yield { path: `docs/file-${index}.md`, type: 'blob' };
                }
            }
        };
        get
            .mockResolvedValueOnce({ data: { private: false, name: 'project', default_branch: 'main' } })
            .mockResolvedValueOnce({ data: '' })
            .mockResolvedValueOnce({ data: {} })
            .mockResolvedValueOnce({ data: { truncated: false, tree: treeEntries } });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(entriesVisited).toBe(5000);
        expect(card.illustration_image_url).toBe('https://placehold.co/600x400');
    });

    it('translates repository not found and rate limit responses', async () => {
        const missing = createClient();
        missing.get.mockRejectedValueOnce(githubError(404));
        await expect(
            createGitCardService(missing.client).fetchRepositoryData('example', 'missing')
        ).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND', statusCode: 404 });

        const limited = createClient();
        limited.get.mockRejectedValueOnce(githubError(403, {
            'x-ratelimit-remaining': '0',
            'retry-after': '45'
        }));
        await expect(
            createGitCardService(limited.client).fetchRepositoryData('example', 'project')
        ).rejects.toMatchObject({
            code: 'GITHUB_RATE_LIMITED',
            statusCode: 429,
            retryAfterSeconds: 45
        });
    });

    it('translates upstream timeouts without exposing transport details', async () => {
        const { get, client } = createClient();
        get.mockRejectedValueOnce(githubError(undefined, {}, 'ECONNABORTED'));

        await expect(
            createGitCardService(client).fetchRepositoryData('example', 'project')
        ).rejects.toMatchObject({ code: 'GITHUB_TIMEOUT', statusCode: 504 });
    });

    it('shares the outbound budget across service clients and returns its retry time', async () => {
        const budget = createGithubRequestBudget(1, 60_000, () => 10_000);
        const first = createClient();
        first.get.mockResolvedValueOnce({ data: { private: false } });
        const second = createClient();
        const firstService = createGitCardService(first.client, budget);
        const secondService = createGitCardService(second.client, budget);

        await expect(firstService.fetchRepositoryData('example', 'first'))
            .rejects.toMatchObject({
                code: 'GITHUB_RATE_LIMITED',
                statusCode: 429,
                retryAfterSeconds: 60
            });
        await expect(secondService.fetchRepositoryData('example', 'second'))
            .rejects.toMatchObject({
                code: 'GITHUB_RATE_LIMITED',
                statusCode: 429,
                retryAfterSeconds: 60
            });
        expect(first.get).toHaveBeenCalledTimes(1);
        expect(second.get).not.toHaveBeenCalled();
    });
});
