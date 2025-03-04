import express from 'express';
import cors from 'cors';
import gitCardRoutes from './routes/gitCardRoutes';
import './config/octoConfig';
import { getGitCard, getGitCards } from './controllers/gitCardController';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Adiciona as rotas ao servidor
app.use('/api/cards', gitCardRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

export default { getGitCard, getGitCards};