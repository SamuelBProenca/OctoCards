import { createGithubRequestBudget } from './githubRequestBudget';

describe('GitHub request budget', () => {
    it('allows the configured count and returns Retry-After when exhausted', async () => {
        const budget = createGithubRequestBudget(2, 60_000, () => 10_000);

        await expect(budget.reserve()).resolves.toBeNull();
        await expect(budget.reserve()).resolves.toBeNull();
        await expect(budget.reserve()).resolves.toBe(60);
    });

    it('releases capacity when the oldest request leaves the rolling window', async () => {
        let now = 0;
        const budget = createGithubRequestBudget(1, 10_000, () => now);

        await expect(budget.reserve()).resolves.toBeNull();
        now = 9_999;
        await expect(budget.reserve()).resolves.toBe(1);
        now = 10_000;
        await expect(budget.reserve()).resolves.toBeNull();
    });

    it('rejects invalid budget settings', () => {
        expect(() => createGithubRequestBudget(0, 1_000)).toThrow('positive integer');
        expect(() => createGithubRequestBudget(1, 0)).toThrow('positive integer');
    });
});
