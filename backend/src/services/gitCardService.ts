import { PropsGitCard } from '../types/gitCardType';

const fetchRepositoryData = async (owner: string, repo: string): Promise<PropsGitCard | null> => {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // Mapeando os dados para o formato definido em PropsGitCard
        const gitCard: PropsGitCard = {
            name: data.name,
            description: data.description || "Sem descrição",
            principal_languages: [], // Precisamos fazer outra requisição para pegar as linguagens
            stars: data.stargazers_count,
            forks: data.forks_count,
            url: data.html_url,
            illustration_image_url: data.owner.avatar_url
        };

        return gitCard;
    } catch (error) {
        console.error("Erro ao buscar dados do GitHub:", error);
        return null;
    }
};

export default { fetchRepositoryData };
