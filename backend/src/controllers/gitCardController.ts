import { Request, Response } from 'express';
import gitCardService from '../services/gitCardService';

const getGitCard = async (req: Request, res: Response) => {
    try {
        const { owner, repo } = req.params;
        const gitCardData = await gitCardService.fetchRepositoryData(owner, repo);
        
        if (!gitCardData) {
            return res.status(404).json({ message: "Repositório não encontrado" });
        }

        res.json(gitCardData);
    } catch (error) {
        console.error("Erro ao buscar repositório:", error);
        res.status(500).json({ message: "Erro interno no servidor" });
    }
};

export default { getGitCard };
