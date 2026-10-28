require('dotenv').config();
import { isIP } from 'node:net';

const owner = process.env.OWNER || "octocat";
const port = process.env.PORT || "3000";  
const token = process.env.TOKEN || "";
const configuredTimeout = Number(process.env.GITHUB_TIMEOUT_MS || 10000);
const configuredPlayground = process.env.PLAYGROUND_ENABLED?.trim().toLowerCase();
const configuredRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 12);
const configuredRateLimitWindow = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60000);
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

if (trustedProxies.some((entry) => !isValidTrustedProxy(entry))) {
    throw new Error('TRUSTED_PROXIES must contain valid IP addresses, CIDRs, or loopback/linklocal/uniquelocal.');
}

export default {
    owner,
    port,
    token,
    githubTimeoutMs: configuredTimeout,
    playgroundEnabled,
    apiRateLimitMax: configuredRateLimitMax,
    apiRateLimitWindowMs: configuredRateLimitWindow,
    trustedProxies
};
