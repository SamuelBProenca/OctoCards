import { PropsGitCard } from '../types/gitCardType';
import { OctoCardError } from '../types/octoCardError';
import config from '../config/octoConfig';
import gitCardService from '../services/gitCardService';

const MAX_CONCURRENT_REPOSITORY_FETCHES = 3;

const mapWithLimitedConcurrency = async <T, R>(
    items: T[],
    limit: number,
    mapper: (item: T) => Promise<R>
): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let nextIndex = 0;
    let failed = false;
    let firstError: unknown;

    const worker = async (): Promise<void> => {
        while (!failed) {
            const index = nextIndex++;
            if (index >= items.length) {
                return;
            }

            try {
                results[index] = await mapper(items[index]);
            } catch (error) {
                if (!failed) {
                    failed = true;
                    firstError = error;
                }
                return;
            }
        }
    };

    const workerCount = Math.min(limit, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    if (failed) {
        throw firstError;
    }
    return results;
};

/** Fetch all requested cards in order; a failure rejects the whole request. */
export async function OctoCardRepos(
    repos: string[],
    owner: string | undefined = config.owner,
    requestToken?: string
): Promise<PropsGitCard[]> {
    if (!owner) {
        throw new OctoCardError(
            'CONFIGURATION_ERROR',
            500,
            'Set OWNER or provide an owner query parameter.'
        );
    }

    return mapWithLimitedConcurrency(
        repos,
        MAX_CONCURRENT_REPOSITORY_FETCHES,
        (repo) => gitCardService.fetchRepositoryData(owner, repo, requestToken)
    );
}
