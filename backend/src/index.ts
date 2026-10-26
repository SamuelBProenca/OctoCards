import express from 'express';
import cors from 'cors';
import path from 'path';
import gitCardRoutes from './routes/gitCardRoutes';
import './config/octoConfig';
import { getGitCard, getGitCards } from './controllers/gitCardController';
import config from './config/octoConfig';

const app = express();
const PORT = config.port || 3000;
const publicDirectory = path.join(__dirname, '../public');

app.use(cors());
app.use(express.json());

// Keep the human-readable docs and machine-readable OpenAPI available in API-only mode.
app.use('/docs', express.static(path.join(publicDirectory, 'docs'), { index: 'index.html' }));
app.get('/swagger.yaml', (_req, res) => res.sendFile(path.join(publicDirectory, 'swagger.yaml')));
app.get('/GUIA_DO_OCTOCARDS.md', (_req, res) => res.sendFile(path.join(publicDirectory, 'GUIA_DO_OCTOCARDS.md')));
app.use('/api/cards', gitCardRoutes);

if (config.playgroundEnabled) {
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

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});

export default { getGitCard, getGitCards};
