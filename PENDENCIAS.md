# Pendências e Sugestões — Soluteg / JNC Elétrica

> Arquivo vivo — atualizado pela IA a cada sessão.
> Itens resolvidos vão para a seção ✅ com data. Novos itens entram imediatamente ao serem identificados.

---

## 🔴 Crítico — Resolver antes de qualquer nova feature

### [CRIT-01] 8 endpoints REST sem autenticação — `server/index.ts`

Qualquer pessoa na internet consegue executar as ações abaixo sem estar logada.

| Rota | Risco |
|---|---|
| `GET /api/work-orders/:id` | Lê qualquer OS por ID — BOLA completo |
| `DELETE /api/client-documents/:id` | Deleta qualquer documento de qualquer cliente |
| `GET /api/client-documents?clientId=X` | Lista documentos de qualquer cliente |
| `POST /api/water-tank-monitoring` | Insere leituras falsas de sensor (clientId/adminId do body) |
| `POST /api/work-orders` | Cria OS em nome de qualquer cliente |
| `POST /api/admin/laudos/cleanup-cloudinary` | Deleta arquivos em massa do Cloudinary |
| `POST /api/laudos/upload-anotada` | Upload gratuito no Cloudinary (abuso de storage) |
| `POST /api/laudos/delete-cloudinary` | Deleta qualquer arquivo do Cloudinary por URL |

**Como corrigir:** Adicionar `requireAdminAuth` antes do handler em cada rota.

---

## 🟡 Média Prioridade

### [MED-01] Senha em texto puro ainda aceita como fallback — `server/adminAuth.ts` ~linha 179
Contas criadas antes do bcrypt ainda autenticam com senha em texto puro. Vulnerável a dump do banco.  
**Correção:** Verificar no banco se algum admin ainda tem senha sem hash `$2b$`. Forçar troca e remover o fallback.

### [MED-02] `documents.getById` público com ID sequencial — `server/routers/documents.router.ts`
Qualquer pessoa acessa qualquer documento (contratos, NFs) por ID numérico.  
**Correção:** `protectedClientProcedure` com verificação de ownership, ou `adminLocalProcedure`.

### [MED-04] `changedBy` vem do input — `budgets.router.ts` e `workOrders.router.ts`
O campo de auditoria ("quem fez a alteração") pode ser falsificado pelo frontend.  
**Correção:** Construir `changedBy` a partir de `ctx.adminId` no servidor.

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
| 2026-05-01 | MED-03 | `requestReset` retorna mensagem genérica (não revela se e-mail existe) |
| 2026-05-01 | S05 | `crypto.randomBytes()` substitui `Math.random()` na geração de senhas de clientes |
