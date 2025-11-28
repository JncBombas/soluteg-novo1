import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Eye, Edit2, Trash2, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AdminWorkOrders() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  const { data: workOrders = [], isLoading } = trpc.workOrders.list.useQuery({
    adminId,
  });

  const handleCreateOS = () => {
    navigate("/admin/work-orders/create");
  };

  const handleViewOS = (id: number) => {
    navigate(`/admin/work-orders/${id}`);
  };

  const handleEditOS = (id: number) => {
    navigate(`/admin/work-orders/${id}/edit`);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ordens de Serviço</h1>
            <p className="text-gray-600">Gerencie todas as ordens de serviço</p>
          </div>
          <Button
            onClick={handleCreateOS}
            className="bg-blue-600 hover:bg-blue-700 h-12 px-6 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar OS
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Carregando ordens de serviço...</p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && workOrders.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">Nenhuma ordem de serviço criada ainda</p>
            <Button
              onClick={handleCreateOS}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira OS
            </Button>
          </Card>
        )}

        {/* Work Orders List */}
        {!isLoading && workOrders.length > 0 && (
          <div className="space-y-4">
            {workOrders.map((order) => (
              <Card
                key={order.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{order.osNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(order.priority)}`}>
                        Prioridade: {getPriorityLabel(order.priority)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{order.title}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Cliente: <strong>{order.clientName}</strong></span>
                      {order.scheduledDate && (
                        <span>
                          Data: <strong>{new Date(order.scheduledDate).toLocaleDateString("pt-BR")}</strong>
                        </span>
                      )}
                      <span>
                        Criado: <strong>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOS(order.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOS(order.id)}
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
