import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function formatCurrency(cents: number | null | undefined): string {
  if (!cents && cents !== 0) return "—";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export const BUDGET_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  finalizado: "Ag. Aprovação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export const BUDGET_STATUS_COLOR: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800 border-amber-200",
  finalizado: "bg-blue-100 text-blue-800 border-blue-200",
  aprovado: "bg-green-100 text-green-800 border-green-200",
  reprovado: "bg-red-100 text-red-800 border-red-200",
};

export const BUDGET_STATUS_STRIPE: Record<string, string> = {
  pendente: "#f59e0b",
  finalizado: "#3b82f6",
  aprovado: "#22c55e",
  reprovado: "#ef4444",
};

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  instalacao: "Instalação",
  manutencao: "Manutenção",
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  rotina: "Rotina",
  emergencial: "Emergencial",
};
