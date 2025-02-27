import { PropsGitCard } from "../types/gitCardType";
import config from "../config/octoConfig";
import gitCardService from "../services/gitCardService";

/**
 * Busca dados de múltiplos repositórios utilizando a função
 * fetchRepositoryData do gitCardService.
 *
 * @param repos - Um array de nomes de repositórios.
 * @returns Uma Promise que resolve para um array de objetos PropsGitCard,
 *          contendo os dados filtrados conforme definido no serviço.
 *
 * A função usa o owner padrão definido no arquivo de configuração.
 * Caso algum repositório não seja encontrado ou ocorra um erro,
 * ele será filtrado (ou retornará null, que é removido do array final).
 */
export async function OctoCardRepos(repos: string[]): Promise<PropsGitCard[]> {
  try {
    // Cria uma lista de Promises chamando o serviço para cada repositório
    const promises = repos.map(repo => 
      gitCardService.fetchRepositoryData(config.owner, repo)
    );
    
    // Executa as chamadas de forma concorrente
    const results = await Promise.all(promises);
    
    // Filtra resultados nulos (que podem ocorrer se a requisição falhar)
    const repoData = results.filter((data): data is PropsGitCard => data !== null);
    
    return repoData;
  } catch (error) {
    console.error("Erro ao capturar informações dos repositórios:", error);
    return [];
  }
}
