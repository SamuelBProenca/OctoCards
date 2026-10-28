import { Request, Response } from 'express';
import gitCardService from '../services/gitCardService';
import { OctoCardError } from '../types/octoCardError';
import { OctoCardRepos } from '../utils/getRepos';
import config from '../config/octoConfig';

const MAX_OWNER_NAME_LENGTH = 39;
const MAX_REPOSITORY_NAME_LENGTH = 100;
const MAX_REPOS_PER_BATCH = 10;
const MAX_REPOS_QUERY_LENGTH = 2048;

const isValidOwner = (value: string): boolean =>
    value.length <= MAX_OWNER_NAME_LENGTH && /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(value);

const isValidRepositoryName = (value: string): boolean =>
    value !== '.' &&
    value !== '..' &&
    value.length <= MAX_REPOSITORY_NAME_LENGTH &&
    /^[A-Za-z0-9._-]+$/.test(value);

const invalidRequest = (message: string): OctoCardError =>
    new OctoCardError('INVALID_REQUEST', 400, message);

const resolveOwner = (queryOwner: unknown): string => {
    if (queryOwner !== undefined) {
        if (typeof queryOwner !== 'string') {
            throw invalidRequest('The owner query parameter must be a single string.');
        }

        const owner = queryOwner.trim();
        if (!isValidOwner(owner)) {
            throw invalidRequest('The owner query parameter is invalid.');
        }
        return owner;
    }

    const configuredOwner = config.owner.trim();
    if (!isValidOwner(configuredOwner)) {
        throw new OctoCardError(
            'CONFIGURATION_ERROR',
            500,
            'Set a valid OWNER or provide an owner query parameter.'
        );
    }

    return configuredOwner;
};

const sendError = (res: Response, error: unknown, route: string): void => {
    if (error instanceof OctoCardError) {
        console.error('OctoCards request failed', { route, code: error.code });
        res.status(error.statusCode).json({
            error: { code: error.code, message: error.message }
        });
        return;
    }

    console.error('OctoCards request failed', { route, code: 'INTERNAL_ERROR' });
    res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }
    });
};

export const getGitCard = async (req: Request, res: Response): Promise<void> => {
    try {
        const repo = req.params.repo.trim();
        if (!isValidRepositoryName(repo)) {
            throw invalidRequest('The repository name is invalid.');
        }

        const owner = resolveOwner(req.query.owner);
        const gitCardData = await gitCardService.fetchRepositoryData(owner, repo);
        res.status(200).json(gitCardData);
    } catch (error) {
        sendError(res, error, 'GET /api/cards/:repo');
    }
};

export const getGitCards = async (req: Request, res: Response): Promise<void> => {
    try {
        const reposParam = req.query.repos;
        if (typeof reposParam !== 'string') {
            throw invalidRequest('Provide repos as a comma-separated list.');
        }

        if (reposParam.length > MAX_REPOS_QUERY_LENGTH) {
            throw invalidRequest(`The repos parameter must not exceed ${MAX_REPOS_QUERY_LENGTH} characters.`);
        }

        const repos = reposParam.split(',').map((repo) => repo.trim());
        if (repos.length === 0 || repos.some((repo) => !isValidRepositoryName(repo))) {
            throw invalidRequest('The repos parameter contains an empty or invalid repository name.');
        }

        if (repos.length > MAX_REPOS_PER_BATCH) {
            throw invalidRequest(`A maximum of ${MAX_REPOS_PER_BATCH} repositories may be requested at once.`);
        }

        const uniqueRepos: string[] = [];
        const seenRepos = new Set<string>();
        for (const repo of repos) {
            const normalizedRepo = repo.toLowerCase();
            if (!seenRepos.has(normalizedRepo)) {
                seenRepos.add(normalizedRepo);
                uniqueRepos.push(repo);
            }
        }

        const owner = resolveOwner(req.query.owner);
        const cards = await OctoCardRepos(uniqueRepos, owner);
        res.status(200).json(cards);
    } catch (error) {
        sendError(res, error, 'GET /api/cards');
    }
};
