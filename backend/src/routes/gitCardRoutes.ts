import { Router } from 'express';
const { getGitCard } = require('../controllers/gitCardController');

// Define a rota para buscar informações do repositório
const router = Router();
router.get('/:owner/:repo', getGitCard);

export default router;
