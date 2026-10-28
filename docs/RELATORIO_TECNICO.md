# Relatório técnico — OctoCards

**Data:** 27/10/2026 · **Repositório:** SamuelBProenca/OctoCards (público) · **Branch:** codex/alpha-playground-swagger
**Fonte:** Auditoria_Tecnica_OctoCards.md/.docx e OctoCards_Grafo_de_Riscos.png enviados pelo usuário.
**Base local:** origin/main em 55bc8e8.

## 1. Visão geral

OctoCards é uma API de leitura que coleta dados de repositórios públicos do GitHub e devolve cards JSON. O playground é opcional: a API pode ser usada sem frontend e consumida por interfaces próprias. A interface alfa demonstra consulta, cards, README e cópia do JSON.

Esta rodada corrigiu limites de entrada/processamento, validação de owner, rate limit por IP, concorrência limitada por lote, logs de falhas opcionais, build compilado, smoke test, testes HTTP/headless, CI, CodeQL, Dependabot, limites da busca de imagens e alinhamento da licença.

O resultado é apropriado para uma API alfa de processo único, não uma certificação de segurança nem proteção distribuída. Permanecem decisões sobre orçamento global, falha parcial de lote, privacidade de imagens externas, configurações de segurança no GitHub e sincronização OpenAPI/TypeScript.

## 2. Arquitetura

    cliente HTTP ou playground
      → rate limit → rotas Express → controller/validação
      → pool limitado por lote → serviço/cache
      → GitHub REST API → JSON

Endpoints: GET /api/cards/:repo?owner=... e GET /api/cards?owner=...&repos=repo-a,repo-b. PLAYGROUND_ENABLED=false desativa a interface; API, /docs/ e /swagger.yaml continuam ativos.

## 3. Arquivos e decisões

### Configuração e servidor

- [octoConfig.ts](../backend/src/config/octoConfig.ts) lê OWNER, PORT, TOKEN, GITHUB_TIMEOUT_MS, PLAYGROUND_ENABLED, API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS e TRUSTED_PROXIES. Configuração inválida interrompe a inicialização.
- TOKEN é usado apenas no backend, nunca no browser. O serviço exige confirmação pública mesmo se o token puder acessar repositório privado.
- TRUSTED_PROXIES não confia em X-Forwarded-For por padrão. Só proxies reais devem ser cadastrados para impedir falsificação de IP.
- [app.ts](../backend/src/app.ts) configura CORS, JSON, proxy, rate limit, rotas, docs e frontend. createApp aceita opções para testes; limiter roda antes de chamadas GitHub.
- [index.ts](../backend/src/index.ts) cria app e abre porta. Separar listen da montagem evita efeitos colaterais nos testes. CORS aberto serve à API pública de leitura; autenticação/mutações exigiriam rever isso.
'
### HTTP, validação e batch

- [gitCardRoutes.ts](../backend/src/routes/gitCardRoutes.ts) mapeia endpoints para controllers sem regra de negócio.
- [gitCardController.ts](../backend/src/controllers/gitCardController.ts) valida owner/repos, aplica limites, deduplica preservando ordem e converte erros em status/códigos estáveis.
- Owner: máximo 39 caracteres, alfanuméricos/hífens, sem hífen repetido ou nas pontas. Repo: máximo 100 caracteres e rejeita segmentos . ou ... Batch: até 10 repos e query de 2048 caracteres.
- [octoCardError.ts](../backend/src/types/octoCardError.ts) centraliza códigos/status. Corpo e headers Axios não são encaminhados.
- [getRepos.ts](../backend/src/utils/getRepos.ts) consulta até três repos ao mesmo tempo por batch, preserva ordem e para de agendar após falha. Consultas já iniciadas terminam. O limite é por lote, não global.
- O lote continua atômico: uma falha rejeita tudo para preservar array completo. Resposta parcial exige decidir formato, status e compatibilidade.

### Serviço GitHub, cache e imagens

- [gitCardService.ts](../backend/src/services/gitCardService.ts) usa Axios, URL GitHub fixa, timeout e token opcional. normalizeGithubError traduz 401/403/404, timeout e rate limit sem expor detalhes de transporte.
- fetchRepoInfo exige private === false; estado desconhecido falha fechado. fetchRepoReadme considera ausente só em 404; fetchRepoLanguages lista linguagens. README e linguagens são buscados em paralelo depois de confirmar repositório público.
- Por compatibilidade, description contém README bruto, embora o nome sugira descrição curta. Alterar para readme precisa preservar consumidores.
- Capa vem de Markdown/HTML do README ou da árvore. Banner/cover/header/hero/preview têm prioridade, badges são ignorados. Caminhos relativos/GitHub blob internos viram raw.githubusercontent.com.
- Busca limita README analisado a 250 mil caracteres, 100 candidatos e 5 mil entradas da árvore. tree.truncated gera aviso. README completo continua no JSON; limites protegem descoberta.
- Falha opcional da imagem é logada com status/código sanitizados e usa fallback; rate limit permanece explícito.
- Cache Map local: TTL 5 min, máximo 500 cards, compartilha Promise em andamento. Adequado a uma instância; Redis adicionaria operação sem benefício comprovado. Réplicas não compartilham cache nem rate limit.
- Imagens HTTPS externas podem ser carregadas pelo browser. Backend não faz fetch (não é SSRF do servidor), mas o host da imagem observa conexão/IP do visitante. Política de privacidade/referrer segue pendente.
'
### Tipos, OpenAPI e documentação

- [gitCardType.ts](../backend/src/types/gitCardType.ts) define name, description, principal_languages, stars, forks, url e illustration_image_url.
- [swagger.yaml](../backend/public/swagger.yaml), [docs/index.html](../backend/public/docs/index.html) e [docs.js](../backend/public/docs/docs.js) descrevem a API e exemplos copiáveis.
- Tipo e OpenAPI são mantidos separadamente sem teste de conformidade; versões também divergem. Gerar um pelo outro ou validar fixture no CI reduz drift. Primeiro é preciso decidir a semântica compatível de description/README.
- [GUIA_DO_OCTOCARDS.md](../backend/public/GUIA_DO_OCTOCARDS.md) explica uso local/online/headless; [README.md](../README.md) e [PRODUCT.md](../PRODUCT.md) descrevem projeto/proposta.

### Frontend alfa

- [index.html](../backend/public/index.html) tem formulário, presets, carregamento/erro, cards e alternância JSON.
- [app.js](../backend/public/app.js) consulta API e cria elementos DOM com textContent, sem innerHTML para README; isso reduz risco de XSS. Markdown é um subconjunto e URLs de imagem/link aceitam HTTPS.
- README abre sob demanda; JSON copiável por card ou coleção via Clipboard API/fallback. Número da requisição impede resposta antiga substituir a atual.
- [styles.css](../backend/public/styles.css) implementa identidade responsiva, animações e prefers-reduced-motion. PLAYGROUND_ENABLED=false desativa só o frontend.

### Build, testes e CI

- [package.json](../backend/package.json) separa dev com ts-node/nodemon, build, start compilado, Jest, smoke e script manual. ts-node não é usado no start de produção.
- [tsconfig.build.json](../backend/tsconfig.build.json) compila produção; [copy-public.js](../backend/scripts/copy-public.js) copia assets; [smoke-build.js](../backend/scripts/smoke-build.js) verifica app compilada, headless, docs, CSS, Swagger e erro de entrada.
- Jest cobre config, validação, HTTP, serviço GitHub simulado, rate limit, cache, timeout, imagens e concorrência. Cliente HTTP injetável evita rede/token real.
- [.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml) roda install via lockfile, testes, typecheck, smoke e npm audit produção. [.github/workflows/codeql.yml](../.github/workflows/codeql.yml) analisa JS/TS; [.github/dependabot.yml](../.github/dependabot.yml) agenda updates.
- [LICENSE](../LICENSE) e pacote backend indicam MIT. backend/testOctoCardRepos.ts segue manual com placeholders; está fora do CI pois depende de GitHub/cota.
'
## 4. Situação dos riscos recebidos

| ID | Estado | Resultado |
|---|---|---|
| A01 limites batch/nome | Corrigido | Validação, limites e dedupe testados. |
| A02 rate limit/quota | Parcial | 12/min/IP em memória; falta orçamento global. |
| A03 lote/concorrência | Parcial | 3 por batch; falha atômica; sem limite global. |
| A04 imagem externa | Pendente | Host pode observar IP/conexão visitante. |
| A05 falha da árvore | Corrigido | Log sanitizado; rate limit explícito. |
| A06 build produção | Corrigido | Compilação, assets e smoke. |
| A07 licença | Corrigido | MIT alinhado. |
| A08 teste HTTP/headless | Corrigido | Servidor efêmero e modos. |
| A09 owner permissivo | Corrigido | Regra estrita e testes. |
| A10 CI/security | Parcial | CI/CodeQL/Dependabot; secret scanning não confirmado. |
| A11 busca imagem | Corrigido | Limites e truncamento observados. |
| A12 estrutura/artefatos | Parcial | App separada; script placeholder pendente. |
| A13 contrato duplicado | Pendente | Sem conformidade; description/versões ambíguas. |

## 5. Segurança e testes

TOKEN fica no backend; repositórios não comprovados públicos falham fechados; logs omitem corpo/headers upstream. Varredura final: zero matches na árvore rastreada/não ignorada e zero formatos conhecidos no histórico alcançável. Seis correspondências genéricas no histórico do README eram placeholders; nenhuma teve alta entropia. Duas correspondências de padrão existem apenas no backend/.env local, que está ignorado; nenhum arquivo .env exato está rastreado. A varredura foi repetida após o commit documental e será conferida novamente antes do push. Scanner de padrões não cobre formatos desconhecidos/codificados. Secret Scanning/Push Protection não puderam ser confirmados; administrador deve verificar. Rate limit/cache não são globais.

Verificado em 27/10/2026: npm test -- --runInBand (5 suítes, 32 testes), npx tsc --noEmit, npm run test:build e npm audit (zero vulnerabilidades). GitHub foi simulado; cota/disponibilidade real não é garantida. CI hospedado roda após push/PR.

Referências: [OWASP API4](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/), [Express proxies](https://expressjs.com/en/guide/behind-proxies/), [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/), [GitHub Secret Scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning).

## 6. Commits e reprodução

Commits da auditoria: 3daa341 dependências; acecc57 limites; 61f1b4e app/start; f9622ac rate limit; 250bd07 concorrência; 5b804ae logs; cceb564 licença; 38e43ef build; 14720b8 imagens; 7127a70 CI; f9d63d7 owner. Branch também tem playground alfa, README/imagens, docs, Swagger e headless pedidos antes.

Na pasta backend: npm ci; npm test -- --runInBand; npx tsc --noEmit; npm run test:build. API sem UI: PLAYGROUND_ENABLED=false, npm run build, npm start. TOKEN fica no ambiente servidor.

## 7. Próximos passos

[ISSUES_PENDENTES.md](ISSUES_PENDENTES.md) registra A02/A03/A04/A10/A12/A13/A14. As sete issues remotas foram abertas em 28/10/2026 (#8–#14); o arquivo mantém o backlog detalhado para consulta.

## 8. Revalidação em 28/10/2026

A suíte continua com 5 suites e 32/32 testes aprovados; typecheck e build smoke passaram. npm audit --omit=dev encontrou zero vulnerabilidades. O audit completo encontrou 7 avisos baixos, todos transitivos da árvore de desenvolvimento do Jest via deepmerge 4.3.1.

O advisory [GHSA-gcqx-w48m-w2h4 / CVE-2026-93753](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) marca deepmerge até 4.3.1 como afetado e não lista versão corrigida. A orientação do usuário foi registrar e aguardar upstream. Não foi aplicado override nem o npm audit --force, que propõe downgrade incompatível do Jest.

O [grafo da evolução](GRAFO_EVOLUCAO_AUDITORIA.md) registra esta rodada, os testes, a varredura de padrões e os itens ainda pendentes.
## 9. Resultado do PR e correção CodeQL em 28/10/2026

O PR [#15](https://github.com/SamuelBProenca/OctoCards/pull/15) reúne a auditoria e as entregas alfa. Issues #8–#14 estão abertas.

CodeQL apontou duas rotas de envio de arquivos da documentação sem rate limit. O commit 1c76d33 adicionou limite separado de 120/minuto, com teste HTTP de 429/Retry-After. Após essa mudança: 5 suítes, 33/33 testes; typecheck, build smoke e npm audit --omit=dev aprovados. A nova execução remota do workflow ainda estava pendente na última consulta.

O job backend remoto falhou ao descobrir a suite vazia backend/src/tests/gitCardService.test.ts, que tem 0 bytes na main. Ela já estava removida no worktree antes destas alterações e não foi incluída em commit. O usuário pediu confirmação antes de apagar testes antigos; a remoção continua pendente de autorização, portanto o CI backend ainda precisa desse encaminhamento.

## 10. Revalidacao final do PR #15 - 28/10/2026

O commit 4d34522 anexa o rate limiter diretamente aos handlers GET de /swagger.yaml e /GUIA_DO_OCTOCARDS.md. O teste HTTP cobre sucesso nas paginas documentais e resposta 429 com Retry-After ao exceder o limite compartilhado.

Validacao apos a alteracao: Jest local com 5 suites e 33/33 testes aprovados; npm run test:build aprovou compilacao e smoke de producao; npm audit --omit=dev encontrou zero vulnerabilidades. O check remoto CodeQL do PR passou. A verificacao de padroes sensiveis encontrou zero matches de formatos conhecidos, zero atribuicoes genericas candidatas e zero arquivos .env rastreados.

O check remoto backend continua falhando na descoberta da suite backend/src/tests/gitCardService.test.ts, vazia na main publica. O log confirma 5 suites e 33 testes aprovados, mas Jest retorna erro porque a sexta suite nao tem teste. Esse arquivo ja estava removido no worktree antes desta etapa; nenhum teste foi removido ou ocultado por esta alteracao. Aguardo autorizacao do usuario antes de decidir como tratar o artefato legado. A pasta backend/tests/ que ja estava nao rastreada tambem foi preservada.

O audit completo de desenvolvimento ainda registra 7 alertas baixos pela cadeia Jest/deepmerge 4.3.1, sem versao corrigida publicada; por decisao do usuario, aguardamos upstream sem override ou downgrade. O audit de producao segue zerado.
## 12. Progresso A02 / issue #8 - 28/10/2026

O commit local b254383 adicionou um orcamento de saida em memoria por processo, configuravel com GITHUB_API_REQUEST_BUDGET_PER_HOUR, com 429/Retry-After e testes. Ele foi mantido localmente e nao integra o PR #15 merged. A escolha do usuario foi implementar uma store compartilhada; esta etapa por processo sera substituida pela reserva atomica compartilhada.
## 13. Store compartilhada e credencial por requisicao - 28/10/2026

O orcamento de saida pode usar Redis com script atomico de janela movel; as replicas compartilham a mesma chave de instalacao, que guarda timestamps e identificadores aleatorios, sem credenciais. Em NODE_ENV=production o modo de store padrao e redis e exige REDIS_URL; em desenvolvimento/testes, memory permanece disponivel. Redis indisponivel resulta em 503 e falha fechada. Orçamento esgotado resulta em 429/Retry-After.

GITHUB_AUTH_MODE tem os modos request (padrao, Bearer opcional por requisicao, sem fallback para TOKEN), server (TOKEN local do operador, para auto-hospedagem) e anonymous. Credenciais por requisicao nao entram no cache compartilhado; os repositorios privados continuam rejeitados. O smoke test define TOKEN vazio, auth anonymous e store memory. Testes usam credenciais ficticias/clientes mockados, sem GitHub real.

A suite, typecheck e build/smoke foram validados localmente; Redis real nao estava disponivel neste ambiente (sem redis-server/Docker), entao a semantica entre replicas foi simulada por adapters sobre um backend fake. A issue #8 deve permanecer aberta ate o smoke com Redis real no deploy e a configuracao operacional compartilhada.
## 14. Redis compartilhado, autenticacao BYOT e validacao - 28/10/2026

O backend agora pode reservar chamadas externas ao GitHub em Redis por uma janela movel atomica. Em producao, Redis e o padrao e REDIS_URL e obrigatoria; em desenvolvimento e testes, a store memory continua disponivel. A chave Redis contem somente timestamps e IDs aleatorios. Falta validar com Redis real no ambiente de deploy, por isso a issue #8 segue aberta.

GITHUB_AUTH_MODE=request e o padrao: aceita Authorization: Bearer opcional por requisicao e nao usa TOKEN do processo como fallback. server e opt-in para operacao propria; anonymous rejeita Authorization. Credenciais do consumidor nao entram em logs, cache, chave Redis ou resposta, mas passam temporariamente pela memoria do servidor; consumidores devem usar HTTPS e confiar no host. A OpenAPI e o guia documentam os modos e o 503 fail-closed.

Validacao final: Jest 7 suites / 53 testes aprovados; TypeScript noEmit aprovado; build + smoke aprovado; npm audit --omit=dev com zero vulnerabilidades. O audit completo reporta 7 avisos baixos transitivos de Jest/deepmerge 4.3.1; conforme decisao do usuario, aguardar correcao upstream sem downgrade forcado. Varredura da arvore rastreada: 32 arquivos, zero padroes conhecidos de tokens/chaves e zero arquivos .env rastreados. backend/.env esta ignorado; seus valores nao foram exibidos nem modificados. Nao foi feita consulta real ao GitHub durante testes.