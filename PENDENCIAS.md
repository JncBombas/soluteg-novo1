# Pendências e Sugestões — Soluteg / JNC Elétrica

> Arquivo vivo: atualizado pela IA a cada sessão.
> Todo item resolvido deve ser marcado com ✅ e a data de resolução.
> Itens novos identificados durante o desenvolvimento são adicionados aqui imediatamente.

---

## 🔴 Crítico — Resolver com urgência

Estas vulnerabilidades representam riscos reais de segurança em produção.

### [CRIT-01] Endpoints REST sem autenticação — `server/index.ts`
**Risco:** Acesso não autorizado a dados sensíveis e operações destrutivas  
**Impacto:** Qualquer pessoa na internet pode executar essas ações

| Rota | Problema |
|---|---|
| `GET /api/work-orders/:id` | Sem auth — BOLA completo, qualquer OS acessível por ID |
| `DELETE /api/client-documents/:id` | Sem auth — qualquer documento pode ser deletado |
| `GET /api/client-documents?clientId=X` | Aceita clientId da query string sem validar identidade |
| `POST /api/water-tank-monitoring` | Aceita clientId/adminId do body — dados falsos podem ser inseridos |
| `POST /api/work-orders` | Cria OS em nome de qualquer cliente sem autenticação |
| `POST /api/admin/laudos/cleanup-cloudinary` | Rota de manutenção sem auth — deleção em massa no Cloudinary |
| `POST /api/laudos/upload-anotada` | Upload sem auth — abuso de storage Cloudinary (custo) |
| `POST /api/laudos/delete-cloudinary` | Sem auth — qualquer arquivo Cloudinary pode ser deletado |

**Correção:** Adicionar middleware de autenticação (`requireAdminAuth` ou equivalente) em cada uma dessas rotas antes do handler.

---

### [CRIT-02] `budgets.approve` e `budgets.create` como `publicProcedure`
**Arquivo:** `server/routers/budgets.router.ts`  
**Risco:** Qualquer pessoa pode criar orçamentos e aprovar/gerar OS sem estar autenticada  
**Correção:**
- `budgets.create` → `adminLocalProcedure` (usar `ctx.adminId`)
- `budgets.approve` → verificar se quem aprova é o token do cliente (`getByToken`) ou admin autenticado — nunca aceitar `id: z.number()` em `publicProcedure`

---

### [CRIT-03] Múltiplos endpoints de orçamento como `publicProcedure` com ID sequencial
**Arquivo:** `server/routers/budgets.router.ts`  
**Risco:** Vazamento de dados de clientes, valores e serviços; operações destrutivas sem auth

| Procedure | Problema |
|---|---|
| `budgets.getItems` | `publicProcedure` + `budgetId: z.number()` — lista itens de qualquer orçamento |
| `budgets.exportPDF` | `publicProcedure` + `id: z.number()` — baixa PDF de qualquer orçamento |
| `budgets.reject` | `publicProcedure` + `id: z.number()` — rejeita qualquer orçamento |
| `budgets.getForPortal` | `publicProcedure` + `clientId: z.number()` — BOLA, lista orçamentos de qualquer cliente |

**Correção:** Migrar para `adminLocalProcedure` (getItems, exportPDF, reject) e `protectedClientProcedure` (getForPortal com `ctx.clientId`).

---

### [CRIT-04] Router `checklists` inteiro como `publicProcedure`
**Arquivo:** `server/routers/checklists.router.ts`  
**Risco:** Qualquer pessoa pode criar, modificar, concluir e deletar checklists e tarefas de inspeção de qualquer OS

Afeta: `inspectionTasks.create`, `updateStatus`, `complete`, `delete`, `instances.create`, `updateResponses`, `update`, `delete`

**Correção:** Todos os procedures → `adminLocalProcedure`

---

### [CRIT-05] `adminId` lido do input em vez de `ctx` em múltiplos routers
**Risco:** Admin A pode acessar e modificar dados do Admin B passando o ID errado

| Arquivo | Procedure | Problema |
|---|---|---|
| `clients.router.ts` | `clients.list` | Filtra clientes pelo `input.adminId` |
| `clients.router.ts` | `clients.create` | Vincula cliente ao `input.adminId` |
| `clients.router.ts` | `broadcastMessage` | Usa `input.adminId` para contexto do envio |
| `adminDocuments.router.ts` | `list` | Lista documentos do `input.adminId` |

**Correção:** Remover `adminId` do input e usar `ctx.adminId` em todos esses procedures.

---

### [CRIT-06] `resetPassword` hardcoded no adminId = 1
**Arquivo:** `server/routers/adminAuth.router.ts`, linha ~130  
**Risco:** Qualquer pessoa pode redefinir a senha do admin principal enviando qualquer token  
**Detalhe:** O código faz `db.updateAdminPassword(1, hashedPassword)` ignorando o token completamente — não valida se o token existe nem a qual admin pertence  
**Correção:** Buscar o admin pelo token no banco (`WHERE resetToken = ? AND resetTokenExpiresAt > NOW()`), validar que o token é válido e expirou, depois usar o ID encontrado (não hardcoded).

---

### [CRIT-07] `clientProfile.uploadPhoto` sem autenticação, com `clientId` do input
**Arquivo:** `server/routers/clientProfile.router.ts`  
**Risco:** Qualquer pessoa pode sobrescrever a foto de qualquer cliente sabendo o ID  
**Correção:** `protectedClientProcedure` (remover `clientId` do input, usar `ctx.clientId`)

---

## 🟡 Média Prioridade

### [MED-01] Senha legacy em texto puro ainda suportada
**Arquivo:** `server/adminAuth.ts`, linha ~179  
**Detalhe:** Fallback `password === admin.password` para contas antigas sem bcrypt  
**Correção:** Forçar migração de todos os admins para bcrypt; remover o fallback após confirmar que nenhuma conta usa senha em texto puro.

### [MED-02] `documents.getById` como `publicProcedure` com ID sequencial
**Arquivo:** `server/routers/documents.router.ts`  
**Correção:** `protectedClientProcedure` com verificação que o documento pertence ao `ctx.clientId`, ou `adminLocalProcedure`.

### [MED-03] `adminAuth.requestReset` vaza existência de e-mail (user enumeration)
**Arquivo:** `server/routers/adminAuth.router.ts`  
**Correção:** Retornar sempre resposta genérica: "Se o e-mail estiver cadastrado, você receberá o link."

### [MED-04] `changedBy` e `changedByType` vêm do input do frontend
**Arquivos:** `budgets.router.ts` e `workOrders.router.ts`  
**Detalhe:** O campo de auditoria (quem fez a mudança) pode ser falsificado pelo frontend  
**Correção:** Construir `changedBy` a partir de `ctx.adminId` no servidor.

### [MED-05] `laudos.citacoesTecnico.update` e `.remove` sem ownership check
**Arquivo:** `server/routers/laudos.router.ts`  
**Detalhe:** Técnico pode modificar citações de laudos de outros técnicos se souber o ID  
**Correção:** Verificar que a citação pertence a um laudo ao qual `ctx.technicianId` tem acesso.

### [MED-06] Upload REST sem whitelist de MIME type
**Arquivo:** `server/index.ts` — endpoint `POST /api/work-orders/upload`  
**Detalhe:** Aceita qualquer MIME type; SVGs com JS embutido podem causar XSS  
**Correção:** Whitelist: `["image/jpeg", "image/png", "image/webp", "application/pdf"]`

### [MED-07] `cloudinaryService.ts` com placeholders de credenciais
**Arquivo:** `server/cloudinaryService.ts`  
**Detalhe:** Arquivo não usado em produção, mas pode induzir dev a colocar credenciais reais  
**Correção:** Remover o arquivo ou refatorar para usar variáveis de ambiente.

---

## 🔵 Sugestões de Melhoria

### [S01] Rate limiting nos endpoints de login
**Arquivos:** `server/index.ts` (`/api/client-login`, `/api/technician-login`), `adminAuth.router.ts`  
**Sugestão:** `express-rate-limit` — 10 tentativas por IP em janela de 15 minutos

### [S02] Limite no `importBatch` do PDV
**Arquivo:** `server/routers/pdv.router.ts`  
**Sugestão:** `z.array(...).max(500)` para evitar DoS por array gigante

### [S03] Limite em `workOrders.exportBatch`
**Arquivo:** `server/routers/workOrders.router.ts`  
**Sugestão:** `z.array(z.number()).max(50)` — exportar centenas de PDFs de uma vez sobrecarrega servidor

### [S04] `getAllSales()` carrega tudo na memória
**Arquivo:** `server/routers/pdv.router.ts` — `sales.getWithFilters`  
**Detalhe:** Filtra em JavaScript ao invés de filtrar na query SQL — não escala com volume alto  
**Sugestão:** Mover filtros de data para `getSalesByDateRange` com `WHERE` no SQL

### [S05] `Math.random()` para senha de cliente
**Arquivo:** `server/routers/clients.router.ts`  
**Sugestão:** Substituir por `crypto.randomBytes(16).toString('hex')` — mais seguro criptograficamente

### [S06] Verificar configuração CORS em produção
**Arquivo:** `server/index.ts`  
**Sugestão:** Confirmar que `origin` não está configurado como `'*'` em produção

### [S07] Limite de tamanho em `anotacoesJson`
**Arquivo:** `server/routers/laudos.router.ts`  
**Detalhe:** Aceita até 200.000 caracteres por foto — pode impactar performance  
**Sugestão:** Comprimir JSON antes de salvar, ou reduzir limite com compressão no frontend

---

## ✅ Resolvido

| Data | Item | O que foi feito |
|---|---|---|
| 2026-05-01 | CRIT-06 | `resetPassword` corrigido: valida token via Map em memória, atualiza o admin correto |
| 2026-05-01 | CRIT-04 | Router `checklists` inteiro migrado para `adminLocalProcedure` |
| 2026-05-01 | CRIT-02 | `budgets.create` → `adminLocalProcedure` com `ctx.adminId` |
| 2026-05-01 | CRIT-02 | `budgets.approve` e `budgets.reject` aceitam token opaco em vez de ID sequencial |
| 2026-05-01 | CRIT-03 | `budgets.getItems` e `exportPDF` → `adminLocalProcedure`; variantes `ByToken` adicionadas para uso público |
| 2026-05-01 | CRIT-03 | `budgets.getForPortal` → `protectedClientProcedure` com `ctx.clientId` |
| 2026-05-01 | CRIT-05 | `clients.list`, `.create`, `.broadcastMessage`, `adminDocuments.list` passam a usar `ctx.adminId` |
| 2026-05-01 | CRIT-07 | `clientProfile.uploadPhoto` → `adminLocalProcedure`; novo `uploadMyPhoto` → `protectedClientProcedure` |
| 2026-05-01 | MED-03 | `requestReset` retorna mensagem genérica (anti user-enumeration) |
| 2026-05-01 | S05 | `crypto.randomBytes()` substitui `Math.random()` na geração de senhas de clientes |

---

## 📌 Dívida Técnica (não urgente)

- **App mobile (`mobile/`):** Funcionalidades do portal do técnico existentes no web ainda não portadas para o mobile (checklists, laudos)
- **Landing page Astro:** `jnc.soluteg.com.br` reservado mas projeto ainda não criado
- **`inspectionReports` e `reports`:** Duas tabelas com propósitos sobrepostos — consolidar em uma futura refatoração
- **Migration de orçamentos:** `migration-budget-attachments.sql` foi criada — confirmar se foi rodada em produção
