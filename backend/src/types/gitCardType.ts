export interface PropsGitCard {
    name: string; // Nome do repositório
    description: string; // Descrição do repositório
    principal_languages: string[]; // Principais linguagens usadas no repositório
    stars: number; // Número de estrelas do repositório
    forks: number; // Número de forks do repositório
    url: string; // URL do repositório no GitHub
    illustration_image_url: string; // URL da imagem de ilustração do repositório
}