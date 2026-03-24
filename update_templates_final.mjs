import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// 1-3. Bombas Recalque, Dreno, Piscina (iguais - até 4 bombas)
const bombaComum = JSON.stringify({
  sections: [
    {
      id: 'visual',
      title: 'Inspeção Visual',
      fields: [
        { id: 'visual_items', type: 'checkbox_table', label: 'Itens', items: ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'], options: ['OK', 'NOK', 'N/A'] }
      ]
    },
    {
      id: 'technical',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', type: 'select', label: 'Tensão', options: ['127V', '220V', '380V', '440V'] },
        { id: 'fases', type: 'select', label: 'Fases', options: ['Monofásico', 'Bifásico', 'Trifásico'] },
        { id: 'quantidade_bombas', type: 'select', label: 'Quantidade de Bombas', options: ['1', '2', '3', '4'] },
        { id: 'corrente_1', type: 'number', label: 'Corrente Bomba 1 (A)' },
        { id: 'corrente_2', type: 'number', label: 'Corrente Bomba 2 (A)', conditional: { field: 'quantidade_bombas', operator: '>=', value: '2' } },
        { id: 'corrente_3', type: 'number', label: 'Corrente Bomba 3 (A)', conditional: { field: 'quantidade_bombas', operator: '>=', value: '3' } },
        { id: 'corrente_4', type: 'number', label: 'Corrente Bomba 4 (A)', conditional: { field: 'quantidade_bombas', operator: '==', value: '4' } }
      ]
    },
    {
      id: 'observations',
      title: 'Observações',
      fields: [{ id: 'observations', type: 'textarea', label: 'Observações' }]
    }
  ]
});

await connection.execute('UPDATE checklistTemplates SET formStructure = ? WHERE slug = ?', [bombaComum, 'bomba-recalque']);
console.log('✅ Bomba Recalque');

await connection.execute('UPDATE checklistTemplates SET formStructure = ? WHERE slug = ?', [bombaComum, 'bomba-dreno']);
console.log('✅ Bomba Dreno');

await connection.execute('UPDATE checklistTemplates SET formStructure = ? WHERE slug = ?', [bombaComum, 'bomba-piscina']);
console.log('✅ Bomba Piscina');

// 4. Bomba Incêndio (máx 2 bombas - SEM PRESSÃO)
const bombaIncendio = JSON.stringify({
  sections: [
    {
      id: 'visual',
      title: 'Inspeção Visual',
      fields: [
        { id: 'visual_items', 
          type: 'checkbox_table', 
          label: 'Itens', 
          items: ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'], 
          options: ['OK', 'NOK', 'N/A'] 
        }
      ]
    },
    {
      id: 'technical',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', type: 'select', label: 'Tensão', options: ['127V', '220V', '380V', '440V'] },
        { id: 'fases', type: 'select', label: 'Fases', options: ['Monofásico', 'Bifásico', 'Trifásico'] },
        { id: 'quantidade_bombas', type: 'select', label: 'Quantidade de Bombas', options: ['1', '2'] },
        { id: 'corrente_1', type: 'number', label: 'Corrente Bomba 1 (A)' },
        { id: 'corrente_2', type: 'number', label: 'Corrente Bomba 2 (A)', conditional: { field: 'quantidade_bombas', operator: '==', value: '2' } }
      ]
    },
    {
      id: 'observations',
      title: 'Observações',
      fields: [{ 
        id: 'observations', 
        type: 'textarea', 
        label: 'Observações' }]
    }
  ]
});
await connection.execute('UPDATE checklistTemplates SET formStructure = ? WHERE slug = ?', [bombaIncendio, 'bomba-incendio']);
console.log('✅ Bomba Incêndio (SEM Pressão)');

// 5. Gerador
const gerador = JSON.stringify(
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
      id: 'technical',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', type: 'select', label: 'Tensão', options: ['127V', '220V', '380V', '440V'] },
        { id: 'fases', type: 'select', label: 'Fases', options: ['Monofásico', 'Bifásico', 'Trifásico'] },
        { id: 'tensao_l1_l2', type: 'number', label: 'L1-L2 (V)' },
        { id: 'tensao_l2_l3', type: 'number', label: 'L2-L3 (V)' },
        { id: 'tensao_l1_l3', type: 'number', label: 'L1-L3 (V)' },
        { id: 'corrente_l1', type: 'number', label: 'Corrente L1 (A)' },
        { id: 'corrente_l2', type: 'number', label: 'Corrente L2 (A)' },
        { id: 'corrente_l3', type: 'number', label: 'Corrente L3 (A)' },
        { id: 'tensao_bateria', type: 'number', label: 'Tensão da Bateria (V)' },
        { id: 'tensao_minima_bateria', type: 'number', label: 'Tensão Mínima da Bateria (V)' },
        { id: 'tensao_carregador', type: 'number', label: 'Tensão do Carregador (V)' },
        { id: 'tensao_alternador', type: 'number', label: 'Tensão do Alternador (V)' },
        { id: 'nivel_combustivel', type: 'number', label: 'Nível de Combustível (L)' },
        { id: 'horometro', type: 'number', label: 'Horômetro (h)' },
        { id: 'temperatura_arrefecimento', type: 'number', label: 'Temperatura (°C)' }
      ]
    },
    {
      id: 'observations',
      title: 'Observações',
      fields: [{ id: 'observations', type: 'textarea', label: 'Observações' }]
    }
  ]
});
await connection.execute('UPDATE checklistTemplates SET formStructure = ? WHERE slug = ?', [gerador, 'gerador']);
console.log('✅ Gerador (16 campos técnicos)');

await connection.end();
console.log('\n✅ Todos os 5 templates atualizados corretamente!');
