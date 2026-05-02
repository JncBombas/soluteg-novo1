# Pendências e Sugestões — Soluteg / JNC Elétrica

> Arquivo vivo — atualizado pela IA a cada sessão.
> Itens resolvidos vão para a seção ✅ com data. Novos itens entram imediatamente ao serem identificados.

---

## 🔴 Crítico — Resolver antes de qualquer nova feature

> Nenhum item crítico em aberto. Todos os CRITs (01 a 07) foram resolvidos em 2026-05-01.

---

## 🟡 Média Prioridade

### [MED-02] `documents.getById` público com ID sequencial — `server/routers/documents.router.ts`
Qualquer pessoa acessa qualquer documento (contratos, NFs) por ID numérico.  
**Correção:** `protectedClientProcedure` com verificação de ownership, ou `adminLocalProcedure`.

### [MED-05] `citacoesTecnico.update` e `.remove` sem ownership check — `server/routers/laudos.router.ts`
Técnico pode alterar citações de laudos de outros técnicos se souber o ID.  
**Correção:** Verificar que a citação pertence a um laudo acessível pelo `ctx.technicianId`.

### [MED-06] Upload REST sem whitelist de MIME type — `server/index.ts` (`POST /api/work-orders/upload`)
Aceita qualquer tipo de arquivo. SVGs com JavaScript embutido podem causar XSS.  
**Correção:** Whitelist: `["image/jpeg", "image/png", "image/webp", "application/pdf"]`

### [MED-07] `server/cloudinaryService.ts` com placeholders de credenciais
Arquivo não usado em produção, mas com strings como `'sua_api_key'` que podem induzir erros.  
**Correção:** Remover o arquivo (o sistema usa `server/storage.ts` com variáveis de ambiente).

---

## 🔵 Sugestões de Melhoria

| ID | Onde | O que fazer |
|---|---|---|
| S01 | `/api/client-login`, `/api/technician-login`, `adminAuth.login` | Rate limiting — `express-rate-limit` com 10 tentativas/15 min por IP |
| S02 | `pdv.router.ts` — `importBatch` | `z.array(...).max(500)` para evitar DoS por array gigante |
| S03 | `workOrders.router.ts` — `exportBatch` | `z.array(z.number()).max(50)` — exportar centenas de PDFs sobrecarrega o servidor |
| S04 | `pdv.router.ts` — `sales.getWithFilters` | Mover filtros de data para SQL (`WHERE`) — atualmente filtra tudo em memória JS |
| S06 | `server/index.ts` | Verificar configuração CORS em produção — confirmar que `origin` não é `'*'` |
| S07 | `laudos.router.ts` — `anotacoesJson` | Limite de 200.000 chars por foto pode impactar performance — considerar compressão |

---

## 📌 Dívida Técnica (não urgente)

### Erros TypeScript pré-existentes (não travam o build do Vite, mas poluem o IDE)

> Estes erros estavam ocultos atrás de uma cascata causada pelo caminho errado em `src/lib/trpc.ts`.
> Foram revelados em 2026-05-02 ao corrigir o caminho. Não afetam o funcionamento em produção.

| Arquivo | Linha | Erro | Correção |
|---|---|---|---|
| Vários (`AdminClients`, `AdminMassMessage`, `AdminWaterTanks`, `AdminWaterTankDashboard`, `EditClient`) | múltiplas | `.isLoading` não existe — tRPC v11 renomeou para `.isPending` | Substituir `.isLoading` por `.isPending` em todas as mutations |
| `src/App.tsx` | 29 | `Cannot find module './pages/AdminViewWorkOrder'` | Verificar se o arquivo foi deletado ou renomeado |
| `src/pages/AdminLaudoForm.tsx` | 534, 708 | Tipo `Constatacao[]` incompatível | Alinhar tipo do estado com o tipo Zod do input |
| `src/pages/TecnicoLaudoForm.tsx` | 616 | Mesmo que acima | Mesma correção |
| `src/pages/AdminWorkOrders.tsx` | 64, 163 | Enum de tipo/prioridade desatualizado | Alinhar com os enums do `workOrders.router.ts` |
| `src/pages/BudgetApproval.tsx` | 62 | `res` implicitly has `any` type | Tipar o parâmetro do callback |
| `src/pages/WaterTankMonitoring.tsx` | 356 | `Date` vs `string` no array de alertas | Converter `sentAt` para string ou ajustar o tipo |
| `server/pdfGenerator.ts` | 424, 590, 591, 679, 984 | Iteração de Set + type errors | Corrigir com `Array.from()` e null checks |
| `server/pdfLaudo.ts` | 295 | `fontSize` não existe em `TextOptions` | Verificar API da lib PDF usada |
| `server/waterTankAlertService.ts` | 84, 105 | Function em bloco strict + null check | Mover função para fora do bloco; adicionar null check |
| `server/whatsapp.ts` | múltiplas | Parâmetros `any` implícitos | Adicionar tipos nos callbacks |
| `server/cloudinaryService.ts` | 2 | Types de `streamifier` ausentes | `npm i -D @types/streamifier` |
| `server/pdvBarcodeService.ts` | 26 | Types de `bwip-js` ausentes | `npm i -D @types/bwip-js` ou `declare module 'bwip-js'` |

- **App mobile:** Checklists e laudos do portal do técnico ainda não portados para o app mobile (`mobile/`)
- **Landing page Astro:** `jnc.soluteg.com.br` reservado mas o projeto Astro ainda não foi criado
- **Tabelas duplicadas:** `inspectionReports` e `reports` têm propósitos sobrepostos — consolidar futuramente
- **Migration pendente:** `migration-budget-attachments.sql` foi criada — confirmar se foi rodada em produção

---

## ✅ Resolvido

| Data | Item | O que foi feito |
|---|---|---|
| 2026-05-01 | CRIT-06 | `resetPassword` corrigido — valida token (Map em memória), atualiza o admin correto (não mais ID 1 fixo) |
| 2026-05-01 | CRIT-04 | Router `checklists` inteiro migrado de `publicProcedure` → `adminLocalProcedure` |
| 2026-05-01 | CRIT-02 | `budgets.create` → `adminLocalProcedure` com `ctx.adminId`; approve/reject aceitam token opaco |
| 2026-05-01 | CRIT-03 | `budgets.getItems` e `exportPDF` → `adminLocalProcedure`; variantes `ByToken` para acesso público |
| 2026-05-01 | CRIT-03 | `budgets.getForPortal` → `protectedClientProcedure` com `ctx.clientId` |
| 2026-05-01 | CRIT-05 | `clients.list`, `.create`, `.broadcastMessage`, `adminDocuments.list` — `adminId` removido do input, usa `ctx.adminId` |
| 2026-05-01 | CRIT-07 | `clientProfile.uploadPhoto` → `adminLocalProcedure`; novo `uploadMyPhoto` → `protectedClientProcedure` |
| 2026-05-01 | MED-01 | Fallback de senha em texto puro removido de `authenticateAdmin`; admins legados devem redefinir senha |
| 2026-05-01 | MED-04 | `changedBy`/`changedByType` agora derivados de `ctx.adminId` em `workOrders.updateStatus` e `budgets.update`; `budgets.rejectByAdmin` criado para admin reprovar por ID |
| 2026-05-01 | MED-03 | `requestReset` retorna mensagem genérica (não revela se e-mail existe) |
| 2026-05-01 | S05 | `crypto.randomBytes()` substitui `Math.random()` na geração de senhas de clientes |
| 2026-05-01 | CRIT-01 | 8 endpoints REST protegidos com `requireAdminAuth`, `requireClientAuth` ou `requireAdminOrTechAuth`; clientId agora vem do JWT nos endpoints do cliente |
