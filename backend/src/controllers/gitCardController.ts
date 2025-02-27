// octoController.ts (ou gitCardController.ts)
import { Request, Response } from 'express';
import gitCardService from '../services/gitCardService';
import { PropsGitCard } from '../types/gitCardType';
import { OctoCardRepos } from '../utils/getRepos';
import config from '../config/octoConfig';

/**
 * Obtém os dados de um único repositório e retorna o card formatado.
 *
 * Endpoint: GET /api/cards/:repo
 * Usa o owner padrão definido em config.
 *
 * @param req Express Request. Deve conter o parâmetro de rota `repo` com o nome do repositório.
 * @param res Express Response. Retorna um objeto JSON do tipo PropsGitCard ou uma mensagem de erro.
 */
export const getGitCard = async (req: Request, res: Response): Promise<void> => {
    try {
        const { repo } = req.params;
        console.log(`Buscando dados do repositório: ${config.owner}/${repo}`);
        const gitCardData: PropsGitCard | null = await gitCardService.fetchRepositoryData(config.owner, repo);
        
        if (!gitCardData) {
            console.log('Repositório não encontrado');
            res.status(404).json({ message: "Repositório não encontrado" });
            return;
        }

        console.log('Dados do Git Card:', gitCardData);
        res.json(gitCardData);
    } catch (error) {
        console.error("Erro ao buscar repositório:", error);
        res.status(500).json({ message: `Erro ${error} no servidor` });
    }
};

/**
 * Obtém os dados de múltiplos repositórios e retorna um array de cards.
 *
 * Endpoint: GET /api/cards
 * Espera um parâmetro de query chamado `repos`, contendo uma lista separada por vírgulas
 * dos nomes dos repositórios (por exemplo: ?repos=repo1,repo2,repo3).
 * Usa o owner padrão definido em config.
 *
 * @param req Express Request. Deve conter o parâmetro de query `repos`.
 * @param res Express Response. Retorna um array de objetos JSON do tipo PropsGitCard ou uma mensagem de erro.
 */
export const getGitCards = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extrai a query "repos" que deve ser uma string com os nomes separados por vírgulas.
        const reposParam = req.query.repos as string;
        if (!reposParam) {
            res.status(400).json({ message: "Nenhum repositório informado. Utilize ?repos=repo1,repo2,..." });
            return;
        }
        // Separa os repositórios em um array
        const repos: string[] = reposParam.split(',').map(repo => repo.trim());
        console.log(`Buscando dados dos repositórios: ${repos.join(', ')}`);
        // Chama a função que coleta dados para múltiplos repositórios
        const data = await OctoCardRepos(repos);
        res.json(data);
    } catch (error) {
        console.error("Erro ao buscar repositórios:", error);
        res.status(500).json({ message: `Erro ${error} no servidor` });
    }
};
