
---

# OctoCards

**OctoCards** é uma API que facilita a criação de portfólios para desenvolvedores, transformando dados brutos dos repositórios do GitHub em "cards" estruturados e prontos para exibição. Com ela, você pode exibir informações relevantes—como descrição (README), linguagens, estrelas, forks e imagens—de forma automatizada.

---

## Table of Contents

- [Features](#features)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Endpoints da API](#endpoints-da-api)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy](#deploy)
- [Contribuições](#contribuições)
- [Licença](#licença)

---

## Features

- **Integração com GitHub:** Obtém informações dos repositórios via API.
- **Dados Formatados:** Transforma dados brutos em objetos JSON seguindo a interface `PropsGitCard`.
- **Suporte a Repositórios Múltiplos:** Permite buscar dados de vários repositórios em uma única requisição.
- **Configuração Flexível:** Define um owner padrão via variável de ambiente, com possibilidade de sobrescrever.
- **Segurança:** Tokens e configurações sensíveis ficam armazenados no back-end, protegendo suas credenciais.
- **Modularidade:** Código dividido em controllers, services, routes, types, utils e config para facilitar a manutenção.

---

## Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/OctoCards.git
   cd OctoCards/backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

---

## Configuração

Crie um arquivo `.env` na raiz do diretório `backend` com as seguintes variáveis:
```env
OWNER=SeuGitHubUsername
PORT=3000 ou porta de sua preferência 
TOKEN=seu_token_github_opcional
```

As configurações são centralizadas em `config/octoConfig.ts`, que importa as variáveis do `.env` para serem usadas em toda a aplicação.

---

## Uso

### Executar o Servidor em Desenvolvimento

Para rodar a API localmente, utilize:
```bash
npm run dev
```
A API ficará disponível em:  
```
http://localhost:3000/api/cards
```

### Teste Rápido

Você pode testar a funcionalidade de múltiplos repositórios utilizando o arquivo de teste `testOctoCardRepos.ts` (na raiz ou em uma pasta de testes):
```bash
npx ts-node testOctoCardRepos.ts
```

---

## Endpoints da API

### 1. Obter Dados de um Único Repositório

- **Endpoint:**  
  `GET /api/cards/:repo`
- **Parâmetros:**  
  - `:repo` (path) – Nome do repositório.
  - `owner` (query, opcional) – Para sobrescrever o owner padrão.
- **Exemplo:**  
  ```bash
  GET http://localhost:3000/api/cards/OctoCards?owner=_seu_usuário_
  ```
- **Descrição:**  
  Retorna um objeto JSON contendo os dados formatados do repositório conforme a interface `PropsGitCard`.

### 2. Obter Dados de Múltiplos Repositórios

- **Endpoint:**  
  `GET /api/cards`
- **Parâmetros (Query):**  
  - `repos` (obrigatório) – Lista separada por vírgulas dos nomes dos repositórios (ex.: `repos=repo1,repo2`).
  - `owner` (query, opcional) – Para sobrescrever o owner padrão.
- **Exemplo:**  
  ```bash
  GET http://localhost:3000/api/cards?repos=repo1,repo2&owner=_seu_usuário_
  ```
- **Descrição:**  
  Retorna um array de objetos JSON, onde cada objeto representa os dados de um repositório.

---

## Estrutura do Projeto

```
backend/
├── config/
│   └── octoConfig.ts       // Variáveis de ambiente (OWNER, PORT, TOKEN)
├── controllers/
│   └── gitCardController.ts // Funções que tratam as requisições HTTP
├── routes/
│   └── gitCardRoutes.ts     // Definição dos endpoints da API
├── services/
│   └── gitCardService.ts    // Lógica para buscar e formatar os dados do GitHub
├── types/
│   └── gitCardType.ts       // Interface PropsGitCard
├── utils/
│   └── getRepos.ts          // Função para buscar dados de múltiplos repositórios
├── index.ts                 // Ponto de entrada da aplicação
├── package.json             // Dependências e scripts
├── tsconfig.json            // Configuração do TypeScript
└── .env                     // Variáveis de ambiente (não commitado)
```

---

## Deploy

Você pode hospedar a API em serviços como Heroku, Vercel, AWS, etc.  
**Exemplo com Heroku:**

1. **Crie uma conta e instale a CLI do Heroku.**

2. **Dentro do diretório do projeto, crie um novo app:**
   ```bash
   heroku create seu-nome-de-app
   ```

3. **Configure as variáveis de ambiente no Heroku:**
   ```bash
   heroku config:set OWNER=SeuGitHubUsername PORT=3000 TOKEN=seu_token_github_opcional
   ```

4. **Faça o deploy via Git:**
   ```bash
   git push heroku main
   ```

Sua API ficará disponível em `https://seu-nome-de-app.herokuapp.com/api/cards`.

---

## Contribuições

Contribuições são bem-vindas!  
- Faça um fork do repositório.
- Crie uma branch para sua feature: `git checkout -b minha-feature`.
- Faça commit das alterações: `git commit -m 'Minha nova feature'`.
- Envie sua branch: `git push origin minha-feature`.
- Abra um Pull Request.

Por favor, siga as boas práticas de código e mantenha a documentação atualizada.

---

## Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

---

Com esse README, esperamos que os usuários e desenvolvedores entendam como utilizar e contribuir com a API **OctoCards**. Se precisar de mais alguma modificação ou acréscimo, estou à disposição!