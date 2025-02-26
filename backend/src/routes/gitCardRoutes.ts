import { Router } from 'express';
import { getGitCard } from '../controllers/gitCardController';

const router = Router();
router.get('/:owner/:repo', getGitCard);

export default router;
