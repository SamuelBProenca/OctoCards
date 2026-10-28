# OctoCards

OctoCards collects public GitHub repository data and returns it as JSON, so you can build a portfolio or interface of your own. The included playground is an optional example client; the API also runs on its own.

- **Online guide:** open `/docs/` on your OctoCards instance.
- **OpenAPI specification:** `/swagger.yaml` on the same host.
- **Project guide:** [backend/public/GUIA_DO_OCTOCARDS.md](backend/public/GUIA_DO_OCTOCARDS.md).

## Run locally

Requirements: Node.js and npm.

```sh
git clone https://github.com/SamuelBProenca/OctoCards.git
cd OctoCards/backend
npm install
npm run dev
```

Before starting, copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`; macOS/Linux or Git Bash: `cp .env.example .env`). The template starts OctoCards in API-only mode. The server runs at `http://localhost:3000`; the root path returns service information, the guide is at `/docs/`, and requests go to `/api/cards`. To also serve the visual playground at `/`, set `PLAYGROUND_ENABLED=true` in `.env` and restart the server.

## Build and run for production

Run npm run build to compile the TypeScript server and copy backend/public into backend/dist/public. Then run npm start; production starts the compiled JavaScript with Node and does not require ts-node.

## Configure

Set these values in `backend/.env`:

| Variable | Purpose | Example |
| --- | --- | --- |
| `OWNER` | Default GitHub account when `owner` is omitted from a request. | `octocat` |
| `PORT` | Local server port. | `3000` |
| `TOKEN` | Optional GitHub token used by the backend to authenticate upstream requests and reduce anonymous rate-limit issues. Keep it secret and never put it in browser code. | Leave blank or set your token |
| `GITHUB_TIMEOUT_MS` | Timeout for GitHub requests, in milliseconds. | `10000` |
| `API_RATE_LIMIT_MAX` | Maximum API requests allowed per client IP in one window. | `12` |
| `API_RATE_LIMIT_WINDOW_MS` | Length of the per-IP rate-limit window in milliseconds. | `60000` |
| `TRUSTED_PROXIES` | Optional comma-separated proxy IPs/CIDRs used to read client IPs from forwarded headers. Configure only the addresses of proxies you operate. | Leave blank for direct connections |
| `PLAYGROUND_ENABLED` | Serves the optional visual client at `/` when `true`; when `false`, the API, docs, and OpenAPI file stay available. | `false` |

The API rate limit is in-memory and per process. If OctoCards runs behind a reverse proxy, configure its exact IP/CIDR in `TRUSTED_PROXIES`; otherwise all visitors may be counted under the proxy address. Do not trust arbitrary forwarded headers.

## Call the API

Use your deployed instance's base URL online, or `http://localhost:3000` locally.

Fetch one repository:

```sh
curl "http://localhost:3000/api/cards/Hello-World?owner=octocat"
```

Fetch several repositories from the same owner:

```sh
curl "http://localhost:3000/api/cards?owner=octocat&repos=Hello-World,Spoon-Knife"
```

Both routes return JSON. A card includes the repository name, README content, main languages, stars, forks, repository URL, and a selected image URL when available. See `/docs/` or `/swagger.yaml` for parameter details, response fields, and errors.

## Project structure

- `backend/src/` — API configuration, routes, controllers, GitHub data collection, and types.
- `backend/public/` — optional playground, in-site documentation, OpenAPI description, and usage guide.
- `backend/.env.example` — safe local configuration template. Keep your real `.env` out of Git.

## Development

From `backend/`, run `npm test` for the existing Jest suite and `npx tsc --noEmit` for a TypeScript check. `npm run dev` starts the local server.

Contributions are welcome. Open an issue or pull request with a clear description.
