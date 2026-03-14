import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // FLUXO 1: EMERGENCIAL (Foco em velocidade e alerta)
  aberta: { label: "Aberta", color: "bg-red-100 text-red-700 border-red-200 shadow-sm" },
  
  // FLUXO 3: ORÇAMENTO (Aguardando ação)
  aguardando_aprovacao: { label: "Aguardando Aprovação", color: "bg-amber-100 text-amber-700 border-amber-200 animate-pulse" },
  aprovada: { label: "Aprovada", color: "bg-lime-100 text-lime-700 border-lime-200" },
  
  // STATUS DE EXECUÇÃO
  em_andamento: { label: "Em Atendimento", color: "bg-blue-600 text-white border-blue-700" }, 
  aprovada_em_andamento: { label: "Executando (Aprovada)", color: "bg-emerald-600 text-white border-emerald-700" },
  
  // FINALIZAÇÃO
  concluida: { label: "Concluída", color: "bg-green-100 text-green-700 border-green-200" },
  aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  cancelada: { label: "Cancelada", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace("_", " ").toUpperCase(),
    color: "bg-gray-100 text-gray-600",
  };

  return (
    <Badge variant="outline" className={`text-[10px] font-extrabold px-2 py-0.5 whitespace-nowrap ${config.color}`}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const priorities: Record<string, string> = {
    critica: "bg-red-600 text-white border-red-700 shadow-sm",
    alta: "bg-orange-500 text-white border-orange-600",
    normal: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <Badge className={`text-[10px] uppercase font-black px-2 py-0.5 ${priorities[priority] || priorities.normal}`}>
      {priority}
    </Badge>
  );
}