require('dotenv').config();

const owner = process.env.OWNER || "octocat";
const port = process.env.PORT || "3000";  
const token = process.env.TOKEN || "";
const configuredTimeout = Number(process.env.GITHUB_TIMEOUT_MS || 10000);
const configuredPlayground = process.env.PLAYGROUND_ENABLED?.trim().toLowerCase();

if (configuredPlayground && configuredPlayground !== "true" && configuredPlayground !== "false") {
    throw new Error("PLAYGROUND_ENABLED must be true or false.");
}

const playgroundEnabled = configuredPlayground !== "false";

if (!Number.isInteger(configuredTimeout) || configuredTimeout <= 0) {
    throw new Error("GITHUB_TIMEOUT_MS must be a positive integer.");
}

export default { owner, port, token, githubTimeoutMs: configuredTimeout, playgroundEnabled };
