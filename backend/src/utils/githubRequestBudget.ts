import { performance } from 'node:perf_hooks';

export interface GithubRequestBudget {
    reserve(): number | null;
}

/**
 * Tracks outbound GitHub API calls for one Node.js process using a rolling window.
 * A rejected reservation returns the number of seconds until the oldest call expires.
 */
export const createGithubRequestBudget = (
    maxRequests: number,
    windowMs: number,
    now: () => number = () => performance.now()
): GithubRequestBudget => {
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
        throw new Error('GitHub request budget must be a positive integer.');
    }
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
        throw new Error('GitHub request budget window must be a positive integer.');
    }

    const requestTimes: number[] = [];
    let oldestRequestIndex = 0;

    return {
        reserve: () => {
            const currentTime = now();
            const windowStart = currentTime - windowMs;
            while (
                oldestRequestIndex < requestTimes.length &&
                requestTimes[oldestRequestIndex] <= windowStart
            ) {
                oldestRequestIndex += 1;
            }

            const activeRequests = requestTimes.length - oldestRequestIndex;
            if (activeRequests >= maxRequests) {
                const retryAfterMs = requestTimes[oldestRequestIndex] + windowMs - currentTime;
                return Math.max(1, Math.ceil(retryAfterMs / 1000));
            }

            requestTimes.push(currentTime);
            // Compact expired entries periodically so memory stays bounded by the budget.
            if (oldestRequestIndex > 0 && oldestRequestIndex >= maxRequests) {
                requestTimes.splice(0, oldestRequestIndex);
                oldestRequestIndex = 0;
            }
            return null;
        }
    };
};
