import { AddressInfo } from 'net';
import { createApp } from '../app';

type TestAppOptions = {
    playgroundEnabled: boolean;
    apiRateLimit?: { windowMs: number; limit: number };
    docsRateLimit?: { windowMs: number; limit: number };
    trustedProxies?: string[];
};

const withServer = async (
    options: TestAppOptions,
    run: (baseUrl: string) => Promise<void>
): Promise<void> => {
    const server = createApp(options).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    try {
        const address = server.address() as AddressInfo;
        await run(`http://127.0.0.1:${address.port}`);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error?: Error) => error ? reject(error) : resolve());
        });
    }
};

describe('Express app modes', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('keeps API and docs available when the playground is disabled', async () => {
        await withServer({ playgroundEnabled: false }, async (baseUrl) => {
            const root = await fetch(baseUrl);
            expect(root.status).toBe(200);
            expect(root.headers.get('content-type')).toContain('application/json');
            expect(root.headers.get('x-powered-by')).toBeNull();
            expect(await root.json()).toMatchObject({
                service: 'OctoCards API',
                playground: 'disabled',
                documentation: '/docs/',
                openapi: '/swagger.yaml'
            });

            const docs = await fetch(`${baseUrl}/docs/`);
            expect(docs.status).toBe(200);
            const docsHtml = await docs.text();
            expect(docsHtml).toContain('Use a API do seu jeito.');
            expect(docsHtml).toContain('API_RATE_LIMITED');
            expect(docsHtml).toContain('TRUSTED_PROXIES');

            const openapi = await fetch(`${baseUrl}/swagger.yaml`);
            expect(openapi.status).toBe(200);
            const openapiYaml = await openapi.text();
            expect(openapiYaml).toContain('openapi: 3.0.3');
            expect(openapiYaml).toContain('API_RATE_LIMITED');
            expect(openapiYaml).toContain('pattern: "^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$"');

            const invalidRequest = await fetch(`${baseUrl}/api/cards`);
            expect(invalidRequest.status).toBe(400);
            expect(await invalidRequest.json()).toMatchObject({
                error: { code: 'INVALID_REQUEST' }
            });
        });
    });

    it('serves the playground when enabled and keeps docs available', async () => {
        await withServer({ playgroundEnabled: true }, async (baseUrl) => {
            const root = await fetch(baseUrl);
            expect(root.status).toBe(200);
            expect(root.headers.get('x-powered-by')).toBeNull();
            expect(await root.text()).toContain('GitHub em dados.');

            const docs = await fetch(`${baseUrl}/docs/`);
            expect(docs.status).toBe(200);
        });
    });

    it('returns 429 and Retry-After when the API request budget is exhausted', async () => {
        await withServer({
            playgroundEnabled: false,
            apiRateLimit: { windowMs: 60_000, limit: 2 },
            trustedProxies: []
        }, async (baseUrl) => {
            const first = await fetch(`${baseUrl}/api/cards`, {
                headers: { 'X-Forwarded-For': '198.51.100.10' }
            });
            const second = await fetch(`${baseUrl}/api/cards`, {
                headers: { 'X-Forwarded-For': '198.51.100.11' }
            });
            const third = await fetch(`${baseUrl}/api/cards`, {
                headers: { 'X-Forwarded-For': '198.51.100.12' }
            });

            expect(first.status).toBe(400);
            expect(second.status).toBe(400);
            expect(third.status).toBe(429);
            expect(third.headers.get('retry-after')).not.toBeNull();
            expect(await third.json()).toMatchObject({
                error: { code: 'API_RATE_LIMITED' }
            });
        });
    });
    it('rate limits documentation file routes and returns Retry-After', async () => {
        await withServer({
            playgroundEnabled: false,
            docsRateLimit: { windowMs: 60_000, limit: 3 }
        }, async (baseUrl) => {
            const openapi = await fetch(baseUrl + '/swagger.yaml');
            const guide = await fetch(baseUrl + '/GUIA_DO_OCTOCARDS.md');
            const docs = await fetch(baseUrl + '/docs/');
            const limitedDocs = await fetch(baseUrl + '/docs/');

            expect(openapi.status).toBe(200);
            expect(guide.status).toBe(200);
            expect(docs.status).toBe(200);
            expect(limitedDocs.status).toBe(429);
            expect(limitedDocs.headers.get('retry-after')).not.toBeNull();
            expect(await limitedDocs.json()).toMatchObject({
                error: { code: 'DOCS_RATE_LIMITED' }
            });
        });
    });
});
