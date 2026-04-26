// Script de inserção de templates de checklist no banco de dados.
// Use para instalações novas. Para bancos existentes, rode migrate-bomba-template.mjs.
//
// Execução:
//   node insert-templates.mjs

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { checklistTemplates } from "./drizzle/schema.ts";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { mode: 'planetscale' });

  // ─── TEMPLATE UNIFICADO DE BOMBA ────────────────────────────────────────────
  // Cobre Recalque, Dreno, Piscina e Incêndio em um único template.
  // O técnico seleciona o tipo no primeiro campo do formulário.
  // O tipo selecionado aparece como subtítulo no PDF gerado.
  const bombaFormStructure = {
    sections: [
      {
        id: "identificacao",
        title: "Identificação",
        fields: [
          {
            id: "tipo_bomba",
            label: "Tipo de Bomba",
            type: "select",
            options: ["Recalque", "Dreno", "Piscina", "Incêndio"],
            required: true
          }
        ]
      },
      {
        id: "inspecao_visual",
        title: "Inspeção Visual",
        items: [
          { id: "tubos",       label: "Tubos",       type: "ok_nok_na", required: true },
          { id: "acionamento", label: "Acionamento", type: "ok_nok_na", required: true },
          { id: "boias",       label: "Boias",       type: "ok_nok_na", required: true },
          { id: "painel",      label: "Painel",      type: "ok_nok_na", required: true },
          { id: "sala",        label: "Sala",        type: "ok_nok_na", required: true },
          { id: "ruido",       label: "Ruído",       type: "ok_nok_na", required: true }
        ]
      },
      {
        id: "dados_tecnicos",
        title: "Dados Técnicos",
        fields: [
          { id: "tensao",          label: "Tensão",             type: "select", options: ["127V", "220V", "380V", "440V"], required: true },
          { id: "fases",           label: "Fases",              type: "select", options: ["Monofásico", "Bifásico", "Trifásico"], required: true },
          { id: "num_bombas",      label: "Quantidade de Bombas", type: "select", options: ["1", "2", "3", "4"], required: true },
          { id: "corrente_bomba_1", label: "Corrente Bomba 1", type: "number", unit: "A", required: true },
          { id: "corrente_bomba_2", label: "Corrente Bomba 2", type: "number", unit: "A", required: false,
            conditional: { field: "num_bombas", operator: "gte", value: 2 } },
          { id: "corrente_bomba_3", label: "Corrente Bomba 3", type: "number", unit: "A", required: false,
            conditional: { field: "num_bombas", operator: "gte", value: 3 } },
          { id: "corrente_bomba_4", label: "Corrente Bomba 4", type: "number", unit: "A", required: false,
            conditional: { field: "num_bombas", operator: "gte", value: 4 } }
        ]
      },
      {
        id: "observacoes",
        title: "Observações",
        fields: [
          { id: "observacoes", label: "Observações", type: "text", required: false }
        ]
      }
    ]
  };

  // ─── TEMPLATE DE GERADOR ────────────────────────────────────────────────────
  // Inspeção visual com ok/nok/na e 16 campos técnicos específicos de gerador.
  const geradorFormStructure = {
    sections: [
      {
        id: "inspecao_visual",
        title: "Inspeção Visual",
        items: [
          { id: "vazamentos",      label: "Vazamentos",        type: "ok_nok_na", required: true },
          { id: "corrosao",        label: "Corrosão",          type: "ok_nok_na", required: true },
          { id: "conexoes_soltas", label: "Conexões Soltas",   type: "ok_nok_na", required: true },
          { id: "radiador",        label: "Radiador",          type: "ok_nok_na", required: true },
          { id: "mangueiras",      label: "Mangueiras",        type: "ok_nok_na", required: true },
          { id: "bateria_visual",  label: "Bateria (Visual)",  type: "ok_nok_na", required: true },
          { id: "cabos_eletricos", label: "Cabos Elétricos",   type: "ok_nok_na", required: true },
          { id: "escapamento",     label: "Escapamento",       type: "ok_nok_na", required: true },
          { id: "filtros",         label: "Filtros",           type: "ok_nok_na", required: true },
          { id: "painel_controle", label: "Painel de Controle", type: "ok_nok_na", required: true }
        ]
      },
      {
        id: "tensao_fases",
        title: "Tensão e Fases",
        fields: [
          { id: "tensao", label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"], required: true },
          { id: "fases",  label: "Fases",  type: "select", options: ["Monofásico", "Bifásico", "Trifásico"], required: true }
        ]
      },
      {
        id: "tensao_entre_fases",
        title: "Tensão Entre Fases",
        fields: [
          { id: "tensao_l1_l2", label: "L1-L2", type: "number", unit: "V", required: true },
          { id: "tensao_l2_l3", label: "L2-L3", type: "number", unit: "V", required: true },
          { id: "tensao_l1_l3", label: "L1-L3", type: "number", unit: "V", required: true }
        ]
      },
      {
        id: "corrente_entre_fases",
        title: "Corrente Entre Fases",
        fields: [
          { id: "corrente_l1", label: "L1", type: "number", unit: "A", required: true },
          { id: "corrente_l2", label: "L2", type: "number", unit: "A", required: true },
          { id: "corrente_l3", label: "L3", type: "number", unit: "A", required: true }
        ]
      },
      {
        id: "bateria_info",
        title: "Bateria",
        fields: [
          { id: "tensao_bateria",        label: "Tensão da Bateria",        type: "number", unit: "V", required: true },
          { id: "tensao_minima_bateria", label: "Tensão Mínima da Bateria", type: "number", unit: "V", required: true },
          { id: "tensao_carregador",     label: "Tensão do Carregador",     type: "number", unit: "V", required: true }
        ]
      },
      {
        id: "alternador",
        title: "Alternador",
        fields: [
          { id: "tensao_alternador", label: "Tensão do Alternador", type: "number", unit: "V", required: true }
        ]
      },
      {
        id: "combustivel_info",
        title: "Combustível",
        fields: [
          { id: "nivel_combustivel", label: "Nível de Combustível", type: "number", unit: "L", required: true }
        ]
      },
      {
        id: "equipamento",
        title: "Equipamento",
        fields: [
          { id: "horimetro", label: "Horômetro", type: "number", unit: "h", required: true }
        ]
      },
      {
        id: "arrefecimento",
        title: "Líquido de Arrefecimento",
        fields: [
          { id: "nivel_arrefecimento", label: "Nível",        type: "select", options: ["Baixo", "Normal", "Alto"], required: true },
          { id: "temperatura",         label: "Temperatura",  type: "number", unit: "°C", required: true }
        ]
      },
      {
        id: "observacoes",
        title: "Observações",
        fields: [
          { id: "observacoes", label: "Observações", type: "text", required: false }
        ]
      }
    ]
  };

  // ─── LISTA FINAL ─────────────────────────────────────────────────────────────
  const templates = [
    {
      name: "Bomba",
      slug: "bomba",
      description: "Checklist unificado para inspeção de bombas (Recalque, Dreno, Piscina, Incêndio)",
      formStructure: JSON.stringify(bombaFormStructure),
    },
    {
      name: "Gerador",
      slug: "gerador",
      description: "Checklist para inspeção de geradores",
      formStructure: JSON.stringify(geradorFormStructure),
    },
  ];

  try {
    for (const template of templates) {
      await db.insert(checklistTemplates).values(template);
      console.log(`✅ Template criado: ${template.name}`);
    }
    console.log("\n✅ 2 templates criados com sucesso (Bomba + Gerador)!");
    console.log("   Para bancos existentes com os 4 templates antigos, rode: node migrate-bomba-template.mjs");
  } catch (error) {
    console.error("❌ Erro ao criar templates:", error);
  } finally {
    await connection.end();
  }
}

main();
