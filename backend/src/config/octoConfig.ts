require('dotenv').config();

const owner = process.env.OWNER || "octocat";
const port = process.env.PORT || "3000";  
const token = process.env.TOKEN || "";
const configuredTimeout = Number(process.env.GITHUB_TIMEOUT_MS || 10000);

if (!Number.isInteger(configuredTimeout) || configuredTimeout <= 0) {
    throw new Error("GITHUB_TIMEOUT_MS must be a positive integer.");
}

export default { owner, port, token, githubTimeoutMs: configuredTimeout };
