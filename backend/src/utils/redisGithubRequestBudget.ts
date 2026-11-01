import { randomUUID } from 'node:crypto';
import { GithubRequestBudget } from './githubRequestBudget';

export type RedisEval = (
    script: string,
    options: { keys: string[]; arguments: string[] }
) => Promise<unknown>;

export const RESERVE_GITHUB_REQUEST_SCRIPT = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local requestId = ARGV[3]
local time = redis.call('TIME')
local nowMs = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

redis.call('ZREMRANGEBYSCORE', key, '-inf', nowMs - windowMs)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterMs = tonumber(oldest[2]) + windowMs - nowMs
  return {0, math.max(1, retryAfterMs)}
end

redis.call('ZADD', key, nowMs, tostring(nowMs) .. ':' .. requestId)
redis.call('PEXPIRE', key, windowMs)
return {1, 0}
`;

export const createRedisGithubRequestBudget = (
    evalRedis: RedisEval,
    key: string,
    maxRequests: number,
    windowMs: number
): GithubRequestBudget => {
    if (!key.trim() || key.length > 200) {
        throw new Error('GitHub request budget key must contain 1 to 200 characters.');
    }
    if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
        throw new Error('GitHub request budget must be a positive integer.');
    }
    if (!Number.isInteger(windowMs) || windowMs <= 0) {
        throw new Error('GitHub request budget window must be a positive integer.');
    }

    return {
        reserve: async () => {
            const result = await evalRedis(RESERVE_GITHUB_REQUEST_SCRIPT, {
                keys: [key],
                arguments: [String(windowMs), String(maxRequests), randomUUID()]
            });
            if (!Array.isArray(result) || result.length < 2) {
                throw new Error('Redis returned an invalid GitHub request budget response.');
            }

            return Number(result[0]) === 1
                ? null
                : Math.max(1, Math.ceil(Number(result[1]) / 1000));
        }
    };
};
