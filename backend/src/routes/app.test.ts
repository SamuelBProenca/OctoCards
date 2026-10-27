import { AddressInfo } from 'net';
import { createApp } from '../app';

const withServer = async (
    playgroundEnabled: boolean,
    run: (baseUrl: string) => Promise<void>
): Promise<void> => {
    const server = createApp({ playgroundEnabled }).listen(0);
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
        await withServer(false, async (baseUrl) => {
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
            expect(await docs.text()).toContain('Use a API do seu jeito.');

            const openapi = await fetch(`${baseUrl}/swagger.yaml`);
            expect(openapi.status).toBe(200);
            expect(await openapi.text()).toContain('openapi: 3.0.3');

            const invalidRequest = await fetch(`${baseUrl}/api/cards`);
            expect(invalidRequest.status).toBe(400);
            expect(await invalidRequest.json()).toMatchObject({
                error: { code: 'INVALID_REQUEST' }
            });
        });
    });

    it('serves the playground when enabled and keeps docs available', async () => {
        await withServer(true, async (baseUrl) => {
            const root = await fetch(baseUrl);
            expect(root.status).toBe(200);
            expect(root.headers.get('x-powered-by')).toBeNull();
            expect(await root.text()).toContain('GitHub em dados.');

            const docs = await fetch(`${baseUrl}/docs/`);
            expect(docs.status).toBe(200);
        });
    });
});
