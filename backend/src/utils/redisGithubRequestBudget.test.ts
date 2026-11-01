import {
    createRedisGithubRequestBudget,
    RESERVE_GITHUB_REQUEST_SCRIPT,
    RedisEval
} from './redisGithubRequestBudget';

describe('Redis GitHub request budget', () => {
    it('uses one atomic rolling-window script and converts the denied TTL to seconds', async () => {
        const evalRedis = jest.fn<ReturnType<RedisEval>, Parameters<RedisEval>>()
            .mockResolvedValueOnce([1, 0])
            .mockResolvedValueOnce([0, 1_250]);
        const budget = createRedisGithubRequestBudget(evalRedis, 'octocards:prod:github', 50, 3_600_000);

        await expect(budget.reserve()).resolves.toBeNull();
        await expect(budget.reserve()).resolves.toBe(2);

        expect(evalRedis).toHaveBeenCalledTimes(2);
        expect(evalRedis).toHaveBeenCalledWith(RESERVE_GITHUB_REQUEST_SCRIPT, {
            keys: ['octocards:prod:github'],
            arguments: [
                '3600000',
                '50',
                expect.stringMatching(/^[0-9a-f-]{36}$/)
            ]
        });
        expect(RESERVE_GITHUB_REQUEST_SCRIPT).toContain("redis.call('TIME')");
        expect(RESERVE_GITHUB_REQUEST_SCRIPT).toContain("redis.call('ZADD'");
    });

    it('coordinates separate budget adapters when they share the same store key', async () => {
        let reservations = 0;
        const sharedEval: RedisEval = async (_script, { keys }) => {
            expect(keys).toEqual(['octocards:shared']);
            reservations += 1;
            return reservations === 1 ? [1, 0] : [0, 30_000];
        };
        const replicaA = createRedisGithubRequestBudget(sharedEval, 'octocards:shared', 1, 60_000);
        const replicaB = createRedisGithubRequestBudget(sharedEval, 'octocards:shared', 1, 60_000);

        await expect(replicaA.reserve()).resolves.toBeNull();
        await expect(replicaB.reserve()).resolves.toBe(30);
    });

    it('rejects invalid key or budget configuration', () => {
        const evalRedis = jest.fn<ReturnType<RedisEval>, Parameters<RedisEval>>();

        expect(() => createRedisGithubRequestBudget(evalRedis, '', 1, 1000)).toThrow('key');
        expect(() => createRedisGithubRequestBudget(evalRedis, 'budget', 0, 1000)).toThrow('positive integer');
        expect(() => createRedisGithubRequestBudget(evalRedis, 'budget', 1, 0)).toThrow('positive integer');
    });
});
