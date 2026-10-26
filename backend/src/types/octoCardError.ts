export type OctoCardErrorCode =
    | "INVALID_REQUEST"
    | "REPOSITORY_NOT_FOUND"
    | "GITHUB_UNAUTHORIZED"
    | "GITHUB_FORBIDDEN"
    | "GITHUB_RATE_LIMITED"
    | "GITHUB_TIMEOUT"
    | "CONFIGURATION_ERROR"
    | "UPSTREAM_ERROR"
    | "INTERNAL_ERROR";

export class OctoCardError extends Error {
    constructor(
        public readonly code: OctoCardErrorCode,
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "OctoCardError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
