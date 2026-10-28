import { createGithubRequestBudget } from './githubRequestBudget';

describe('GitHub request budget', () => {
    it('allows the configured count and returns Retry-After when exhausted', () => {
        const budget = createGithubRequestBudget(2, 60_000, () => 10_000);

        expect(budget.reserve()).toBeNull();
        expect(budget.reserve()).toBeNull();
        expect(budget.reserve()).toBe(60);
    });

    it('releases capacity when the oldest request leaves the rolling window', () => {
        let now = 0;
        const budget = createGithubRequestBudget(1, 10_000, () => now);

        expect(budget.reserve()).toBeNull();
        now = 9_999;
        expect(budget.reserve()).toBe(1);
        now = 10_000;
        expect(budget.reserve()).toBeNull();
    });

    it('rejects invalid budget settings', () => {
        expect(() => createGithubRequestBudget(0, 1_000)).toThrow('positive integer');
        expect(() => createGithubRequestBudget(1, 0)).toThrow('positive integer');
    });
});
