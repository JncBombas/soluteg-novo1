import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface TimelineEntry {
  id: number;
  workOrderId: number;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string;
  changedByType: string;
  notes: string | null;
  createdAt: Date;
}

interface WorkOrderTimelineProps {
  workOrderId: number;
  history: TimelineEntry[];
}

export default function WorkOrderTimeline({ workOrderId, history }: WorkOrderTimelineProps) {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      aguardando_aprovacao: "Aguardando Aprovação",
      aprovada: "Aprovada",
      rejeitada: "Rejeitada",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      aguardando_pagamento: "Aguardando Pagamento",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      aberta: <FileText className="h-4 w-4" />,
      aguardando_aprovacao: <Clock className="h-4 w-4" />,
      aprovada: <CheckCircle2 className="h-4 w-4" />,
      rejeitada: <XCircle className="h-4 w-4" />,
      em_andamento: <AlertCircle className="h-4 w-4" />,
      concluida: <CheckCircle2 className="h-4 w-4" />,
      aguardando_pagamento: <Clock className="h-4 w-4" />,
      cancelada: <XCircle className="h-4 w-4" />,
    };
    return icons[status] || <FileText className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberta: "bg-blue-500",
      aguardando_aprovacao: "bg-yellow-500",
      aprovada: "bg-green-500",
      rejeitada: "bg-red-500",
      em_andamento: "bg-purple-500",
      concluida: "bg-green-600",
      aguardando_pagamento: "bg-orange-500",
      cancelada: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico e Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {history && history.length > 0 ? (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-6">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 w-8 h-8 rounded-full ${getStatusColor(
                      entry.newStatus
                    )} flex items-center justify-center text-white`}
                  >
                    {getStatusIcon(entry.newStatus)}
                  </div>

                  {/* Content */}
                  <div className="bg-white border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            Status alterado para
                          </span>
                          <Badge className={getStatusColor(entry.newStatus)}>
                            {getStatusLabel(entry.newStatus)}
                          </Badge>
                        </div>
                        {entry.previousStatus && (
                          <p className="text-sm text-gray-600 mt-1">
                            De: {getStatusLabel(entry.previousStatus)}
                          </p>
                        )}
                      </div>
                    </div>

                    {entry.notes && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {entry.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-600 pt-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {entry.changedBy}
                          {entry.changedByType === "admin" ? " (Admin)" : " (Cliente)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(entry.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma mudança de status registrada</p>
            <p className="text-sm mt-1">
              O histórico de alterações aparecerá aqui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
