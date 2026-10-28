# Backlog local — OctoCards

Itens derivados da Auditoria_Tecnica_OctoCards e do OctoCards_Grafo_de_Riscos recebidos. Não inserir tokens, credenciais ou dados privados em issues/logs.

Issues remotas abertas em 28/10/2026: #8–#14. Este arquivo mantém o backlog local com contexto, decisão técnica e critérios de aceite.

## [P1] Orçamento compartilhado GitHub — A02
Implementado store Redis atomico com janela movel, compartilhado por todas as replicas configuradas na mesma URL e chave. Production usa Redis por padrao e exige REDIS_URL; desenvolvimento local pode usar memoria. Reserva retornada como 429/Retry-After; falha da store responde 503. O modo BYOT request nao carrega TOKEN do servidor; a chave Redis e estatica e nao inclui credencial.
**Aceite:** orcamento e modos de auth documentados; testes simulam replicas compartilhando o mesmo backend atomico. Validar com Redis real no ambiente de deploy antes de fechar issue #8.

## [P1] Privacidade de imagens externas — A04
HTTPS de terceiros pode revelar IP/conexão do visitante. O backend não faz fetch, então não é SSRF de servidor.
**Trabalho:** decidir carregamento direto com política referrer, allowlist ou proxy protegido contra SSRF, redirects, IP privado, tamanho e MIME.
**Aceite:** política e testes HTTPS/HTTP/protocol-relative/redirect; README continua DOM seguro.

## [P1] Secret Scanning/Push Protection — A10
Varredura anterior não achou padrão reconhecível no histórico; configuração GitHub não confirmada.
**Trabalho:** administrador verificar/habilitar opções e tratar alertas; rotacionar credenciais sem registrar valor.
**Aceite:** estado e alertas registrados como resolvidos.

## [P2] Contrato TypeScript/OpenAPI — A13
PropsGitCard e Swagger duplicam contrato; description contém README bruto e versões divergem.
**Trabalho:** definir semântica compatível, alinhar versões e gerar tipos/schema ou validar fixture no CI.
**Aceite:** campos documentados e CI detecta drift.

## [P2] Falha/limite global de lote — A03
Até três chamadas por lote; qualquer falha rejeita tudo; limite não cobre outros lotes.
**Trabalho:** decidir atomicidade versus parcialidade e necessidade de semáforo/backpressure global.
**Aceite:** decisão documentada; parcialidade versionada/testada se adotada; limite global testado se necessário.

## [P3] Script manual placeholder — A12
backend/testOctoCardRepos.ts usa nomes placeholder apesar de Jest cobrir cenários sem rede.
**Trabalho:** confirmar consumidor; remover ou documentar parâmetros/uso.
**Aceite:** propósito definido; CI independente de GitHub/token.

## Corrigidos
A01 limites; A05 logs; A06 build; A07 licença; A08 HTTP/headless; A09 owner; A11 imagens. A02/A03/A10/A12 permanecem parciais.

## [P2] Acompanhar advisory sem versão corrigida de deepmerge — achado novo 28/10

O audit completo sinalizou 7 vulnerabilidades baixas através de deepmerge 4.3.1, dependência transitiva de desenvolvimento do Jest. npm audit --omit=dev reporta zero vulnerabilidades. O advisory oficial ainda não lista versão corrigida.

**Decisão atual:** usuário escolheu aguardar upstream; não aplicar override nem downgrade forçado do Jest.

**Aceite:** atualizar dependências quando existir versão corrigida; executar audit completo, audit de produção, testes, typecheck e build; fechar o item somente com o advisory resolvido.
## Links para as issues remotas

- [#8 Orçamento compartilhado GitHub](https://github.com/SamuelBProenca/OctoCards/issues/8)
- [#9 Semântica e limite global de lotes](https://github.com/SamuelBProenca/OctoCards/issues/9)
- [#10 Privacidade de imagens externas](https://github.com/SamuelBProenca/OctoCards/issues/10)
- [#11 Secret Scanning e Push Protection](https://github.com/SamuelBProenca/OctoCards/issues/11)
- [#12 Contrato TypeScript/OpenAPI](https://github.com/SamuelBProenca/OctoCards/issues/12)
- [#13 Script manual placeholder](https://github.com/SamuelBProenca/OctoCards/issues/13)
- [#14 Advisory deepmerge sem correção](https://github.com/SamuelBProenca/OctoCards/issues/14)
Atualizacao 28/10/2026: implementada store Redis atomica compartilhada com 429/Retry-After e 503 fail-closed. Testes locais aprovados (53/53), typecheck e build/smoke aprovados; simulacao com dois adapters usa backend fake. Manter esta issue aberta ate validar conexao, URL/chave comum e comportamento de reinicio no ambiente de deploy com Redis real.