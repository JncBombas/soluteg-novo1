# 🔒 REGRAS DE PROTEÇÃO DE DADOS - CRÍTICO

## NUNCA DELETAR ESSAS TABELAS

As seguintes tabelas contêm dados reais do usuário e **NUNCA** devem ser deletadas sob nenhuma circunstância:

- ❌ **clients** - Clientes cadastrados (dados críticos do usuário)
- ❌ **clientDocuments** - Documentos enviados aos clientes (dados críticos do usuário)
- ❌ **admins** - Usuários administrativos (dados críticos do usuário)
- ❌ **invites** - Convites de acesso (dados críticos do usuário)

## OPERAÇÕES PERMITIDAS

✅ Usar `ALTER TABLE` para adicionar/modificar colunas
✅ Usar `UPDATE` para modificar dados
✅ Usar `DELETE` apenas com WHERE específico para remover registros individuais
✅ Recriar tabelas de suporte (workOrders, checklistInstances, etc) se necessário

## OPERAÇÕES PROIBIDAS

❌ `DROP TABLE clients`
❌ `DROP TABLE clientDocuments`
❌ `DROP TABLE admins`
❌ `DROP TABLE invites`
❌ Deletar múltiplas tabelas de uma vez
❌ Usar scripts que deletam tabelas sem confirmação explícita

## PROCEDIMENTO SEGURO

1. **SEMPRE** avisar o usuário ANTES de fazer qualquer operação que possa afetar dados
2. **SEMPRE** fazer backup mental de quais tabelas contêm dados críticos
3. **SEMPRE** usar `ALTER TABLE` em vez de `DROP TABLE`
4. **SEMPRE** testar em tabelas de suporte primeiro
5. **SEMPRE** pedir confirmação se houver dúvida

---

**Data de Criação:** 2026-01-10
**Status:** ATIVO E OBRIGATÓRIO
