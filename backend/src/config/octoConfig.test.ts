type RateLimitConfig = {
    token: string;
    apiRateLimitMax: number;
    apiRateLimitWindowMs: number;
    githubApiRequestBudgetPerHour: number;
    githubAuthMode: string;
    githubRequestBudgetStore: string;
    redisUrl: string;
    githubRequestBudgetKey: string;
    trustedProxies: string[];
};

const keys = [
    'API_RATE_LIMIT_MAX',
    'API_RATE_LIMIT_WINDOW_MS',
    'GITHUB_API_REQUEST_BUDGET_PER_HOUR',
    'GITHUB_AUTH_MODE',
    'TOKEN',
    'GITHUB_REQUEST_BUDGET_STORE',
    'GITHUB_REQUEST_BUDGET_KEY',
    'REDIS_URL',
    'NODE_ENV',
    'TRUSTED_PROXIES'
];
const originalValues = new Map(keys.map((key) => [key, process.env[key]]));

const loadConfig = (): RateLimitConfig => {
    let loaded: RateLimitConfig | undefined;
    jest.isolateModules(() => {
        loaded = require('./octoConfig').default;
    });
    return loaded as RateLimitConfig;
};

describe('OctoCards rate-limit configuration', () => {
    beforeEach(() => {
        process.env.API_RATE_LIMIT_MAX = '12';
        process.env.API_RATE_LIMIT_WINDOW_MS = '60000';
        process.env.GITHUB_API_REQUEST_BUDGET_PER_HOUR = '50';
        process.env.GITHUB_AUTH_MODE = 'request';
        process.env.TOKEN = 'mock-server-token-not-secret';
        process.env.GITHUB_REQUEST_BUDGET_STORE = 'memory';
        process.env.GITHUB_REQUEST_BUDGET_KEY = 'octocards:test:budget';
        delete process.env.REDIS_URL;
        process.env.NODE_ENV = 'test';
        process.env.TRUSTED_PROXIES = '';
    });

    afterEach(() => {
        for (const key of keys) {
            const originalValue = originalValues.get(key);
            if (originalValue === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = originalValue;
            }
        }
    });

    it('uses the documented defaults and trusts no forwarded proxy by default', () => {
        expect(loadConfig()).toMatchObject({
            token: '',
            apiRateLimitMax: 12,
            apiRateLimitWindowMs: 60000,
            githubApiRequestBudgetPerHour: 50,
            githubAuthMode: 'request',
            githubRequestBudgetStore: 'memory',
            redisUrl: '',
            githubRequestBudgetKey: 'octocards:test:budget',
            trustedProxies: []
        });
    });

    it('only loads the server token when server auth mode is explicit', () => {
        process.env.GITHUB_AUTH_MODE = 'server';

        expect(loadConfig()).toMatchObject({
            githubAuthMode: 'server',
            token: 'mock-server-token-not-secret'
        });
    });

    it.each([
        ['API_RATE_LIMIT_MAX', '0', 'API_RATE_LIMIT_MAX'],
        ['API_RATE_LIMIT_WINDOW_MS', '-1', 'API_RATE_LIMIT_WINDOW_MS'],
        ['API_RATE_LIMIT_WINDOW_MS', '1.5', 'API_RATE_LIMIT_WINDOW_MS'],
        ['GITHUB_API_REQUEST_BUDGET_PER_HOUR', '0', 'GITHUB_API_REQUEST_BUDGET_PER_HOUR'],
        ['GITHUB_API_REQUEST_BUDGET_PER_HOUR', '2.5', 'GITHUB_API_REQUEST_BUDGET_PER_HOUR']
    ])('rejects invalid %s values', (key, value, message) => {
        process.env[key] = value;
        expect(() => loadConfig()).toThrow(message);
    });

    it('accepts explicit proxy IPs, CIDRs, and named network ranges', () => {
        process.env.TRUSTED_PROXIES = '127.0.0.1, 10.0.0.0/8, loopback';
        expect(loadConfig().trustedProxies).toEqual(['127.0.0.1', '10.0.0.0/8', 'loopback']);
    });

    it('rejects malformed trusted proxy ranges', () => {
        process.env.TRUSTED_PROXIES = '10.0.0.0/33';
        expect(() => loadConfig()).toThrow('TRUSTED_PROXIES');
    });

    it('requires a Redis URL when the shared store is enabled', () => {
        process.env.GITHUB_REQUEST_BUDGET_STORE = 'redis';
        expect(() => loadConfig()).toThrow('REDIS_URL is required');
    });

    it('defaults production deployments to Redis and refuses to start without its URL', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.GITHUB_REQUEST_BUDGET_STORE;

        expect(() => loadConfig()).toThrow('REDIS_URL is required');
    });

    it('accepts an explicit Redis store URL without printing it', () => {
        process.env.GITHUB_REQUEST_BUDGET_STORE = 'redis';
        process.env.REDIS_URL = 'redis://localhost:6379';

        expect(loadConfig()).toMatchObject({
            githubRequestBudgetStore: 'redis',
            redisUrl: 'redis://localhost:6379'
        });
    });
});
