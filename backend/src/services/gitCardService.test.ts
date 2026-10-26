import { createGitCardService } from './gitCardService';

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
                    stargazers_count: 12,
                    forks_count: 3,
                    html_url: 'https://github.com/example/project'
                }
            })
            .mockResolvedValueOnce({ data: '# Project README' })
            .mockResolvedValueOnce({ data: { TypeScript: 200, JavaScript: 40 } })
            .mockResolvedValueOnce({
                data: [
                    { name: 'illustration', type: 'dir', download_url: null },
                    { name: 'illustration.png', type: 'file', download_url: 'https://cdn.test/illustration.png' }
                ]
            });

        const card = await createGitCardService(client).fetchRepositoryData('example', 'project');

        expect(card).toEqual({
            name: 'project',
            description: '# Project README',
            principal_languages: ['TypeScript', 'JavaScript'],
            stars: 12,
            forks: 3,
            url: 'https://github.com/example/project',
            illustration_image_url: 'https://cdn.test/illustration.png'
        });
        expect(get).toHaveBeenNthCalledWith(
            2,
            '/repos/example/project/readme',
            { headers: { Accept: 'application/vnd.github.raw+json' } }
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
            .mockResolvedValueOnce({ data: [] });

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
            .mockResolvedValueOnce({ data: [] });

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

    it('translates repository not found and rate limit responses', async () => {
        const missing = createClient();
        missing.get.mockRejectedValueOnce(githubError(404));
        await expect(
            createGitCardService(missing.client).fetchRepositoryData('example', 'missing')
        ).rejects.toMatchObject({ code: 'REPOSITORY_NOT_FOUND', statusCode: 404 });

        const limited = createClient();
        limited.get.mockRejectedValueOnce(githubError(403, { 'x-ratelimit-remaining': '0' }));
        await expect(
            createGitCardService(limited.client).fetchRepositoryData('example', 'project')
        ).rejects.toMatchObject({ code: 'GITHUB_RATE_LIMITED', statusCode: 429 });
    });

    it('translates upstream timeouts without exposing transport details', async () => {
        const { get, client } = createClient();
        get.mockRejectedValueOnce(githubError(undefined, {}, 'ECONNABORTED'));

        await expect(
            createGitCardService(client).fetchRepositoryData('example', 'project')
        ).rejects.toMatchObject({ code: 'GITHUB_TIMEOUT', statusCode: 504 });
    });
});
