import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { checklistTemplates } from "./drizzle/schema.ts";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection, { mode: 'planetscale' });

  const templates = [
    {
      name: "Bomba de Recalque",
      slug: "bomba_recalque",
      description: "Checklist para inspeção de bombas de recalque",
      formStructure: JSON.stringify({
        sections: [
          {
            title: "Inspeção Visual",
            type: "visual_inspection",
            items: [
              { label: "Tubos", type: "checkbox" },
              { label: "Acionamento", type: "checkbox" },
              { label: "Boias", type: "checkbox" },
              { label: "Painel", type: "checkbox" },
              { label: "Sala", type: "checkbox" },
              { label: "Ruído", type: "checkbox" }
            ]
          },
          {
            title: "Dados Técnicos",
            type: "technical_data",
            items: [
              { label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"] },
              { label: "Fases", type: "select", options: ["Monofásico", "Bifásico", "Trifásico"] },
              { label: "Quantidade de Bombas", type: "select", options: ["1", "2", "3", "4"] },
              { label: "Corrente Bomba 1", type: "number", unit: "A" },
              { label: "Corrente Bomba 2", type: "number", unit: "A" },
              { label: "Corrente Bomba 3", type: "number", unit: "A" },
              { label: "Corrente Bomba 4", type: "number", unit: "A" }
            ]
          },
          {
            title: "Observações",
            type: "text",
            items: [
              { label: "Observações", type: "textarea" }
            ]
          }
        ]
      })
    },
    {
      name: "Bomba de Dreno",
      slug: "bomba_dreno",
      description: "Checklist para inspeção de bombas de dreno",
      formStructure: JSON.stringify({
        sections: [
          {
            title: "Inspeção Visual",
            type: "visual_inspection",
            items: [
              { label: "Tubos", type: "checkbox" },
              { label: "Acionamento", type: "checkbox" },
              { label: "Boias", type: "checkbox" },
              { label: "Painel", type: "checkbox" },
              { label: "Sala", type: "checkbox" },
              { label: "Ruído", type: "checkbox" }
            ]
          },
          {
            title: "Dados Técnicos",
            type: "technical_data",
            items: [
              { label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"] },
              { label: "Fases", type: "select", options: ["Monofásico", "Bifásico", "Trifásico"] },
              { label: "Quantidade de Bombas", type: "select", options: ["1", "2", "3", "4"] },
              { label: "Corrente Bomba 1", type: "number", unit: "A" },
              { label: "Corrente Bomba 2", type: "number", unit: "A" },
              { label: "Corrente Bomba 3", type: "number", unit: "A" },
              { label: "Corrente Bomba 4", type: "number", unit: "A" }
            ]
          },
          {
            title: "Observações",
            type: "text",
            items: [
              { label: "Observações", type: "textarea" }
            ]
          }
        ]
      })
    },
    {
      name: "Bomba de Piscina",
      slug: "bomba_piscina",
      description: "Checklist para inspeção de bombas de piscina",
      formStructure: JSON.stringify({
        sections: [
          {
            title: "Inspeção Visual",
            type: "visual_inspection",
            items: [
              { label: "Tubos", type: "checkbox" },
              { label: "Acionamento", type: "checkbox" },
              { label: "Boias", type: "checkbox" },
              { label: "Painel", type: "checkbox" },
              { label: "Sala", type: "checkbox" },
              { label: "Ruído", type: "checkbox" }
            ]
          },
          {
            title: "Dados Técnicos",
            type: "technical_data",
            items: [
              { label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"] },
              { label: "Fases", type: "select", options: ["Monofásico", "Bifásico", "Trifásico"] },
              { label: "Quantidade de Bombas", type: "select", options: ["1", "2", "3", "4"] },
              { label: "Corrente Bomba 1", type: "number", unit: "A" },
              { label: "Corrente Bomba 2", type: "number", unit: "A" },
              { label: "Corrente Bomba 3", type: "number", unit: "A" },
              { label: "Corrente Bomba 4", type: "number", unit: "A" }
            ]
          },
          {
            title: "Observações",
            type: "text",
            items: [
              { label: "Observações", type: "textarea" }
            ]
          }
        ]
      })
    },
    {
      name: "Bomba de Incêndio",
      slug: "bomba_incendio",
      description: "Checklist para inspeção de bombas de incêndio",
      formStructure: JSON.stringify({
        sections: [
          {
            title: "Inspeção Visual",
            type: "visual_inspection",
            items: [
              { label: "Tubos", type: "checkbox" },
              { label: "Acionamento", type: "checkbox" },
              { label: "Boias", type: "checkbox" },
              { label: "Painel", type: "checkbox" },
              { label: "Sala", type: "checkbox" },
              { label: "Ruído", type: "checkbox" }
            ]
          },
          {
            title: "Dados Técnicos",
            type: "technical_data",
            items: [
              { label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"] },
              { label: "Fases", type: "select", options: ["Monofásico", "Bifásico", "Trifásico"] },
              { label: "Quantidade de Bombas", type: "select", options: ["1", "2"] },
              { label: "Corrente Bomba 1", type: "number", unit: "A" },
              { label: "Corrente Bomba 2", type: "number", unit: "A" },
              { label: "Pressão", type: "number", unit: "bar" }
            ]
          },
          {
            title: "Observações",
            type: "text",
            items: [
              { label: "Observações", type: "textarea" }
            ]
          }
        ]
      })
    },
    {
      name: "Gerador",
      slug: "gerador",
      description: "Checklist para inspeção de geradores",
      formStructure: JSON.stringify(
        {
  sections: [
    {
      id: "visual",
      title: "Inspeção Visual",
      fields: [{
          id: "visual_items",
          type: "checkbox_table",
          label: "Itens",
          items: [
            "Vazamentos", "USCA", "Corrosão", "Conexões", "Sala", 
            "Ruido", "Nivel de óleo", "Líquido de Arrefecimento", 
            "Filtro de ar", "Correa", "Alternador", "Painel QTA"
          ],
          options: ["OK", "NOK", "N/A"]
        }
      ]
    },
          {
            title: "Dados Técnicos",
            type: "technical_data",
            items: [
              { label: "Tensão", type: "select", options: ["127V", "220V", "380V", "440V"] },
              { label: "Fases", type: "select", options: ["Monofásico", "Bifásico", "Trifásico"] },
              { label: "L1-L2", type: "number", unit: "V" },
              { label: "L2-L3", type: "number", unit: "V" },
              { label: "L1-L3", type: "number", unit: "V" },
              { label: "L1", type: "number", unit: "A" },
              { label: "L2", type: "number", unit: "A" },
              { label: "L3", type: "number", unit: "A" },
              { label: "Tensão da Bateria", type: "number", unit: "V" },
              { label: "Tensão Mínima da Bateria", type: "number", unit: "V" },
              { label: "Tensão do Carregador", type: "number", unit: "V" },
              { label: "Tensão do Alternador", type: "number", unit: "V" },
              { label: "Nível de Combustível", type: "number", unit: "L" },
              { label: "Horômetro", type: "number", unit: "h" },
              { label: "Temperatura", type: "number", unit: "°C" }
            ]
          },
          {
            title: "Observações",
            type: "text",
            items: [
              { label: "Observações", type: "textarea" }
            ]
          }
        ]
      })
    }
  ];

  try {
    for (const template of templates) {
      await db.insert(checklistTemplates).values(template);
      console.log(`✅ Template criado: ${template.name}`);
    }
    console.log("\n✅ Todos os 5 templates foram criados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao criar templates:", error);
  } finally {
    await connection.end();
  }
}

main();
