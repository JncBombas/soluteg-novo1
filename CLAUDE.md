# CLAUDE.md — Contexto para IAs de Codificação

> Este arquivo é lido por IAs (Claude Code, Antigravity, Cursor, etc) ao iniciar sessão neste projeto.
> Contém o contexto mínimo para a IA agir corretamente sem fazer suposições erradas.

---

## ⚡ O que você precisa saber em 60 segundos

- **Projeto:** Soluteg — sistema de gestão para empresas de serviços técnicos. Hoje em produção para a JNC Elétrica; sendo transformado em SaaS multi-tenant.
- **Stack:** React 19 + TypeScript + Vite (frontend), Node.js + Express + tRPC + Drizzle ORM (backend), MySQL 8.
- **Estado atual:** branch `multi-tenant` em andamento, Sub-fase 3.7.1b recém concluída (15/05/2026). Aguardando 3.7.1c.
- **Time:** 1 desenvolvedor (Thiago), 3h/dia. Filosofia: simplicidade testada > novidades brilhantes.

---

## 📖 Leituras obrigatórias antes de codar

1. [`ARCHITECTURE_HANDOFF.md`](./ARCHITECTURE_HANDOFF.md) — visão completa (escolha as seções relevantes à tarefa)
2. [`ROADMAP.md`](./ROADMAP.md) — onde estamos agora
3. [`docs/PROTOCOLO.md`](./docs/PROTOCOLO.md) — **obrigatório** se a tarefa envolve tRPC, auth, queries ou endpoints

Para tarefas específicas:
- Deploy → [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- Alarmes/sensores → [`docs/ALARMS.md`](./docs/ALARMS.md)
- Operações em banco → [`docs/DATA_PROTECTION.md`](./docs/DATA_PROTECTION.md)
- Replicar mudança em produção → [`PENDENCIAS_DEPLOY_PRODUCAO.md`](./PENDENCIAS_DEPLOY_PRODUCAO.md)

---

## 🚦 Regras invioláveis

### 1. Branches

- **Multi-tenant** (refactor) → branch `multi-tenant`
- **Bugfix em produção** → branch `fix/*` baseada em `master` (NUNCA na `multi-tenant`)
- Não misture contextos. Antes de codar, rode `git branch --show-current` e confirme.

### 2. Segurança em tRPC

- `publicProcedure` é PROIBIDO para qualquer endpoint que toque dados de usuário
- IDs SEMPRE vêm do `ctx.adminId` / `ctx.clientId` / `ctx.technicianId`, NUNCA do input
- Detalhes em [`docs/PROTOCOLO.md`](./docs/PROTOCOLO.md) seção 1

### 3. Banco de dados

- NUNCA `DROP TABLE` em `clients`, `clientDocuments`, `admins`, `invites`
- Migrations sempre aditivas e reversíveis quando possível
- Veja [`docs/DATA_PROTECTION.md`](./docs/DATA_PROTECTION.md)

### 4. Ambientes

- Banco produção: `d5ea2e96_solutegdb` (user `d5ea2e96_soluteg`)
- Banco staging: `d5ea2e96_tst` (user `d5ea2e96_id_rsa`)
- Helper `server/lib/environment.ts` aborta scripts se rodar no banco errado
- Trabalho de multi-tenant sempre em staging primeiro

### 5. Migrations Drizzle

- O arquivo gerado pelo Drizzle Kit contém marcadores `--> statement-breakpoint` que NÃO são SQL válido
- Para aplicar via `mysql` CLI, filtrar com `grep -v "statement-breakpoint"`
- Quando aplicado via pipe, multi-statements (FK, INDEX após CREATE) podem ser ignorados — sempre validar `information_schema` após aplicar
- Detalhes em [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)

---

## 📝 Convenções

### Commits

Padrão `conventional commits`:
```
feat(escopo): mensagem
fix(escopo): mensagem
chore(escopo): mensagem
docs(escopo): mensagem
```

Para sub-fases do multi-tenant, use o escopo no formato `multi-tenant/X.Y.Za`:
```
feat(multi-tenant/3.7.1b): mensagem
```

### Comentários

- Em **português** (o projeto é brasileiro)
- Documentos devem ser legíveis por leigo
- Em PRs ou docs novos, inclua propósito, decisões tomadas e trade-offs

### Idioma

- Código: variáveis em inglês (convenção)
- Comentários, docs e mensagens de commit: português

---

## 🎯 Como interagir bem com Thiago

- Ele prefere **diagnóstico antes de solução**. Não chute, investigue primeiro.
- Ele valoriza **explicações honestas dos trade-offs**, não apenas a solução.
- Ele tem 3h/dia — proponha planos com **complexidade calibrada** e divida em etapas pequenas.
- Quando algo der errado, ele quer entender **a causa raiz**, não só a correção.
- Segurança é **prioridade absoluta** — quando em dúvida, prefira o caminho mais conservador.

---

## 📋 Ao final de cada sub-fase

Atualize, em ordem:

1. [`ROADMAP.md`](./ROADMAP.md) — marca a sub-fase como concluída
2. [`ARCHITECTURE_HANDOFF.md`](./ARCHITECTURE_HANDOFF.md) — seção 8 (O que foi feito)
3. [`PENDENCIAS_DEPLOY_PRODUCAO.md`](./PENDENCIAS_DEPLOY_PRODUCAO.md) — se houver coisa nova para replicar em produção
4. Commit único e push

---

**Última atualização deste arquivo:** 15/05/2026
