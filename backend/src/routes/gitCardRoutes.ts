import { Router } from 'express';
import { getGitCard, getGitCards } from '../controllers/gitCardController';

const router = Router();

/**
 * @route   GET /api/cards/:repo
 * @desc    Retorna os dados de um único repositório (GitCard).
 * @param   req.params.repo - Nome do repositório.
 * @param   req.query.owner - (Opcional) Owner para sobrescrever o default.
 * @returns Objeto JSON com os dados formatados do repositório.
 *
 * Exemplo de chamada:
 *   GET /api/cards/OctoCards?owner=SamuelBProenca
 *   Se 'owner' não for informado, será usado o owner definido em config.
 */ 
router.get('/:repo', getGitCard);

/**
 * @route   GET /api/cards
 * @desc    Retorna os dados de múltiplos repositórios.
 * @param   req.query.repos - Lista separada por vírgulas dos nomes dos repositórios (ex.: repos=repo1,repo2,repo3).
 * @param   req.query.owner - (Opcional) Owner para sobrescrever o default.
 * @returns Um array de objetos JSON, cada um representando os dados de um repositório.
 *
 * Exemplo de chamada:
 *   GET /api/cards?repos=OctoCards,frontend-challenge&owner=SamuelBProenca
 *   Se 'owner' não for informado, será usado o owner definido em config.
 */
router.get('/', getGitCards);

export default router;
