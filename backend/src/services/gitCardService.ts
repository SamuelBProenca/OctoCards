import axios from 'axios';
import { PropsGitCard } from '../types/gitCardType';
// import config from '../config/octoConfig';


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
/**
 * Fetches repository data from GitHub and constructs a GitCard object.
 *
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @returns A promise that resolves to a `PropsGitCard` object containing repository data, or `null` if an error occurs.
 *
 * The returned `PropsGitCard` object contains the following properties:
 * - `name`: The name of the repository, or "Sem nome" if not available.
 * - `description`: The content of the repository's README, or "Sem descrição" if not available.
 * - `principal_languages`: An array of the principal languages used in the repository, or ["Desconhecido"] if not available.
 * - `stars`: The number of stars the repository has, or 0 if not available.
 * - `forks`: The number of forks the repository has, or 0 if not available.
 * - `url`: The URL of the repository.
 * - `illustration_image_url`: The URL of an illustration image for the repository.
 *
 * @throws Will log an error to the console if fetching repository data fails.
 */

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
