import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Eye, Edit2, Trash2, Search, Filter, X, 
  Clock, AlertCircle, FileText, CheckCircle, 
  Calendar, RefreshCw, DollarSign
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OSType = "rotina" | "emergencial" | "orcamento";
type OSStatus = "aberta" | "aguardando_aprovacao" | "aprovada" | "rejeitada" | "em_andamento" | "concluida" | "aguardando_pagamento" | "cancelada";
type OSPriority = "normal" | "alta" | "critica";

interface WorkOrder {
  id: number;
  osNumber: string;
  type: OSType;
  status: OSStatus;
  priority: OSPriority;
  title: string;
  description?: string | null;
  clientId: number;
  scheduledDate?: Date | null;
  isRecurring: number;
  estimatedValue?: number | null;
  createdAt: Date;
}

export default function AdminWorkOrdersNew() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOsId, setSelectedOsId] = useState<number | null>(null);

  // Query
  const { data, isLoading, refetch } = trpc.workOrders.list.useQuery({
    adminId,
    type: typeFilter !== "all" ? typeFilter as OSType : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });

  const workOrders = data?.items ?? [];

  const deleteMutation = trpc.workOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("OS deletada com sucesso");
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao deletar OS");
    },
  });

  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || `Cliente #${clientId}`;
  };

  const getTypeConfig = (type: OSType) => {
    const configs = {
      rotina: { label: "Rotina", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      emergencial: { label: "Emergencial", color: "bg-red-100 text-red-800", icon: AlertCircle },
      orcamento: { label: "Orçamento", color: "bg-purple-100 text-purple-800", icon: DollarSign },
    };
    return configs[type];
  };

  const getStatusConfig = (status: OSStatus) => {
    const configs: Record<OSStatus, { label: string; color: string }> = {
      aberta: { label: "Aberta", color: "bg-blue-100 text-blue-800" },
      aguardando_aprovacao: { label: "Aguardando Aprovação", color: "bg-yellow-100 text-yellow-800" },
      aprovada: { label: "Aprovada", color: "bg-green-100 text-green-800" },
      rejeitada: { label: "Rejeitada", color: "bg-red-100 text-red-800" },
      em_andamento: { label: "Em Andamento", color: "bg-orange-100 text-orange-800" },
      concluida: { label: "Concluída", color: "bg-green-100 text-green-800" },
      aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-800" },
      cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-800" },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: OSPriority) => {
    const configs = {
      normal: { label: "Normal", color: "text-green-600" },
      alta: { label: "Alta", color: "text-yellow-600" },
      critica: { label: "Crítica", color: "text-red-600" },
    };
    return configs[priority];
  };

  const filteredOrders = workOrders.filter(order => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const clientName = getClientName(order.clientId).toLowerCase();
      return (
        order.osNumber.toLowerCase().includes(search) ||
        order.title.toLowerCase().includes(search) ||
        clientName.includes(search)
      );
    }
    return true;
  });

  const handleDelete = (id: number) => {
    setSelectedOsId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedOsId) {
      deleteMutation.mutate({ id: selectedOsId });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = searchTerm || typeFilter !== "all" || statusFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Ordens de Serviço</h1>
              <p className="text-gray-600">Gerencie todas as OS do sistema</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/dashboard")}
              >
                ← Voltar
              </Button>
              <Button
                onClick={() => navigate("/admin/work-orders/create")}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova OS
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número, título ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="rotina">Rotina</SelectItem>
                  <SelectItem value="emergencial">Emergencial</SelectItem>
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Limpar
              </Button>
            )}
          </div>
        </Card>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workOrders.length}</p>
                <p className="text-sm text-gray-600">Total de OS</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {workOrders.filter(o => o.status === "em_andamento").length}
                </p>
                <p className="text-sm text-gray-600">Em Andamento</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {workOrders.filter(o => o.status === "aguardando_aprovacao").length}
                </p>
                <p className="text-sm text-gray-600">Aguardando Aprovação</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {workOrders.filter(o => o.status === "concluida").length}
                </p>
                <p className="text-sm text-gray-600">Concluídas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Lista de OS */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando ordens de serviço...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {hasActiveFilters ? "Nenhuma OS encontrada" : "Nenhuma OS cadastrada"}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? "Tente ajustar os filtros de busca" 
                : "Crie sua primeira ordem de serviço"}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => navigate("/admin/work-orders/create")} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova OS
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const typeConfig = getTypeConfig(order.type);
              const statusConfig = getStatusConfig(order.status);
              const priorityConfig = getPriorityConfig(order.priority);
              const TypeIcon = typeConfig.icon;

              return (
                <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {order.osNumber}
                        </span>
                        <Badge className={typeConfig.color}>
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {typeConfig.label}
                        </Badge>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        <span className={`text-sm font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                        {order.isRecurring === 1 && (
                          <Badge variant="outline" className="gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Recorrente
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1">{order.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Cliente: <strong>{getClientName(order.clientId)}</strong></span>
                        {order.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(order.scheduledDate).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {order.estimatedValue && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            R$ {order.estimatedValue.toFixed(2)}
                          </span>
                        )}
                        <span className="text-gray-400">
                          Criada em {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/work-orders/${order.id}`)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/work-orders/${order.id}/edit`)}
                        className="gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(order.id)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );


}
