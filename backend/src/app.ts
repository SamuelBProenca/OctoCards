import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import gitCardRoutes from './routes/gitCardRoutes';
import config from './config/octoConfig';

export interface ApiRateLimitOptions {
    windowMs?: number;
    limit?: number;
}

export interface AppOptions {
    playgroundEnabled?: boolean;
    apiRateLimit?: ApiRateLimitOptions;
    docsRateLimit?: ApiRateLimitOptions;
    trustedProxies?: string[];
}

export const createApp = (options: AppOptions = {}): Express => {
    const app = express();
    const publicDirectory = path.join(__dirname, '../public');
    const playgroundEnabled = options.playgroundEnabled ?? config.playgroundEnabled;

    app.disable('x-powered-by');
    const trustedProxies = options.trustedProxies ?? config.trustedProxies;
    if (trustedProxies.length > 0) {
        app.set('trust proxy', trustedProxies);
    }

    app.use(cors());
    app.use(express.json());

    // Enforce the per-client budget before any route can trigger GitHub requests.
    const apiRateLimiter = rateLimit({
        windowMs: options.apiRateLimit?.windowMs ?? config.apiRateLimitWindowMs,
        limit: options.apiRateLimit?.limit ?? config.apiRateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json({
                error: {
                    code: 'API_RATE_LIMITED',
                    message: 'The OctoCards API request limit has been reached. Please retry later.'
                }
            });
        }
    });
    app.use('/api/cards', apiRateLimiter);
    const docsRateLimiter = rateLimit({
        windowMs: options.docsRateLimit?.windowMs ?? 60_000,
        limit: options.docsRateLimit?.limit ?? 120,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(429).json({
                error: {
                    code: 'DOCS_RATE_LIMITED',
                    message: 'The OctoCards documentation request limit has been reached. Please retry later.'
                }
            });
        }
    });
    app.use('/docs', docsRateLimiter);
    app.use('/swagger.yaml', docsRateLimiter);
    app.use('/GUIA_DO_OCTOCARDS.md', docsRateLimiter);

    // Keep the human-readable docs and machine-readable OpenAPI available in API-only mode.
    app.use('/docs', express.static(path.join(publicDirectory, 'docs'), { index: 'index.html' }));
    app.get('/swagger.yaml', (_req, res) => res.sendFile(path.join(publicDirectory, 'swagger.yaml')));
    app.get('/GUIA_DO_OCTOCARDS.md', (_req, res) => res.sendFile(path.join(publicDirectory, 'GUIA_DO_OCTOCARDS.md')));
    app.use('/api/cards', gitCardRoutes);

    if (playgroundEnabled) {
        app.use(express.static(publicDirectory));
    } else {
        app.get('/', (_req, res) => {
            res.status(200).json({
                service: 'OctoCards API',
                playground: 'disabled',
                documentation: '/docs/',
                openapi: '/swagger.yaml',
                endpoints: ['GET /api/cards/:repo', 'GET /api/cards']
            });
        });
    }

    return app;
};
