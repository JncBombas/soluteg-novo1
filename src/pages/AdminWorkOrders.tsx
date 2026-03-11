import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Eye, Edit2, Trash2, Search, Filter, Download, 
  CheckSquare, Square, Loader2, ArrowUpDown, ChevronLeft, ChevronRight 
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function AdminWorkOrders() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  // Estados de Filtro e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Estado de Ordenação
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query tRPC com Paginação e Filtros via Backend
  const { data, isLoading } = trpc.workOrders.list.useQuery({
    adminId,
    page,
    limit: pageSize,
    search: searchTerm,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    sortBy,
    sortOrder
  });

  const workOrders = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Mutantes
  const exportBatchMutation = trpc.workOrders.exportBatch.useMutation();
  const deleteBatchMutation = trpc.workOrders.deleteBatch.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      setIsDeleting(false);
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
      setIsDeleting(false);
    },
  });

  // Funções de Auxílio
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberta: "bg-blue-100 text-blue-700 border-blue-200",
      em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
      concluida: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelada: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case "critica": return "border-l-4 border-l-red-500";
      case "alta": return "border-l-4 border-l-orange-500";
      default: return "border-l-4 border-l-emerald-500";
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === workOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workOrders.map(o => o.id));
    }
  };

  const handleExportBatch = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    try {
      const result = await exportBatchMutation.mutateAsync({ ids: selectedIds });
      const blob = new Blob([Uint8Array.from(atob(result.zipBase64), c => c.charCodeAt(0))], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      setSelectedIds([]);
      toast.success("Exportação concluída!");
    } catch (error) {
      toast.error("Erro ao exportar PDFs");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER DINÂMICO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Ordens de Serviço</h1>
            <p className="text-slate-500 text-sm">Gerencie solicitações e manutenções do sistema.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {selectedIds.length > 0 && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
                <Button variant="outline" size="sm" onClick={handleExportBatch} disabled={isExporting} className="hidden md:flex border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Exportar {selectedIds.length}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Deletar {selectedIds.length}</span>
                </Button>
              </div>
            )}
            <Button onClick={() => navigate("/admin/work-orders/new")} className="bg-blue-600 hover:bg-blue-700 shadow-sm ml-auto md:ml-0">
              <Plus className="w-4 h-4 mr-2" /> Nova OS
            </Button>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <Card className="p-4 border-none shadow-sm bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por número ou título..." 
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
              const [key, order] = v.split("-");
              setSortBy(key);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="bg-slate-50">
                <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Mais Recentes</SelectItem>
                <SelectItem value="createdAt-asc">Mais Antigas</SelectItem>
                <SelectItem value="title-asc">Título (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* LISTA DE OS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-sm text-slate-500">
             <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedIds.length === workOrders.length && workOrders.length > 0} 
                  onCheckedChange={toggleSelectAll}
                />
                <span>Selecionar todos</span>
             </div>
             <span>Total: {totalCount}</span>
          </div>

          {isLoading ? (
            // Skeleton Loader
            [1, 2, 3].map(i => (
              <div key={i} className="h-32 w-full bg-slate-200 animate-pulse rounded-xl" />
            ))
          ) : workOrders.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="flex flex-col items-center gap-2">
                <Filter className="w-12 h-12 text-slate-200" />
                <h3 className="font-semibold text-slate-900">Nenhum resultado</h3>
                <p className="text-slate-500 text-sm">Tente ajustar seus filtros ou busca.</p>
                <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>Limpar tudo</Button>
              </div>
            </Card>
          ) : (
            workOrders.map((order) => (
              <Card 
                key={order.id} 
                className={`group relative overflow-hidden transition-all hover:shadow-md border-slate-200 ${getPriorityBorder(order.priority)}`}
              >
                <div className="p-4 md:p-5 flex items-start gap-4">
                  <div className="pt-1">
                    <Checkbox 
                      checked={selectedIds.includes(order.id)} 
                      onCheckedChange={() => setSelectedIds(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">#{order.osNumber}</span>
                      <Badge variant="outline" className={`${getStatusColor(order.status)} border-none text-[10px] font-bold`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <h3 className="text-slate-900 font-bold truncate md:text-lg mb-1">{order.title}</h3>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-x-6 gap-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <strong>Cliente:</strong> {order.clientName}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <strong>Data:</strong> {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/work-orders/${order.id}`)} className="h-9 w-9 text-slate-400 hover:text-blue-600">
                      <Eye className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/work-orders/${order.id}/edit`)} className="h-9 w-9 text-slate-400 hover:text-amber-600">
                      <Edit2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 hidden md:block">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 md:flex-none"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 md:flex-none"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Botão Voltar */}
        <Button variant="ghost" onClick={() => navigate("/admin/dashboard")} className="text-slate-500 hover:text-slate-900">
          ← Voltar para o Dashboard
        </Button>

      </div>

      {/* DIALOG DE DELEÇÃO */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a deletar <strong>{selectedIds.length}</strong> ordens de serviço. 
              Esta ação é permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setIsDeleting(true); deleteBatchMutation.mutate({ ids: selectedIds }); }} className="bg-red-600">
              Sim, deletar tudo
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}