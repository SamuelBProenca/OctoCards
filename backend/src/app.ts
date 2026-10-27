import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import gitCardRoutes from './routes/gitCardRoutes';
import config from './config/octoConfig';

export interface AppOptions {
    playgroundEnabled?: boolean;
}

export const createApp = (options: AppOptions = {}): Express => {
    const app = express();
    const publicDirectory = path.join(__dirname, '../public');
    const playgroundEnabled = options.playgroundEnabled ?? config.playgroundEnabled;

    app.disable('x-powered-by');
    app.use(cors());
    app.use(express.json());

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