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
        json: jest.fn()
    };
    return response as unknown as Response;
};

const createRequest = (params: object = {}, query: object = {}) =>
    ({ params, query } as unknown as Request);

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

        expect(fetch).toHaveBeenCalledWith('example', 'project');
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(card);
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
});
