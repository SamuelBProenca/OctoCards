import { PropsGitCard } from '../types/gitCardType';
import { OctoCardError } from '../types/octoCardError';
import config from '../config/octoConfig';
import gitCardService from '../services/gitCardService';

/** Fetch all requested cards in order; a failure rejects the whole request. */
export async function OctoCardRepos(
    repos: string[],
    owner: string | undefined = config.owner
): Promise<PropsGitCard[]> {
    if (!owner) {
        throw new OctoCardError(
            'CONFIGURATION_ERROR',
            500,
            'Set OWNER or provide an owner query parameter.'
        );
    }

    const cards: PropsGitCard[] = [];
    for (const repo of repos) {
        cards.push(await gitCardService.fetchRepositoryData(owner, repo));
    }

    return cards;
}
