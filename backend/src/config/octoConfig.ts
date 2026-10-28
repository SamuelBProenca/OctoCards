require('dotenv').config();
import { isIP } from 'node:net';

const owner = process.env.OWNER || "octocat";
const port = process.env.PORT || "3000";  
const configuredGithubAuthMode = (process.env.GITHUB_AUTH_MODE || 'request').trim().toLowerCase();
const token = configuredGithubAuthMode === 'server' ? process.env.TOKEN || '' : '';
const defaultGithubRequestBudgetStore = process.env.NODE_ENV === 'production' ? 'redis' : 'memory';
const configuredGithubRequestBudgetStore = (process.env.GITHUB_REQUEST_BUDGET_STORE || defaultGithubRequestBudgetStore).trim().toLowerCase();
const redisUrl = process.env.REDIS_URL?.trim() || '';
const githubRequestBudgetKey = (process.env.GITHUB_REQUEST_BUDGET_KEY || 'octocards:github-api-budget').trim();
const configuredTimeout = Number(process.env.GITHUB_TIMEOUT_MS || 10000);
const configuredPlayground = process.env.PLAYGROUND_ENABLED?.trim().toLowerCase();
const configuredRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 12);
const configuredRateLimitWindow = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60000);
const configuredGithubRequestBudget = Number(process.env.GITHUB_API_REQUEST_BUDGET_PER_HOUR || 50);
const trustedProxyAliases = new Set(['loopback', 'linklocal', 'uniquelocal']);
const trustedProxies = (process.env.TRUSTED_PROXIES || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const isValidTrustedProxy = (entry: string): boolean => {
    if (trustedProxyAliases.has(entry)) {
        return true;
    }

    const [address, prefix, extra] = entry.split('/');
    const addressFamily = isIP(address);
    if (addressFamily === 0 || extra !== undefined) {
        return false;
    }

    if (prefix === undefined) {
        return true;
    }

    if (!/^\d+$/.test(prefix)) {
        return false;
    }

    const prefixLength = Number(prefix);
    return prefixLength <= (addressFamily === 4 ? 32 : 128);
};

if (configuredPlayground && configuredPlayground !== "true" && configuredPlayground !== "false") {
    throw new Error("PLAYGROUND_ENABLED must be true or false.");
}

const playgroundEnabled = configuredPlayground !== "false";

if (!Number.isInteger(configuredTimeout) || configuredTimeout <= 0) {
    throw new Error("GITHUB_TIMEOUT_MS must be a positive integer.");
}

if (!Number.isInteger(configuredRateLimitMax) || configuredRateLimitMax <= 0) {
    throw new Error("API_RATE_LIMIT_MAX must be a positive integer.");
}

if (!Number.isInteger(configuredRateLimitWindow) || configuredRateLimitWindow <= 0) {
    throw new Error("API_RATE_LIMIT_WINDOW_MS must be a positive integer.");
}

if (!Number.isInteger(configuredGithubRequestBudget) || configuredGithubRequestBudget <= 0) {
    throw new Error("GITHUB_API_REQUEST_BUDGET_PER_HOUR must be a positive integer.");
}

if (!['request', 'server', 'anonymous'].includes(configuredGithubAuthMode)) {
    throw new Error('GITHUB_AUTH_MODE must be request, server, or anonymous.');
}

if (!['memory', 'redis'].includes(configuredGithubRequestBudgetStore)) {
    throw new Error('GITHUB_REQUEST_BUDGET_STORE must be memory or redis.');
}

if (configuredGithubRequestBudgetStore === 'redis' && !redisUrl) {
    throw new Error('REDIS_URL is required when GITHUB_REQUEST_BUDGET_STORE=redis.');
}

if (!githubRequestBudgetKey || githubRequestBudgetKey.length > 200) {
    throw new Error('GITHUB_REQUEST_BUDGET_KEY must contain 1 to 200 characters.');
}

if (trustedProxies.some((entry) => !isValidTrustedProxy(entry))) {
    throw new Error('TRUSTED_PROXIES must contain valid IP addresses, CIDRs, or loopback/linklocal/uniquelocal.');
}

export default {
    owner,
    port,
    token,
    githubAuthMode: configuredGithubAuthMode,
    githubTimeoutMs: configuredTimeout,
    playgroundEnabled,
    apiRateLimitMax: configuredRateLimitMax,
    apiRateLimitWindowMs: configuredRateLimitWindow,
    githubApiRequestBudgetPerHour: configuredGithubRequestBudget,
    githubRequestBudgetStore: configuredGithubRequestBudgetStore,
    redisUrl,
    githubRequestBudgetKey,
    trustedProxies
};
