type RateLimitConfig = {
    apiRateLimitMax: number;
    apiRateLimitWindowMs: number;
    githubApiRequestBudgetPerHour: number;
    trustedProxies: string[];
};

const keys = [
    'API_RATE_LIMIT_MAX',
    'API_RATE_LIMIT_WINDOW_MS',
    'GITHUB_API_REQUEST_BUDGET_PER_HOUR',
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
            apiRateLimitMax: 12,
            apiRateLimitWindowMs: 60000,
            githubApiRequestBudgetPerHour: 50,
            trustedProxies: []
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
});
