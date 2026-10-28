# Grafo de evolução e resultados da auditoria

Data de atualização: 28/10/2026. Fonte: auditoria técnica e grafo de riscos recebidos.

```mermaid
flowchart TD
    A["Auditoria inicial<br/>A01–A13; sem testes executados no relatório"] --> B["Correções por commit"]
    B --> V["A01/A09 · acecc57 + f9d63d7<br/>limites e validação de owner"]
    V --> VT["Testes controller/getRepos<br/>nomes válidos, inválidos e limites"]
    B --> H["A08 · 61f1b4e<br/>createApp separado de listen"]
    H --> HT["Teste HTTP com servidor efêmero<br/>playground e modo API-only"]
    B --> R["A02 · f9622ac<br/>rate limit 12/IP/min"]
    R --> RT["Teste 429/Retry-After<br/>X-Forwarded-For não confiável"]
    B --> C["A03 · 250bd07<br/>pool de 3 por lote"]
    C --> CT["Teste ordem e concorrência<br/>máximo por lote"]
    B --> L["A05 · 5b804ae<br/>log de imagem sanitizado"]
    L --> LT["Teste de fallback<br/>header sensível não logado"]
    B --> P["A06 · 38e43ef<br/>build compilado"]
    P --> PT["Smoke test do artefato<br/>API-only, docs, assets e 400"]
    B --> I["A11 · 14720b8<br/>busca de imagem limitada"]
    I --> IT["Testes de 100 candidatos<br/>5 mil itens e árvore truncada"]
    B --> Q["A07/A10 · cceb564 + 7127a70<br/>licença, CI, CodeQL e Dependabot"]
    Q --> QT["Metadata alinhada<br/>YAML validado; workflow executará no PR"]
    B --> D["ec561ad<br/>relatório e backlog local"]
    D --> G["Este grafo + A14<br/>revalidação 28/10/2026"]

    VT --> U["Resultado atual: 5 suítes<br/>32/32 testes aprovados"]
    HT --> U
    RT --> U
    CT --> U
    LT --> U
    IT --> U
    PT --> U
    QT --> U
    U --> TS["TypeScript: aprovado"]
    U --> BUILD["Build e smoke: aprovados"]
    U --> PROD["npm audit --omit=dev<br/>0 vulnerabilidades"]
    U --> DEV["npm audit completo: 7 low<br/>deepmerge/Jest dev; sem versão corrigida"]
    DEV --> A14["A14 pendente upstream<br/>sem downgrade/override"]
    U --> SEC["Scanner: árvore 0<br/>histórico 0 formato conhecido"]
    SEC --> PLACE["6 matches genéricos README<br/>placeholders; alta entropia 0"]
    SEC --> LOCAL["2 matches em backend/.env local<br/>ignorado; nenhum .env exato rastreado"]
```

## Leituras do grafo

- O relatório de entrada indicava lacunas, mas não havia evidência de testes rodados. As mudanças foram separadas em commits; cada grupo foi associado ao cenário que o protege.
- Revalidação local em 28/10: Jest 5/5 suites e 32/32 testes; typecheck; smoke do build; audit de produção sem vulnerabilidades.
- O audit completo passou a sinalizar 7 vulnerabilidades baixas via deepmerge 4.3.1 na árvore de desenvolvimento do Jest. O advisory GHSA-gcqx-w48m-w2h4/CVE-2026-93753 ainda não lista versão corrigida. O usuário escolheu aguardar upstream; npm audit --force recomenda downgrade do Jest, então não foi aplicado.
- O scanner local encontrou zero padrões de credencial conhecidos na árvore versionável e no histórico alcançável. Os seis matches genéricos do README histórico são placeholders. Dois matches existem somente em backend/.env ignorado; nenhum arquivo .env exato está rastreado. Isso é uma varredura por padrões, não certificação.
- A07/A10: CI/CodeQL/Dependabot estão no branch; os workflows hospedados dependem de push/PR. Secret Scanning/Push Protection precisam de confirmação nas configurações do repositório.


## Estado remoto em 28/10/2026

Issues #8–#14 foram criadas no repositório; os links e o conteúdo detalhado estão em ISSUES_PENDENTES.md. A publicação do branch e a abertura do PR são a próxima etapa após os testes desta atualização.
## Evolução após a abertura do PR #15 — 28/10/2026

```mermaid
flowchart TD
    PR["PR #15 aberto<br/>issues #8–#14 abertas"] --> QL["CodeQL apontou 2 alertas<br/>missing rate limiting em sendFile"]
    QL --> FIX["1c76d33<br/>limite docs/OpenAPI/guia: 120 por minuto"]
    FIX --> T1["Teste HTTP do docs limiter<br/>4/4 aprovados"]
    T1 --> T2["Suíte completa<br/>5 suites, 33/33 aprovados"]
    T2 --> T3["Typecheck e build smoke<br/>aprovados"]
    T3 --> T4["npm audit --omit=dev<br/>0 vulnerabilidades"]
    FIX --> REMOTE["Nova execução CI/CodeQL<br/>pendente nesta captura"]
    PR --> BACK["Backend CI anterior falhou<br/>src/tests/gitCardService.test.ts"]
    BACK --> ZERO["Arquivo na main tem 0 bytes<br/>Jest rejeita suite vazia"]
    ZERO --> WAIT["Aguardar decisão do usuário<br/>nenhuma remoção feita"]
```

O CodeQL apontou duas rotas que enviam arquivos da documentação sem rate limit. O commit 1c76d33 adicionou um limite separado de 120/minuto, compartilhado entre /docs, /swagger.yaml e o guia, com erro DOCS_RATE_LIMITED e Retry-After. O novo teste HTTP verifica o limite entre rotas.

O job backend falhou no checkout público porque backend/src/tests/gitCardService.test.ts tem zero bytes na main e o Jest rejeita uma suite vazia. O worktree já mostrava esse arquivo como removido antes desta correção. Mantive-o fora dos commits e estou aguardando a autorização solicitada antes de remover ou excluir esse teste da descoberta do Jest.

PR: [#15](https://github.com/SamuelBProenca/OctoCards/pull/15). Issues: [#8–#14](https://github.com/SamuelBProenca/OctoCards/issues).

## Revalidacao final do PR #15 - 28/10/2026

```mermaid
flowchart TD
    C1["1c76d33: protecao das rotas docs"] --> Q1["CodeQL merge ainda apontou 2 sendFile"]
    Q1 --> C2["4d34522: limiter anexado diretamente aos handlers GET"]
    C2 --> T["Jest local: 5 suites, 33/33 testes aprovados"]
    C2 --> B["Build + smoke: aprovado"]
    C2 --> S["npm audit producao: 0 vulnerabilidades"]
    C2 --> Q2["CodeQL do PR: aprovado"]
    C2 --> CI["Backend CI: falha por suite antiga vazia"]
    CI --> H["33 testes passam; Jest rejeita 6a suite sem testes"]
    H --> A["Aguardar autorizacao do usuario antes de remover/excluir"]
```

O commit 4d34522 liga o rate limiter explicitamente aos handlers de /swagger.yaml e /GUIA_DO_OCTOCARDS.md. Validacao local: 33/33 testes, build e smoke aprovados; auditoria de producao sem vulnerabilidades. O check CodeQL remoto passou. O check backend permanece falhando porque a main publica inclui backend/src/tests/gitCardService.test.ts vazio; 5 suites passaram e 33 testes passaram, mas Jest falha na sexta suite. Nenhum teste foi apagado ou excluido da descoberta; aguardando a decisao solicitada.
## Resolucao da suite vazia - 28/10/2026

```mermaid
flowchart TD
    AUTH["Usuario autorizou remover o placeholder vazio"] --> DEL["12ab4bc remove arquivo 0 bytes"]
    DEL --> LOCAL["Jest local: 5 suites, 33/33"]
    DEL --> BUILD["Build e smoke de producao: aprovados"]
    DEL --> REMOTE["CI do PR"]
    REMOTE --> TS["Analyze JS/TS: aprovado"]
    REMOTE --> QL["CodeQL: aprovado"]
    REMOTE --> BE["Backend: aprovado"]
    DEL --> KEEP["backend/tests/ local nao rastreado preservado"]
```

Estado final: o placeholder nao continha testes em nenhum commit historico; o arquivo foi adicionado vazio em 26/02/2025. A suite real gitCardService.test.ts permanece em src/services com 12 casos. Apos a remocao aprovada, os testes locais e o build/smoke passaram e os tres checks remotos do PR passaram. A pasta local backend/tests/ continuou fora do commit.