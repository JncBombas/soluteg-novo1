import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit2, Trash2, ChevronDown, Search, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AdminWorkOrders() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

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
      case "normal":
        return "text-green-600";
      case "alta":
        return "text-yellow-600";
      case "critica":
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
      normal: "Normal",
      alta: "Alta",
      critica: "Crítica",
    };
    return labels[priority] || priority;
  };

  // Filtrar ordens de serviço
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((order) => {
      // Filtro de busca
      const matchesSearch = searchTerm === "" || 
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.osNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de status
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      // Filtro de prioridade
      const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [workOrders, searchTerm, statusFilter, priorityFilter]);

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

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por título ou número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Prioridade */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as prioridades</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Contador de resultados */}
          <div className="mt-4 text-sm text-gray-600">
            Mostrando <strong>{filteredWorkOrders.length}</strong> de <strong>{workOrders.length}</strong> ordens de serviço
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Carregando ordens de serviço...</p>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && filteredWorkOrders.length === 0 && workOrders.length === 0 && (
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

        {/* No Results State */}
        {!isLoading && filteredWorkOrders.length === 0 && workOrders.length > 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-2">Nenhuma ordem de serviço encontrada com os filtros aplicados</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
            >
              Limpar filtros
            </Button>
          </Card>
        )}

        {/* Work Orders List */}
        {!isLoading && filteredWorkOrders.length > 0 && (
          <div className="space-y-4">
            {filteredWorkOrders.map((order) => (
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
                      <span>Cliente ID: <strong>{order.clientId}</strong></span>
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

        {/* Back Button - Always visible */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2"
          >
            ← Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
