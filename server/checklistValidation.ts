/**
 * Sistema de validação inteligente de checklists por tipo de equipamento
 * Cada tipo tem campos obrigatórios específicos
 */

export type ChecklistType = 
  | "bomba_recalque"
  | "dreno"
  | "piscina"
  | "incendio"
  | "gerador";

export interface ChecklistResponse {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Define campos obrigatórios por tipo de equipamento
 */
const REQUIRED_FIELDS_BY_TYPE: Record<ChecklistType, string[]> = {
  bomba_recalque: [
    "tensao",
    "fases",
    "num_bombas",
    // Campos dinâmicos: corrente_bomba_1, corrente_bomba_2, etc
  ],
  dreno: [
    "tipo_dreno",
    "profundidade",
  ],
  piscina: [
    "volume_agua",
    "tipo_filtro",
  ],
  incendio: [
    "tipo_sistema",
    "pressao_saida",
  ],
  gerador: [
    "potencia_kva",
    "combustivel",
    "horas_funcionamento",
  ],
};

/**
 * Define campos que são dinâmicos (baseados em outro campo)
 */
const DYNAMIC_FIELDS: Record<ChecklistType, Record<string, string>> = {
  bomba_recalque: {
    num_bombas: "corrente_bomba", // Se num_bombas = 2, precisa de corrente_bomba_1 e corrente_bomba_2
  },
  dreno: {},
  piscina: {},
  incendio: {},
  gerador: {},
};

/**
 * Valida respostas de um checklist específico
 * Retorna { isValid, errors }
 */
export function validateChecklistResponses(
  type: ChecklistType,
  responses: ChecklistResponse
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar campos obrigatórios estáticos
  const requiredFields = REQUIRED_FIELDS_BY_TYPE[type] || [];
  
  for (const field of requiredFields) {
    const value = responses[field];
    
    // Verificar se campo existe e não está vazio
    if (value === undefined || value === null || value === "") {
      errors.push(`Campo obrigatório "${field}" não preenchido`);
    }
  }

  // Validar campos dinâmicos
  const dynamicFields = DYNAMIC_FIELDS[type] || {};
  
  for (const [parentField, childFieldPrefix] of Object.entries(dynamicFields)) {
    const parentValue = responses[parentField];
    
    if (parentValue && typeof parentValue === "number" && parentValue > 0) {
      // Verificar se todos os campos dinâmicos existem
      for (let i = 1; i <= parentValue; i++) {
        const childField = `${childFieldPrefix}_${i}`;
        const childValue = responses[childField];
        
        if (childValue === undefined || childValue === null || childValue === "") {
          errors.push(`Campo obrigatório "${childField}" não preenchido (baseado em ${parentField}=${parentValue})`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Obtém lista de campos obrigatórios para um tipo
 * Útil para mostrar na UI quais campos são obrigatórios
 */
export function getRequiredFieldsForType(type: ChecklistType): string[] {
  return REQUIRED_FIELDS_BY_TYPE[type] || [];
}

/**
 * Obtém descrição amigável de um tipo de checklist
 */
export function getChecklistTypeLabel(type: ChecklistType): string {
  const labels: Record<ChecklistType, string> = {
    bomba_recalque: "Bomba de Recalque",
    dreno: "Dreno",
    piscina: "Piscina",
    incendio: "Sistema de Incêndio",
    gerador: "Gerador",
  };
  return labels[type] || type;
}

/**
 * Valida se um tipo é válido
 */
export function isValidChecklistType(type: string): type is ChecklistType {
  const validTypes: ChecklistType[] = [
    "bomba_recalque",
    "dreno",
    "piscina",
    "incendio",
    "gerador",
  ];
  return validTypes.includes(type as ChecklistType);
}

/**
 * Exemplo de uso:
 * 
 * const responses = {
 *   tensao: "220V",
 *   fases: "Trifásico",
 *   num_bombas: 2,
 *   corrente_bomba_1: 8,
 *   corrente_bomba_2: 9,
 * };
 * 
 * const validation = validateChecklistResponses("bomba_recalque", responses);
 * if (!validation.isValid) {
 *   console.log("Erros:", validation.errors);
 * }
 */
