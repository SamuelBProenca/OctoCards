import { OctoCardRepos } from './getRepos';
import gitCardService from '../services/gitCardService';

const card = (name: string) => ({
    name,
    description: '# README',
    principal_languages: ['TypeScript'],
    stars: 1,
    forks: 0,
    url: `https://github.com/example/${name}`,
    illustration_image_url: 'https://placehold.co/600x400'
});

describe('OctoCardRepos', () => {
    afterEach(() => jest.restoreAllMocks());

    it('fetches at most three repositories concurrently and preserves request order', async () => {
        const repos = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
        const started: string[] = [];
        const pending = new Map<string, () => void>();
        jest.spyOn(gitCardService, 'fetchRepositoryData').mockImplementation((_owner, repo) =>
            new Promise((resolve) => {
                started.push(repo);
                pending.set(repo, () => {
                    pending.delete(repo);
                    resolve(card(repo));
                });
            })
        );

        const resultPromise = OctoCardRepos(repos, 'example');
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(started).toEqual(['one', 'two', 'three']);

        pending.get('three')?.();
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(started).toEqual(['one', 'two', 'three', 'four']);

        while (started.length < repos.length) {
            for (const resolve of [...pending.values()]) resolve();
            await new Promise<void>((resolve) => setImmediate(resolve));
        }
        for (const resolve of [...pending.values()]) resolve();

        const cards = await resultPromise;
        expect(cards.map(({ name }) => name)).toEqual(repos);
    });
});
