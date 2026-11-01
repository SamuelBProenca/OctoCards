import { Request, Response } from 'express';
import { getGitCard, getGitCards } from './gitCardController';
import gitCardService from '../services/gitCardService';
import { OctoCardError } from '../types/octoCardError';
import { PropsGitCard } from '../types/gitCardType';

const card: PropsGitCard = {
    name: 'project',
    description: '# README',
    principal_languages: ['TypeScript'],
    stars: 1,
    forks: 0,
    url: 'https://github.com/example/project',
    illustration_image_url: 'https://placehold.co/600x400'
};

const createResponse = () => {
    const response = {
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        json: jest.fn()
    };
    return response as unknown as Response;
};

const createRequest = (
    params: object = {},
    query: object = {},
    authorization?: string
) => ({
    params,
    query,
    get: jest.fn((header: string) => header.toLowerCase() === 'authorization' ? authorization : undefined)
} as unknown as Request);

describe('gitCardController', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses the owner query override for a single repository', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const response = createResponse();

        await getGitCard(createRequest({ repo: 'project' }, { owner: 'example' }), response);

        expect(fetch).toHaveBeenCalledWith('example', 'project', undefined);
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(card);
    });

    it('forwards a caller Bearer credential without logging or returning it', async () => {
        const callerToken = 'mock-user-token-not-a-credential';
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const response = createResponse();

        await getGitCard(
            createRequest({ repo: 'project' }, { owner: 'example' }, `Bearer ${callerToken}`),
            response
        );

        expect(fetch).toHaveBeenCalledWith('example', 'project', callerToken);
        expect(JSON.stringify((response.json as jest.Mock).mock.calls)).not.toContain(callerToken);
        expect(JSON.stringify((console.error as jest.Mock).mock.calls)).not.toContain(callerToken);
    });

    it('uses the caller credential for every repository in a batch', async () => {
        const callerToken = 'mock-batch-token-not-a-credential';
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const response = createResponse();

        await getGitCards(
            createRequest({}, { repos: 'first,second', owner: 'example' }, `Bearer ${callerToken}`),
            response
        );

        expect(fetch.mock.calls).toEqual([
            ['example', 'first', callerToken],
            ['example', 'second', callerToken]
        ]);
    });

    it('rejects malformed caller credentials before reaching the service', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData');
        const response = createResponse();

        await getGitCard(createRequest({ repo: 'project' }, { owner: 'example' }, 'Basic abc'), response);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(400);
    });

    it('rejects empty repository entries before making upstream calls', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData');
        const response = createResponse();

        await getGitCards(createRequest({}, { repos: 'first,,third' }), response);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            error: { code: 'INVALID_REQUEST', message: expect.any(String) }
        });
    });

    it('rejects repeated repos query parameters instead of returning a 500', async () => {
        const response = createResponse();

        await getGitCards(createRequest({}, { repos: ['first', 'second'] }), response);

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            error: { code: 'INVALID_REQUEST', message: expect.any(String) }
        });
    });

    it('accepts a batch of ten repositories', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const response = createResponse();
        const repos = Array.from({ length: 10 }, (_, index) => `repo-${index + 1}`);

        await getGitCards(createRequest({}, { repos: repos.join(','), owner: 'example' }), response);

        expect(fetch).toHaveBeenCalledTimes(10);
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(Array.from({ length: 10 }, () => card));
    });

    it('rejects batches above ten before making upstream calls', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData');
        const response = createResponse();
        const repos = Array.from({ length: 11 }, (_, index) => `repo-${index + 1}`);

        await getGitCards(createRequest({}, { repos: repos.join(','), owner: 'example' }), response);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            error: { code: 'INVALID_REQUEST', message: expect.any(String) }
        });
    });

    it('rejects an oversized repos query before splitting it', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData');
        const response = createResponse();

        await getGitCards(createRequest({}, { repos: 'x'.repeat(2049), owner: 'example' }), response);

        expect(fetch).not.toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(400);
    });

    it('deduplicates repository names case-insensitively while preserving order', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const response = createResponse();

        await getGitCards(createRequest({}, { repos: 'First,first,Second', owner: 'example' }), response);

        expect(fetch.mock.calls).toEqual([
            ['example', 'First', undefined],
            ['example', 'Second', undefined]
        ]);
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith([card, card]);
    });

    it('rejects repository names outside GitHub allowed characters or length', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const slashResponse = createResponse();
        const longNameResponse = createResponse();
        const dotSegmentResponse = createResponse();

        await getGitCard(createRequest({ repo: 'bad/name' }, { owner: 'example' }), slashResponse);
        await getGitCard(createRequest({ repo: 'r'.repeat(101) }, { owner: 'example' }), longNameResponse);
        await getGitCard(createRequest({ repo: '..' }, { owner: 'example' }), dotSegmentResponse);

        expect(fetch).not.toHaveBeenCalled();
        expect(slashResponse.status).toHaveBeenCalledWith(400);
        expect(longNameResponse.status).toHaveBeenCalledWith(400);
        expect(dotSegmentResponse.status).toHaveBeenCalledWith(400);
    });

    it('rejects owner names outside GitHub allowed characters or length', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData').mockResolvedValue(card);
        const invalidCharsResponse = createResponse();
        const longNameResponse = createResponse();
        const repeatedDashResponse = createResponse();

        await getGitCard(createRequest({ repo: 'project' }, { owner: 'not an owner' }), invalidCharsResponse);
        await getGitCard(createRequest({ repo: 'project' }, { owner: 'o'.repeat(40) }), longNameResponse);
        await getGitCard(createRequest({ repo: 'project' }, { owner: 'two--dashes' }), repeatedDashResponse);

        expect(fetch).not.toHaveBeenCalled();
        expect(invalidCharsResponse.status).toHaveBeenCalledWith(400);
        expect(longNameResponse.status).toHaveBeenCalledWith(400);
        expect(repeatedDashResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns an error for the whole multi-repository request if one item fails', async () => {
        const fetch = jest.spyOn(gitCardService, 'fetchRepositoryData')
            .mockResolvedValueOnce(card)
            .mockRejectedValueOnce(new OctoCardError('REPOSITORY_NOT_FOUND', 404, 'Repository not found.'));
        const response = createResponse();

        await getGitCards(createRequest({}, { repos: 'first,missing', owner: 'example' }), response);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(response.status).toHaveBeenCalledWith(404);
        expect(response.json).toHaveBeenCalledWith({
            error: { code: 'REPOSITORY_NOT_FOUND', message: 'Repository not found.' }
        });
    });

    it('forwards the GitHub request budget retry time as a response header', async () => {
        jest.spyOn(gitCardService, 'fetchRepositoryData').mockRejectedValue(
            new OctoCardError('GITHUB_RATE_LIMITED', 429, 'GitHub API request budget exceeded.', 37)
        );
        const response = createResponse();

        await getGitCard(createRequest({ repo: 'project' }, { owner: 'example' }), response);

        expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '37');
        expect(response.status).toHaveBeenCalledWith(429);
    });
});
