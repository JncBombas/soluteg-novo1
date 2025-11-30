import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WorkOrder {
  id: number;
  osNumber: string;
  title: string;
  description?: string;
  serviceType?: string;
  status: "aberta" | "em_andamento" | "concluida" | "cancelada";
  priority: "baixa" | "media" | "alta";
  scheduledDate?: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminViewWorkOrder() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/work-orders/:id");
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const osId = params?.id ? parseInt(params.id) : null;

  useEffect(() => {
    if (!osId) {
      setError("ID da OS não encontrado");
      setLoading(false);
      return;
    }

    loadWorkOrder();
  }, [osId]);

  const loadWorkOrder = async () => {
    if (!osId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/work-orders/${osId}`);
      
      if (!response.ok) {
        throw new Error("Erro ao carregar OS");
      }

      const data = await response.json();
      setWorkOrder(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao carregar OS";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberta":
        return "bg-blue-100 text-blue-800";
      case "em_andamento":
        return "bg-yellow-100 text-yellow-800";
      case "concluida":
        return "bg-green-100 text-green-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "baixa":
        return "text-green-600";
      case "media":
        return "text-yellow-600";
      case "alta":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      baixa: "Baixa",
      media: "Média",
      alta: "Alta",
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando ordem de serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/work-orders")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error || "Ordem de serviço não encontrada"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/work-orders")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation(`/admin/work-orders/${workOrder.id}/edit`)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{workOrder.title}</CardTitle>
                <CardDescription className="mt-2">
                  OS #{workOrder.osNumber}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workOrder.status)}`}>
                  {getStatusLabel(workOrder.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(workOrder.priority)} bg-gray-100`}>
                  Prioridade: {getPriorityLabel(workOrder.priority)}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Descrição */}
            {workOrder.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{workOrder.description}</p>
              </div>
            )}

            {/* Tipo de Serviço */}
            {workOrder.serviceType && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Tipo de Serviço</h3>
                <p className="text-gray-700">{workOrder.serviceType}</p>
              </div>
            )}

            {/* Grid de Informações */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data Agendada</h3>
                <p className="text-gray-700">
                  {workOrder.scheduledDate
                    ? new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR")
                    : "Não agendada"}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data de Conclusão</h3>
                <p className="text-gray-700">
                  {workOrder.completedDate
                    ? new Date(workOrder.completedDate).toLocaleDateString("pt-BR")
                    : "Não concluída"}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Horas Estimadas</h3>
                <p className="text-gray-700">{workOrder.estimatedHours || "-"} horas</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Horas Reais</h3>
                <p className="text-gray-700">{workOrder.actualHours || "-"} horas</p>
              </div>
            </div>

            {/* Datas de Criação */}
            <div className="border-t pt-4 text-sm text-gray-600">
              <p>Criada em: {new Date(workOrder.createdAt).toLocaleDateString("pt-BR")}</p>
              <p>Última atualização: {new Date(workOrder.updatedAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
