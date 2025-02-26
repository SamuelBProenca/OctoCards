// gitCardService.ts
import axios from 'axios';
import { PropsGitCard } from '../types/gitCardType';

// Função para buscar informações do repositório
const fetchRepoInfo = async (owner: string, repo: string) => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
    return response.data; // Retorna os dados do repositório
};

// Função para buscar o conteúdo do README.md
const fetchRepoReadme = async (owner: string, repo: string) => {
    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, {
            headers: {
                Accept: `application/vnd.github.v3.raw`
            }
        });
        return response.data; // Retorna o conteúdo bruto do README
    } catch (error) {
        console.error("Erro ao buscar README:", error);
        return ""; // Retorna uma string vazia se não houver README
    }
};

// Função para buscar as linguagens do repositório
const fetchRepoLanguages = async (owner: string, repo: string) => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`);
    return Object.keys(response.data); // Retorna uma lista de linguagens
};

// Função para buscar a imagem ilustrativa
const fetchRepoIllustrationImage = async (owner: string, repo: string, readmeContent: string) => {
    let illustration_image_url = '';

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/`);
        const contents = response.data;

        // Busca uma imagem que contenha "illustration" no nome
        const illustrationImage = contents.find((file: any) =>
            file.name.toLowerCase().includes('illustration')
        );

        if (illustrationImage) {
            illustration_image_url = illustrationImage.download_url;
        }
    } catch (error) {
        console.error('Erro ao buscar imagem de ilustração:', error);
    }

    // Se não encontrou no diretório, tenta buscar no README
    if (!illustration_image_url) {
        const readmeImageMatch = readmeContent.match(/!\[.*?\]\((.*?)\)/);
        if (readmeImageMatch) {
            illustration_image_url = readmeImageMatch[1];
        }
    }

    return illustration_image_url || "https://placehold.co/600x400"; // Retorna uma imagem padrão se não achar nada
};

// Função principal para buscar todos os dados
const fetchRepositoryData = async (owner: string, repo: string): Promise<PropsGitCard | null> => {
    try {
        const repoInfo = await fetchRepoInfo(owner, repo);
        const readmeContent = await fetchRepoReadme(owner, repo);
        const principal_languages = await fetchRepoLanguages(owner, repo);
        const illustrationImage = await fetchRepoIllustrationImage(owner, repo, readmeContent);

        // Monta o objeto final do cartão
        const gitCardData: PropsGitCard = {
            name: repoInfo.name || "Sem nome",
            description: readmeContent || "Sem descrição",
            principal_languages: principal_languages.length > 0 ? principal_languages : ["Desconhecido"],
            stars: repoInfo.stargazers_count || 0,
            forks: repoInfo.forks_count || 0,
            url: repoInfo.html_url,
            illustration_image_url: illustrationImage
        };

        return gitCardData;
    } catch (error) {
        console.error('Erro ao buscar dados do repositório:', error);
        return null;
    }
};

export default { fetchRepositoryData };
