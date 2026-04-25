/**
 * migrate-bomba-template.mjs
 *
 * Migração única: une os 4 templates de bomba (recalque, dreno, piscina, incêndio)
 * em um único template "Bomba" com campo de seleção de tipo.
 *
 * O que este script faz:
 *   1. Desativa os 4 templates antigos (active = 0) para não aparecerem no seletor.
 *      As instâncias históricas continuam funcionando normalmente — apenas não é mais
 *      possível criar novas instâncias desses tipos antigos.
 *   2. Insere o novo template "Bomba" unificado, caso ainda não exista.
 *
 * Como rodar (uma única vez em produção):
 *   node migrate-bomba-template.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { checklistTemplates } from "./drizzle/schema.ts";
import { inArray, eq } from "drizzle-orm";

// Estrutura do novo template unificado de Bomba
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
          required: true,
        },
      ],
    },
    {
      id: "inspecao_visual",
      title: "Inspeção Visual",
      items: [
        { id: "tubos",      label: "Tubos",      type: "ok_nok_na", required: true },
        { id: "acionamento",label: "Acionamento", type: "ok_nok_na", required: true },
        { id: "boias",      label: "Boias",      type: "ok_nok_na", required: true },
        { id: "painel",     label: "Painel",     type: "ok_nok_na", required: true },
        { id: "sala",       label: "Sala",       type: "ok_nok_na", required: true },
        { id: "ruido",      label: "Ruído",      type: "ok_nok_na", required: true },
      ],
    },
    {
      id: "dados_tecnicos",
      title: "Dados Técnicos",
      fields: [
        { id: "tensao",          label: "Tensão",               type: "select", options: ["127V","220V","380V","440V"], required: true },
        { id: "fases",           label: "Fases",                type: "select", options: ["Monofásico","Bifásico","Trifásico"], required: true },
        { id: "num_bombas",      label: "Quantidade de Bombas", type: "select", options: ["1","2","3","4"], required: true },
        { id: "corrente_bomba_1",label: "Corrente Bomba 1",     type: "number", unit: "A", required: true },
        { id: "corrente_bomba_2",label: "Corrente Bomba 2",     type: "number", unit: "A", required: false, conditional: { field: "num_bombas", operator: "gte", value: 2 } },
        { id: "corrente_bomba_3",label: "Corrente Bomba 3",     type: "number", unit: "A", required: false, conditional: { field: "num_bombas", operator: "gte", value: 3 } },
        { id: "corrente_bomba_4",label: "Corrente Bomba 4",     type: "number", unit: "A", required: false, conditional: { field: "num_bombas", operator: "gte", value: 4 } },
      ],
    },
    {
      id: "observacoes",
      title: "Observações",
      fields: [
        { id: "observacoes", label: "Observações", type: "text", required: false },
      ],
    },
  ],
};

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { mode: "planetscale" });

  try {
    // 1. Desativa os 4 templates antigos de bomba
    const slugsAntigos = ["bomba_recalque", "bomba_dreno", "bomba_piscina", "bomba_incendio"];
    await db
      .update(checklistTemplates)
      .set({ active: 0 })
      .where(inArray(checklistTemplates.slug, slugsAntigos));
    console.log("✅ Templates antigos de bomba desativados:", slugsAntigos.join(", "));

    // 2. Verifica se o novo template já existe (evita duplicata)
    const existente = await db
      .select({ id: checklistTemplates.id })
      .from(checklistTemplates)
      .where(eq(checklistTemplates.slug, "bomba"))
      .limit(1);

    if (existente.length > 0) {
      console.log("ℹ️  Template 'bomba' já existe (id:", existente[0].id, ") — nenhuma inserção necessária.");
    } else {
      // 3. Insere o novo template unificado
      await db.insert(checklistTemplates).values({
        name:          "Bomba",
        slug:          "bomba",
        description:   "Checklist unificado para inspeção de bombas (Recalque, Dreno, Piscina, Incêndio)",
        formStructure: JSON.stringify(bombaFormStructure),
        active:        1,
      });
      console.log("✅ Novo template 'Bomba' criado com sucesso!");
    }

    console.log("\n✅ Migração concluída.");
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
