// gitCardController.ts
import { Request, Response } from 'express';
import gitCardService from '../services/gitCardService';
import { PropsGitCard } from '../types/gitCardType'; // Ajuste conforme o caminho do seu arquivo


export const getGitCard = async (req: Request, res: Response): Promise<void> => {
    try {
        const { owner, repo } = req.params;
        console.log(`Buscando dados do repositório: ${owner}/${repo}`);
        const gitCardData: PropsGitCard | null = await gitCardService.fetchRepositoryData(owner, repo);
        
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
