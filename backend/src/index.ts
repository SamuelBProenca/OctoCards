import express from 'express';
import cors from 'cors';
import path from 'path';
import gitCardRoutes from './routes/gitCardRoutes';
import './config/octoConfig';
import { getGitCard, getGitCards } from './controllers/gitCardController';
import config from './config/octoConfig';

const app = express();
const PORT = config.port || 3000;

app.use(cors());
app.use(express.json());

// The playground is optional: API consumers can keep using /api/cards directly.
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/cards', gitCardRoutes);

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});

export default { getGitCard, getGitCards};
