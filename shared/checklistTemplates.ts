// Templates de checklists genéricos para bombas e geradores

export interface ChecklistItem {
  id: string;
  label: string;
  type: 'ok_nok_na'; // Ok, NOk, N/A
  required: boolean;
}

export interface ChecklistField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  unit?: string; // Ex: "A" para Ampere, "V" para Volts
  options?: string[]; // Para campos select
  required: boolean;
  conditional?: {
    field: string;
    operator: 'gte' | 'eq';
    value: number | string;
  };
}

export interface ChecklistSection {
  id: string;
  title: string;
  items?: ChecklistItem[];
  fields?: ChecklistField[];
}

export interface ChecklistTemplateStructure {
  sections: ChecklistSection[];
}

// Template: Bomba de Recalque
export const bombaRecalqueTemplate: ChecklistTemplateStructure = {
  sections: [
    {
      id: 'inspecao_visual',
      title: 'Inspeção Visual',
      items: [
        { id: 'tubos', label: 'Tubos', type: 'ok_nok_na', required: true },
        { id: 'acionamento', label: 'Acionamento', type: 'ok_nok_na', required: true },
        { id: 'boias', label: 'Boias', type: 'ok_nok_na', required: true },
        { id: 'painel', label: 'Painel', type: 'ok_nok_na', required: true },
        { id: 'sala', label: 'Sala', type: 'ok_nok_na', required: true },
        { id: 'ruido', label: 'Ruído', type: 'ok_nok_na', required: true },
      ]
    },
    {
      id: 'dados_tecnicos',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', label: 'Tensão', type: 'select', options: ['127V', '220V', '380V', '440V'], required: true },
        { id: 'fases', label: 'Fases', type: 'select', options: ['Monofásico', 'Bifásico', 'Trifásico'], required: true },
        { id: 'num_bombas', label: 'Número de Bombas', type: 'select', options: ['1', '2', '3', '4'], required: true },
        { id: 'corrente_bomba_1', label: 'Corrente Bomba 1', type: 'number', unit: 'A', required: true },
        { id: 'corrente_bomba_2', label: 'Corrente Bomba 2', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 2 } },
        { id: 'corrente_bomba_3', label: 'Corrente Bomba 3', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 3 } },
        { id: 'corrente_bomba_4', label: 'Corrente Bomba 4', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 4 } },
      ]
    },
    {
      id: 'observacoes',
      title: 'Observações',
      fields: [
        { id: 'observacoes', label: 'Observações', type: 'text', required: false }
      ]
    }
  ]
};

// Template: Bomba de Dreno
export const bombaDrenoTemplate: ChecklistTemplateStructure = {
  sections: [
    {
      id: 'inspecao_visual',
      title: 'Inspeção Visual',
      items: [
        { id: 'tubos', label: 'Tubos', type: 'ok_nok_na', required: true },
        { id: 'acionamento', label: 'Acionamento', type: 'ok_nok_na', required: true },
        { id: 'boias', label: 'Boias', type: 'ok_nok_na', required: true },
        { id: 'painel', label: 'Painel', type: 'ok_nok_na', required: true },
        { id: 'sala', label: 'Sala', type: 'ok_nok_na', required: true },
        { id: 'ruido', label: 'Ruído', type: 'ok_nok_na', required: true },
      ]
    },
    {
      id: 'dados_tecnicos',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', label: 'Tensão', type: 'select', options: ['127V', '220V', '380V', '440V'], required: true },
        { id: 'fases', label: 'Fases', type: 'select', options: ['Monofásico', 'Bifásico', 'Trifásico'], required: true },
        { id: 'num_bombas', label: 'Número de Bombas', type: 'select', options: ['1', '2', '3', '4'], required: true },
        { id: 'corrente_bomba_1', label: 'Corrente Bomba 1', type: 'number', unit: 'A', required: true },
        { id: 'corrente_bomba_2', label: 'Corrente Bomba 2', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 2 } },
        { id: 'corrente_bomba_3', label: 'Corrente Bomba 3', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 3 } },
        { id: 'corrente_bomba_4', label: 'Corrente Bomba 4', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 4 } },
      ]
    },
    {
      id: 'observacoes',
      title: 'Observações',
      fields: [
        { id: 'observacoes', label: 'Observações', type: 'text', required: false }
      ]
    }
  ]
};

// Template: Bomba de Piscina
export const bombaPiscinaTemplate: ChecklistTemplateStructure = {
  sections: [
    {
      id: 'inspecao_visual',
      title: 'Inspeção Visual',
      items: [
        { id: 'tubos', label: 'Tubos', type: 'ok_nok_na', required: true },
        { id: 'acionamento', label: 'Acionamento', type: 'ok_nok_na', required: true },
        { id: 'painel', label: 'Painel', type: 'ok_nok_na', required: true },
        { id: 'sala', label: 'Sala', type: 'ok_nok_na', required: true },
        { id: 'ruido', label: 'Ruído', type: 'ok_nok_na', required: true },
      ]
    },
    {
      id: 'dados_tecnicos',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', label: 'Tensão', type: 'select', options: ['127V', '220V', '380V', '440V'], required: true },
        { id: 'fases', label: 'Fases', type: 'select', options: ['Monofásico', 'Bifásico', 'Trifásico'], required: true },
        { id: 'num_bombas', label: 'Número de Bombas', type: 'select', options: ['1', '2', '3', '4'], required: true },
        { id: 'corrente_bomba_1', label: 'Corrente Bomba 1', type: 'number', unit: 'A', required: true },
        { id: 'corrente_bomba_2', label: 'Corrente Bomba 2', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 2 } },
        { id: 'corrente_bomba_3', label: 'Corrente Bomba 3', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 3 } },
        { id: 'corrente_bomba_4', label: 'Corrente Bomba 4', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 4 } },
      ]
    },
    {
      id: 'observacoes',
      title: 'Observações',
      fields: [
        { id: 'observacoes', label: 'Observações', type: 'text', required: false }
      ]
    }
  ]
};

// Template: Bomba de Incêndio
export const bombaIncendioTemplate: ChecklistTemplateStructure = {
  sections: [
    {
      id: 'inspecao_visual',
      title: 'Inspeção Visual',
      items: [
        { id: 'tubos', label: 'Tubos', type: 'ok_nok_na', required: true },
        { id: 'acionamento', label: 'Acionamento', type: 'ok_nok_na', required: true },
        { id: 'valvulas', label: 'Válvulas', type: 'ok_nok_na', required: true },
        { id: 'painel', label: 'Painel', type: 'ok_nok_na', required: true },
        { id: 'manometro', label: 'Manômetro', type: 'ok_nok_na', required: true },
        { id: 'ruido', label: 'Ruído', type: 'ok_nok_na', required: true },
      ]
    },
    {
      id: 'dados_tecnicos',
      title: 'Dados Técnicos',
      fields: [
        { id: 'tensao', label: 'Tensão', type: 'select', options: ['127V', '220V', '380V', '440V'], required: true },
        { id: 'fases', label: 'Fases', type: 'select', options: ['Monofásico', 'Bifásico', 'Trifásico'], required: true },
        { id: 'num_bombas', label: 'Número de Bombas', type: 'select', options: ['1', '2'], required: true },
        { id: 'corrente_bomba_1', label: 'Corrente Bomba 1', type: 'number', unit: 'A', required: true },
        { id: 'corrente_bomba_2', label: 'Corrente Bomba 2', type: 'number', unit: 'A', required: false, conditional: { field: 'num_bombas', operator: 'gte', value: 2 } },
        { id: 'pressao', label: 'Pressão', type: 'number', unit: 'bar', required: true },
      ]
    },
    {
      id: 'observacoes',
      title: 'Observações',
      fields: [
        { id: 'observacoes', label: 'Observações', type: 'text', required: false }
      ]
    }
  ]
};

// Template: Gerador
export const geradorTemplate: ChecklistTemplateStructure = {
  sections: [
    {
      id: 'inspecao_visual',
      title: 'Inspeção Visual',
      items: [
        { id: 'oleo', label: 'Óleo', type: 'ok_nok_na', required: true },
        { id: 'combustivel', label: 'Combustível', type: 'ok_nok_na', required: true },
        { id: 'bateria', label: 'Bateria', type: 'ok_nok_na', required: true },
        { id: 'pre_aquecimento', label: 'Pré-aquecimento', type: 'ok_nok_na', required: true },
        { id: 'filtro_ar', label: 'Filtro de Ar', type: 'ok_nok_na', required: true },
        { id: 'conexoes', label: 'Conexões', type: 'ok_nok_na', required: true },
        { id: 'organizacao_sala', label: 'Organização da Sala', type: 'ok_nok_na', required: true },
      ]
    },
    {
      id: 'tensao_fases',
      title: 'Tensão e Fases',
      fields: [
        { id: 'tensao', label: 'Tensão', type: 'select', options: ['127V', '220V', '380V', '440V'], required: true },
        { id: 'fases', label: 'Fases', type: 'select', options: ['Monofásico', 'Bifásico', 'Trifásico'], required: true },
      ]
    },
    {
      id: 'tensao_entre_fases',
      title: 'Tensão Entre Fases',
      fields: [
        { id: 'tensao_l1_l2', label: 'L1-L2', type: 'number', unit: 'V', required: true },
        { id: 'tensao_l2_l3', label: 'L2-L3', type: 'number', unit: 'V', required: true },
        { id: 'tensao_l1_l3', label: 'L1-L3', type: 'number', unit: 'V', required: true },
      ]
    },
    {
      id: 'corrente_entre_fases',
      title: 'Corrente Entre Fases',
      fields: [
        { id: 'corrente_l1', label: 'L1', type: 'number', unit: 'A', required: true },
        { id: 'corrente_l2', label: 'L2', type: 'number', unit: 'A', required: true },
        { id: 'corrente_l3', label: 'L3', type: 'number', unit: 'A', required: true },
      ]
    },
    {
      id: 'bateria_info',
      title: 'Bateria',
      fields: [
        { id: 'tensao_bateria', label: 'Tensão da Bateria', type: 'number', unit: 'V', required: true },
        { id: 'tensao_minima_bateria', label: 'Tensão Mínima da Bateria', type: 'number', unit: 'V', required: true },
        { id: 'tensao_carregador', label: 'Tensão do Carregador', type: 'number', unit: 'V', required: true },
      ]
    },
    {
      id: 'alternador',
      title: 'Alternador',
      fields: [
        { id: 'tensao_alternador', label: 'Tensão do Alternador', type: 'number', unit: 'V', required: true },
      ]
    },
    {
      id: 'combustivel_info',
      title: 'Combustível',
      fields: [
        { id: 'nivel_combustivel', label: 'Nível de Combustível', type: 'number', unit: 'L', required: true },
      ]
    },
    {
      id: 'equipamento',
      title: 'Equipamento',
      fields: [
        { id: 'horimetro', label: 'Horômetro', type: 'number', unit: 'h', required: true },
      ]
    },
    {
      id: 'arrefecimento',
      title: 'Líquido de Arrefecimento',
      fields: [
        { id: 'nivel_arrefecimento', label: 'Nível', type: 'select', options: ['Baixo', 'Normal', 'Alto'], required: true },
        { id: 'temperatura', label: 'Temperatura', type: 'number', unit: '°C', required: true },
      ]
    },
    {
      id: 'observacoes',
      title: 'Observações',
      fields: [
        { id: 'observacoes', label: 'Observações', type: 'text', required: false }
      ]
    }
  ]
};

// Mapa de todos os templates
export const checklistTemplatesMap = {
  bomba_recalque: {
    name: 'Bomba de Recalque',
    slug: 'bomba_recalque',
    description: 'Checklist para inspeção de bombas de recalque',
    structure: bombaRecalqueTemplate
  },
  bomba_dreno: {
    name: 'Bomba de Dreno',
    slug: 'bomba_dreno',
    description: 'Checklist para inspeção de bombas de dreno',
    structure: bombaDrenoTemplate
  },
  bomba_piscina: {
    name: 'Bomba de Piscina',
    slug: 'bomba_piscina',
    description: 'Checklist para inspeção de bombas de piscina',
    structure: bombaPiscinaTemplate
  },
  bomba_incendio: {
    name: 'Bomba de Incêndio',
    slug: 'bomba_incendio',
    description: 'Checklist para inspeção de bombas de incêndio',
    structure: bombaIncendioTemplate
  },
  gerador: {
    name: 'Gerador',
    slug: 'gerador',
    description: 'Checklist para inspeção de geradores',
    structure: geradorTemplate
  }
};

export type ChecklistTemplateSlug = keyof typeof checklistTemplatesMap;
