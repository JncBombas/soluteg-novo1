# 🔒 Proteção de Dados — Regras Críticas

> **Atualizado:** 15/05/2026
> **Status:** ATIVO E OBRIGATÓRIO
>
> Este documento define regras invioláveis para qualquer operação que envolva dados do sistema.
> Aplicável a desenvolvedores humanos e IAs de codificação.

---

## 1. Tabelas que NUNCA podem ser deletadas

As tabelas abaixo contêm **dados reais e insubstituíveis**. Operações de `DROP TABLE` são absolutamente proibidas:

| Tabela | Dados |
|--------|-------|
| `clients` | Clientes cadastrados (29 ativos em produção) |
| `clientDocuments` | Documentos enviados aos clientes |
| `admins` | Contas administrativas |
| `invites` | Convites de acesso |
| `workOrders` | Ordens de serviço históricas (76+ em produção) |
| `budgets` | Orçamentos emitidos e aprovados |
| `sales` | Vendas registradas no PDV |
| `saleItems` | Itens de venda |
| `laudos` | Laudos técnicos emitidos |
| `waterTankAlertLog` | Histórico de alertas de caixa d'água |

**Quando o multi-tenant for completado, adicionar:**
- `tenants`, `platformAdmins`, `gestors`, `condominiums`, `notificationContacts`

---

## 2. Operações permitidas

✅ `ALTER TABLE` para adicionar/modificar colunas (preferir aditivo)
✅ `UPDATE` para modificar dados (sempre com `WHERE` específico)
✅ `DELETE` apenas com `WHERE` específico para registros individuais — preferir soft delete (`UPDATE active=0`)
✅ Criar tabelas novas

## 3. Operações proibidas

❌ `DROP TABLE` em qualquer tabela da lista acima
❌ `DELETE` sem `WHERE` (apagaria a tabela inteira)
❌ `TRUNCATE` em tabelas de produção
❌ `DROP DATABASE`
❌ Scripts que deletam múltiplas tabelas sem confirmação explícita
❌ `ALTER` que diminui tamanho de coluna (pode truncar dados)
❌ Mudar tipo de coluna sem verificar dados existentes

---

## 4. Procedimento seguro antes de qualquer operação destrutiva

1. **Backup obrigatório** antes de qualquer ALTER em produção:
   ```bash
   mysqldump -h 69.6.213.57 -u <user> -p \
     --routines --triggers --single-transaction --no-tablespaces \
     <database> > /var/backups/<dir>/backup-pre-<descricao>-$(date +%Y%m%d-%H%M%S).sql
   chmod 600 /var/backups/<dir>/backup-pre-*.sql
   ```

2. **Aplicar em staging primeiro** sempre (banco `d5ea2e96_tst`)

3. **Validar resultado** antes de considerar concluído:
   - `SELECT COUNT(*)` antes e depois (contagens batem?)
   - `SHOW CREATE TABLE` para confirmar estrutura final
   - `SELECT` de amostra para confirmar dados intactos

4. **Documentar em** [`PENDENCIAS_DEPLOY_PRODUCAO.md`](../PENDENCIAS_DEPLOY_PRODUCAO.md) o que precisa replicar em produção

---

## 5. Helper de segurança

`server/lib/environment.ts` fornece:

```typescript
assertStagingEnvironment()   // aborta se DB_NAME for de produção
assertProductionEnvironment() // confirma explicitamente produção
maskPhone(phone)             // mascara telefones em logs
maskEmail(email)             // mascara emails em logs
maskString(value)            // mascara strings genéricas
```

**Sempre use estes helpers** em scripts de migração ou que processam dados sensíveis.

---

## 6. LGPD — Princípios a respeitar

O Soluteg processa dados pessoais (PII): nomes, telefones, emails, endereços, CPFs/CNPJs.

### Em código

- ❌ Nunca logue PII em texto plano. Use `maskPhone`, `maskEmail`, etc.
- ❌ Nunca exponha hash de senha em response da API (mesmo para admins)
- ❌ Nunca inclua JWT completo em logs
- ❌ Nunca envie dados de cliente A para o tenant B (regra multi-tenant)

### Soft delete

Quando um gestor, cliente ou tenant é "excluído":
- Marcar `active = 0`
- Manter registros históricos (OS, orçamentos) intactos
- Após X dias (a definir), anonimizar PII mantendo IDs e timestamps

### Logs e auditoria

- Tabela `auditLog` registra ações sensíveis (criação de tenant, mudança de senha, etc)
- Logs nunca devem conter senhas (mesmo hash), JWT, ou dados de cartão

---

## 7. Multi-tenant — Regras de isolamento

> Aplicável após conclusão da Fase 3.7.

- Toda query que toca tabela com `tenantId` DEVE filtrar por `ctx.tenantId`
- Filtro será injetado automaticamente via helper `forTenant(table, tenantId)`
- Code review rejeita PRs que tocam queries sem usar o helper
- `platformAdmin` é a ÚNICA conta com acesso cross-tenant

---

## 8. Senhas

- Hash bcryptjs cost 12
- Senhas nunca em texto plano em banco, log, ou response
- Geração de senhas aleatórias via `crypto.randomBytes(32)`
- Reset de senha invalida todas as sessões do usuário

---

## 9. Em caso de dúvida

**Não execute. Pergunte primeiro.**

Em caso de operação destrutiva incerta:
1. Pare
2. Documente o que ia fazer e por quê
3. Confirme com Thiago antes de prosseguir

---

**Histórico:**
- 2026-01-10 — Criação inicial (regras básicas)
- 2026-05-15 — Expansão para cobrir multi-tenant, LGPD e helpers de segurança
