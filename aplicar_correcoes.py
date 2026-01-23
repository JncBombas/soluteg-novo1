import os

def aplicar_correcao(caminho_arquivo, busca, substitui):
    if not os.path.exists(caminho_arquivo):
        print(f"⚠️ Arquivo não encontrado: {caminho_arquivo}")
        return False
    
    with open(caminho_arquivo, 'r', encoding='utf-8') as f:
        conteudo = f.read()
    
    if busca in conteudo:
        novo_conteudo = conteudo.replace(busca, substitui)
        with open(caminho_arquivo, 'w', encoding='utf-8') as f:
            f.write(novo_conteudo)
        print(f"✅ Sucesso: {caminho_arquivo}")
        return True
    else:
        if substitui in conteudo:
            print(f"ℹ️ Já aplicado: {caminho_arquivo}")
        else:
            print(f"❌ Não foi possível encontrar o trecho para corrigir em: {caminho_arquivo}")
        return False

print("🚀 Iniciando aplicação das correções da Manus...\n")

# 1. Correção no server/db.ts (leftJoin e logs)
aplicar_correcao(
    "server/db.ts",
    '.innerJoin(clients, eq(workOrders.clientId, clients.id))',
    '.leftJoin(clients, eq(workOrders.clientId, clients.id))'
)

# 2. Correção no server/workOrdersDb.ts (Import do 'like' e logs)
# Primeiro o import
aplicar_correcao(
    "server/workOrdersDb.ts",
    'import { getDb } from "./db";',
    'import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";\nimport { getDb } from "./db";'
)

# 3. Correção no frontend (Tipo de OS no formulário)
# Esta parte é mais complexa por ser um bloco grande, mas vamos tentar o essencial
busca_form = '                  <label className="block text-sm font-semibold mb-2">Tipo de Serviço</label>'
substitui_form = '''                  <label className="block text-sm font-semibold mb-2">Tipo de OS</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="emergencial">Emergencial</option>
                    <option value="rotina">Rotina</option>
                    <option value="orcamento">Orçamento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tipo de Serviço</label>'''

aplicar_correcao(
    "client/src/pages/AdminCreateWorkOrder.tsx",
    busca_form,
    substitui_form
)

print("\n✨ Processo concluído! Se os arquivos acima foram marcados com ✅, você já pode fazer o 'git push' para atualizar seu site.")
