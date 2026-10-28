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