// ============================================================
// URL base da API
// Em desenvolvimento local, use o IP do seu computador na rede
// Wi-Fi (não use "localhost" — o celular não enxerga o PC assim).
// Exemplo: http://192.168.1.100:5000
// Configure via variável de ambiente no arquivo mobile/.env:
//   EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
// Em produção, a variável aponta para: https://app.soluteg.com.br
// ============================================================
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://app.soluteg.com.br";

// Rótulos de exibição para cada status de OS
export const WO_STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  em_andamento: "Em Andamento",
  pausada: "Pausada",
  concluida: "Concluída",
  aguardando_pagamento: "Aguardando Pagamento",
  cancelada: "Cancelada",
};

// Cor (hex) associada a cada status — usada nos badges e barras
export const WO_STATUS_COLOR: Record<string, string> = {
  aberta: "#6b7280",
  aguardando_aprovacao: "#f59e0b",
  aprovada: "#10b981",
  rejeitada: "#ef4444",
  em_andamento: "#3b82f6",
  pausada: "#8b5cf6",
  concluida: "#059669",
  aguardando_pagamento: "#f97316",
  cancelada: "#9ca3af",
};

// Rótulos dos tipos de OS
export const WO_TYPE_LABEL: Record<string, string> = {
  rotina: "Rotina",
  emergencial: "Emergencial",
  instalacao: "Instalação",
  manutencao: "Manutenção",
  corretiva: "Corretiva",
  preventiva: "Preventiva",
};

// Status que permitem o técnico interagir com tarefas, fotos e observações
export const ACTIVE_STATUSES = ["em_andamento", "pausada"];
