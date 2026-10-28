# OctoCards — guia de uso, funcionamento e próximos passos

**Estado do projeto:** alpha.
**Objetivo:** coletar dados de repositórios para que cada pessoa possa construir a própria implementação de front-end. O playground incluído é uma demonstração opcional; a API JSON pode ser usada sem ele.

## 1. O que já funciona

- Consulta de um repositório público do GitHub ou de uma lista de repositórios de uma mesma conta.
- Retorno de nome, README, linguagens, estrelas, forks, URL e imagem de capa selecionada.
- Playground web com presets, cards, visualização do JSON e cópia de um card ou da coleção inteira.
- Leitura expansível do README em cada card. Títulos, listas, citações, links, código e ênfases comuns recebem formatação básica. HTML encontrado no README é tratado como texto, não executado.
- Link direto para a resposta JSON e especificação Swagger/OpenAPI.
- Cache em memória por cinco minutos, limitado a 500 cards. Consultas simultâneas iguais compartilham a mesma chamada ao GitHub.
- Proteção para manter a API pública: o backend só lê README e arquivos quando o GitHub confirma private=false. Repositórios privados e inexistentes recebem a mesma resposta 404.

## 2. Iniciar localmente

É necessário ter Node.js e npm instalados. No terminal, entre na pasta backend:

~~~sh
cd backend
npm install
~~~

Crie backend/.env com as variáveis que deseja configurar:

~~~dotenv
OWNER=octocat
PORT=3000
TOKEN=
GITHUB_TIMEOUT_MS=10000
PLAYGROUND_ENABLED=false
API_RATE_LIMIT_MAX=12
API_RATE_LIMIT_WINDOW_MS=60000
TRUSTED_PROXIES=
~~~

OWNER define a conta usada quando a URL não informa owner. PORT escolhe a porta do servidor. TOKEN é opcional, mas autenticar as consultas evita que o playground dependa apenas da cota pública não autenticada. Use uma credencial de servidor com acesso de leitura necessário aos repositórios públicos. O valor deve ficar no backend e nunca no JavaScript do navegador. O arquivo .env está ignorado pelo Git; não o adicione ao commit.

GITHUB_TIMEOUT_MS é o tempo máximo de cada chamada ao GitHub em milissegundos. O padrão é 10000. O servidor rejeita valores que não sejam inteiros positivos.

API_RATE_LIMIT_MAX e API_RATE_LIMIT_WINDOW_MS definem o limite por endereço IP; os padrões permitem 12 chamadas a cada 60000 ms. O armazenamento é em memória e independente em cada processo. Em hospedagem atrás de proxy reverso, informe os IPs/CIDRs exatos em TRUSTED_PROXIES para obter o IP real do cliente. Sem uma configuração confiável, cabeçalhos encaminhados são ignorados. A aplicação limita requisições HTTP; a cota externa do GitHub continua compartilhada pela credencial do servidor.

Inicie o serviço:

~~~sh
npm run dev
~~~

Com PLAYGROUND_ENABLED=false, / retorna um resumo JSON; consulte a documentação em http://localhost:3000/docs/ e use as rotas /api/cards diretamente. Para abrir o playground, altere PLAYGROUND_ENABLED para true. Se a porta estiver ocupada, ajuste PORT. Sem TOKEN, consultas ainda podem funcionar, mas chamadas sem autenticação têm uma cota menor e podem responder com GITHUB_RATE_LIMITED.

## 3. Usar o playground

1. Informe uma conta ou organização do GitHub.
2. Digite um nome de repositório ou vários nomes separados por vírgula.
3. Clique em Buscar projetos ou escolha um preset.
4. No card, confira imagem, resumo, métricas e linguagens.
5. Abra Ler README para expandir o conteúdo importado.
6. Use Copiar JSON no card ou no cabeçalho da coleção. A aba JSON mostra a resposta completa.
7. Abrir API leva à mesma requisição em formato JSON, sem depender da interface.

Os presets são exemplos de contas e repositórios públicos e podem deixar de existir ou mudar de nome.

### Como a imagem é escolhida

Para cada repositório, o backend consulta recursivamente a árvore de arquivos do GitHub e também lê as referências de imagem do README, incluindo sintaxe Markdown e tags HTML img. Caminhos relativos são convertidos para URLs brutas do branch padrão. O seletor prefere nomes que indiquem banner, cover/capa, header, hero ou social preview; depois ilustração, showcase, screenshot ou preview; em seguida logo/brand/icon. Badges e shields são ignorados. Se não houver uma imagem adequada, o card usa um placeholder.

O JSON mantém o campo illustration_image_url por compatibilidade com a estrutura existente; o campo agora representa a imagem selecionada para o card, mesmo que o arquivo se chame banner.png ou esteja em uma pasta interna.

## 4. Usar a API sem o front-end

### Um repositório

~~~http
GET /api/cards/OctoCards?owner=SamuelBProenca
~~~

Retorna um objeto:

~~~json
{
  "name": "OctoCards",
  "description": "# OctoCards\n...",
  "principal_languages": ["TypeScript"],
  "stars": 0,
  "forks": 0,
  "url": "https://github.com/SamuelBProenca/OctoCards",
  "illustration_image_url": "https://raw.githubusercontent.com/..."
}
~~~

### Uma coleção

~~~http
GET /api/cards?repos=OctoCards%2CLinkKeeper&owner=SamuelBProenca
~~~

Retorna uma lista na ordem solicitada. Se qualquer item falhar, a API retorna o erro correspondente para a requisição inteira, sem uma coleção parcial.

owner é opcional nos dois endpoints; quando omitido, o backend usa OWNER. O owner aceita até 39 caracteres ASCII alfanuméricos e hífen, sem hífen no início/fim ou hífens consecutivos; cada nome de repositório aceita até 100 letras ASCII, números, ponto, hífen ou sublinhado. A coleção aceita até 10 itens e 2048 caracteres no parâmetro repos; nomes repetidos sem diferenciar maiúsculas/minúsculas são consultados uma vez. A documentação completa está em /swagger.yaml.

### Campos do cartão

| Campo | Conteúdo |
| --- | --- |
| name | Nome do repositório. |
| description | README bruto em Markdown; fica Sem descrição quando não há README. |
| principal_languages | Linguagens retornadas pelo GitHub; usa Desconhecido se a lista vier vazia. |
| stars / forks | Contagens do GitHub. |
| url | Página do repositório. |
| illustration_image_url | URL da imagem selecionada para a capa do card ou do placeholder. |

### Erros comuns

As respostas de erro seguem o formato JSON com um objeto error contendo code e message.

| HTTP | Código típico | O que significa |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Nome, owner ou lista de repositórios inválida. |
| 401 | GITHUB_UNAUTHORIZED | O GitHub rejeitou a credencial configurada. |
| 403 | GITHUB_FORBIDDEN | O GitHub negou o acesso por permissão. |
| 404 | REPOSITORY_NOT_FOUND | Repositório inexistente, privado ou indisponível. |
| 429 | API_RATE_LIMITED | O cliente excedeu o limite local por IP; aguarde o cabeçalho Retry-After. |
| 429 | GITHUB_RATE_LIMITED | A cota do GitHub usada pelo servidor acabou; configure TOKEN ou aguarde a renovação. |
| 502 | UPSTREAM_ERROR | Falha ao consultar o GitHub. |
| 504 | GITHUB_TIMEOUT | O GitHub não respondeu dentro do tempo configurado. |

## 5. Como o sistema funciona

~~~text
Navegador opcional
  ├─ Playground: busca, renderiza cards, abre README e copia JSON
  └─ Cliente próprio: chama a API e recebe JSON
                  │
                  ▼
Express (backend/src/index.ts inicia; backend/src/app.ts monta)
  ├─ arquivos estáticos e documentação em backend/public
  └─ /api/cards → rotas → controller
                         ├─ valida parâmetros e esconde detalhes internos
                         └─ service
                              ├─ verifica primeiro se o repositório é público
                              ├─ consulta metadados, README e linguagens
                              ├─ pesquisa imagens na árvore e no README
                              └─ guarda o resultado em cache por cinco minutos
~~~

### Peças principais

- backend/src/app.ts: cria a aplicação Express, registra middlewares/rotas e decide se serve o playground.
- backend/src/index.ts: carrega a configuração e inicia o listener HTTP.
- backend/src/routes/gitCardRoutes.ts: declara as duas rotas GET.
- backend/src/controllers/gitCardController.ts: valida owner/repo, chama o serviço e uniformiza erros.
- backend/src/services/gitCardService.ts: autentica as chamadas de saída ao GitHub, aplica cache, coleta README/linguagens/imagem e monta o cartão.
- backend/src/utils/getRepos.ts: coleta vários cartões na ordem pedida.
- backend/src/types: estrutura do cartão e erros da API.
- backend/public: playground, CSS, JavaScript, OpenAPI e este guia.

O token só é usado nas chamadas feitas pelo backend ao GitHub. O navegador não recebe essa credencial. O cache é local ao processo: reiniciar o servidor o limpa, e várias instâncias não compartilham o mesmo cache.

## 6. Build, testes e verificações

Para iniciar a versão de produção, compile o backend e depois execute o JavaScript gerado:

~~~sh
npm run build
npm start
~~~

O build grava o servidor em dist/src e copia os arquivos do site e da documentação para dist/public. npm run test:build compila e inicia um servidor temporário para verificar por HTTP a raiz API-only, a documentação, o CSS, o OpenAPI e a rota de API.

Na pasta backend:

~~~sh
npm test
npm run test:build
npx tsc --noEmit
node --check public/app.js
~~~

Os testes cobrem o mapeamento da resposta, repositórios privados, README ausente, rate limit, timeout, cache e escolha de imagens.

## 7. Limitações conhecidas da alpha

- A fonte de dados implementada é GitHub; não há adaptadores para outros serviços ainda.
- Cada cartão é montado como um contrato fixo. A coleção precisa pertencer a um único owner.
- A busca da capa examina até 250.000 caracteres do README, no máximo 100 candidatas e até 5.000 entradas da árvore do GitHub. Árvores truncadas geram diagnóstico no log; arquivos além desses limites podem não ser considerados. O README completo continua no JSON do cartão.
- O leitor formata uma parte comum do Markdown; tabelas complexas, conteúdo HTML, imagens internas do README e extensões específicas do GitHub ainda não são renderizados como o GitHub.
- O cache é volátil e por processo; não há persistência, ETag ou cache compartilhado.
- A seleção automática não conhece a intenção visual do autor em todos os casos. Quando não encontra imagem confiável, escolhe uma candidata do repositório ou usa placeholder.

## 8. Próximas implementações sugeridas

1. **Provedores além do GitHub.** Criar adaptadores para GitLab, Gitea/Forgejo e Bitbucket, mantendo o formato de cartão independente do provedor.
2. **README mais fiel.** Renderizar tabelas, imagens relativas e recursos comuns do GitHub com sanitização rigorosa e controles para conteúdo remoto.
3. **Cota e cache de produção.** Usar ETag/If-None-Match, observar cabeçalhos de rate limit e permitir cache compartilhado/persistente em implantação com várias instâncias.
4. **Seleção visual de capa.** Permitir escolher a imagem manualmente e guardar uma preferência por repositório, além da escolha automática.
5. **Configuração da coleta.** Permitir selecionar campos, limites de cards, idioma da documentação e regras de atualização.
6. **Implantação e operação.** Definir hospedagem, ambiente de produção, logs/monitoramento e limites de requisição antes de abrir a API amplamente.
7. **Contrato versionado.** Versionar a resposta pública e publicar exemplos de integração para React, Vue, sites estáticos e clientes sem framework.

A ordem recomendada é primeiro confirmar a alpha com alguns repositórios reais; em seguida abstrair o provedor GitHub, pois isso sustenta a premissa central do OctoCards como ferramenta de coleta extensível.
