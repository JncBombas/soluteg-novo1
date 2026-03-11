import React from 'react';

// O "export" serve para que outros arquivos consigam enxergar este componente
export const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string; class: string }> = {
    aberta: { label: "Aberta", class: "bg-blue-100 text-blue-700 border-blue-200" },
    em_andamento: { label: "Em Andamento", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    concluida: { label: "Concluída", class: "bg-green-100 text-green-700 border-green-200" },
    cancelada: { label: "Cancelada", class: "bg-red-100 text-red-700 border-red-200" },
    aguardando_aprovacao: { label: "Aguardando", class: "bg-purple-100 text-purple-700 border-purple-200" },
    rejeitada: { label: "Rejeitada", class: "bg-gray-100 text-gray-700 border-gray-200" },
  };

  // Se o status não existir na lista acima, ele usa um padrão cinza
  const config = configs[status.toLowerCase()] || { label: status, class: "bg-gray-100 text-gray-600 border-gray-200" };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.class}`}>
      {config.label}
    </span>
  );
};

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const configs: Record<string, { label: string; class: string }> = {
    critica: { label: "Crítica", class: "bg-red-600 text-white border-red-700" },
    alta: { label: "Alta", class: "bg-orange-500 text-white border-orange-600" },
    normal: { label: "Normal", class: "bg-blue-500 text-white border-blue-600" },
  };

  const config = configs[priority.toLowerCase()] || configs.normal;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${config.class}`}>
      {config.label}
    </span>
  );
};