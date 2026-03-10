import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit2, Trash2, ChevronDown, Search, Filter, Download, CheckSquare, Square, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: workOrders = [], isLoading } = trpc.workOrders.list.useQuery({
    adminId,
  });
  
  const exportBatchMutation = trpc.workOrders.exportBatch.useMutation();
  const deleteBatchMutation = trpc.workOrders.deleteBatch.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      setIsDeleting(false);
    },
    onError: (error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
      setIsDeleting(false);
    },
  });

  const handleDeleteBatch = () => {
    setIsDeleting(true);
    deleteBatchMutation.mutate({ ids: selectedIds });
  };

  const handleCreateOS = () => {
    navigate("/admin/work-orders/create");
  };

  const handleViewOS = (id: number) => {
    navigate(`/admin/work-orders/${id}`);
  };

  const handleEditOS = (id: number) => {
    navigate(`/admin/work-orders/${id}/edit`);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredWorkOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWorkOrders.map(o => o.id));
    }
  };
  
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleExportBatch = async () => {
    if (selectedIds.length === 0) return;
    
    setIsExporting(true);
    try {
      const result = await exportBatchMutation.mutateAsync({ ids: selectedIds });
      
      // Criar link para download do ZIP
      const blob = new Blob([Uint8Array.from(atob(result.zipBase64), c => c.charCodeAt(0))], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Limpar seleção
      setSelectedIds([]);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar PDFs');
    } finally {
      setIsExporting(false);
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rotina: "Rotina",
      emergencial: "Emergencial",
      orcamento: "Orçamento",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "rotina":
        return "bg-blue-100 text-blue-800";
      case "emergencial":
        return "bg-red-100 text-red-800";
      case "orcamento":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
      
      // Filtro de tipo
      const matchesType = typeFilter === "all" || order.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [workOrders, searchTerm, statusFilter, priorityFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Ordens de Serviço</h1>
            <p className="text-gray-600 text-sm md:text-base">Gerencie todas as ordens de serviço</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            {selectedIds.length > 0 && (
              <>
                <Button
                  onClick={handleExportBatch}
                  disabled={isExporting}
                  className="bg-green-600 hover:bg-green-700 h-10 md:h-12 px-4 md:px-6 flex items-center gap-2"
                >
                  <Download className="w-4 md:w-5 h-4 md:h-5" />
                  {isExporting ? 'Exportando...' : `Exportar ${selectedIds.length}`}
                </Button>
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 h-10 md:h-12 px-4 md:px-6 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 md:w-5 h-4 md:h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 md:w-5 h-4 md:h-5" />
                  )}
                  {isDeleting ? 'Deletando...' : `Deletar ${selectedIds.length}`}
                </Button>
              </>
            )}
            <Button
              onClick={handleCreateOS}
              className="bg-blue-600 hover:bg-blue-700 h-10 md:h-12 px-4 md:px-6 flex items-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 md:w-5 h-4 md:h-5" />
              Criar OS
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 md:w-5 h-4 md:h-5 text-gray-600" />
            <h2 className="text-base md:text-lg font-semibold">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:gap-4">
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

            {/* Filtro de Tipo */}
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
          
          {/* Contador de resultados e seleção */}
          <div className="mt-3 md:mt-4 flex justify-between items-center">
            <div className="text-xs md:text-sm text-gray-600">
              Mostrando <strong>{filteredWorkOrders.length}</strong> de <strong>{workOrders.length}</strong> ordens de serviço
              {selectedIds.length > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">({selectedIds.length} selecionadas)</span>
              )}
            </div>
            {filteredWorkOrders.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="text-xs md:text-sm"
              >
                {selectedIds.length === filteredWorkOrders.length ? (
                  <><CheckSquare className="w-4 h-4 mr-1" /> Desmarcar todas</>
                ) : (
                  <><Square className="w-4 h-4 mr-1" /> Selecionar todas</>
                )}
              </Button>
            )}
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
          <div className="space-y-3 md:space-y-4">
            {filteredWorkOrders.map((order) => (
              <Card
                key={order.id}
                className="p-4 md:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-3">
                  {/* Checkbox de seleção */}
                  <div className="flex items-start pt-1">
                    <button
                      onClick={() => toggleSelect(order.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {selectedIds.includes(order.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg md:text-xl font-semibold">{order.osNumber}</h3>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getTypeColor(order.type)}`}>
                        {getTypeLabel(order.type)}
                      </span>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getPriorityColor(order.priority)}`}>
                        ● {getPriorityLabel(order.priority)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3 text-sm md:text-base">{order.title}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600">
                       <span>
                          Cliente: <strong>{order.clientName} - #{order.clientId}</strong>
                       </span>
  
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
                  <div className="flex gap-2 justify-end md:justify-start">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Ordens de Servico?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {selectedIds.length} OS? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
