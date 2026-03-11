import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Eye, Edit2, Trash2, Search, Filter, Download, 
  Loader2, ArrowUpDown, ChevronLeft, ChevronRight, User, Calendar
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
import { useDebounce } from "../hooks/useDebounce";

export default function AdminWorkOrders() {
  const [, navigate] = useLocation();
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  // Estados de Filtro e Paginação
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
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

  // Query tRPC conectada ao novo Backend
  const { data, isLoading, refetch } = trpc.workOrders.list.useQuery({
    adminId: Number(adminId),
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    sortBy,
    sortOrder
  });

  const workOrders = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Mutações
  const exportBatchMutation = trpc.workOrders.exportBatch.useMutation();
  const deleteBatchMutation = trpc.workOrders.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success("Ordens excluídas com sucesso");
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      setIsDeleting(false);
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
      setIsDeleting(false);
    },
  });

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
      toast.success("Download iniciado!");
    } catch (error) {
      toast.error("Erro na exportação");
    } finally {
      setIsExporting(false);
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case "critica": return "border-l-4 border-l-red-500";
      case "alta": return "border-l-4 border-l-orange-500";
      default: return "border-l-4 border-l-blue-500";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Ordens de Serviço</h1>
            <p className="text-slate-500 text-sm">Lista geral de manutenções e atendimentos.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {selectedIds.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportBatch} disabled={isExporting} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Exportar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={isDeleting}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button onClick={() => navigate("/admin/work-orders/new")} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nova OS
            </Button>
          </div>
        </div>

        {/* FILTROS */}
        <Card className="p-4 shadow-sm border-none">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por número ou título..." 
                className="pl-9 bg-slate-50 border-slate-200"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
              const [key, order] = v.split("-");
              setSortBy(key);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="bg-slate-50">
                <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Mais Recentes</SelectItem>
                <SelectItem value="createdAt-asc">Mais Antigas</SelectItem>
                <SelectItem value="title-asc">Título (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
            {/* ALERTA DE ORÇAMENTO PENDENTE */}
{workOrders.some(os => os.type === 'orcamento' && os.status === 'aguardando_aprovacao') && (
  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r-lg shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="bg-amber-400 p-1.5 rounded-full">
        <Filter className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-amber-800">Orçamentos Pendentes!</p>
        <p className="text-xs text-amber-700">Existem serviços aguardando sua aprovação ou do cliente.</p>
      </div>
    </div>
    <Button 
      variant="outline" 
      size="sm" 
      className="border-amber-300 text-amber-800 hover:bg-amber-100"
      onClick={() => { setTypeFilter('orcamento'); setStatusFilter('aguardando_aprovacao'); }}
    >
      Filtrar agora
    </Button>
  </div>
)}


        {/* LISTA */}
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
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : workOrders.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Filter className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900">Nenhuma ordem encontrada</h3>
              <Button variant="link" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>Limpar filtros</Button>
            </Card>
          ) : (
            workOrders.map((order) => (
              <Card 
                key={order.id} 
                className={`group transition-all hover:shadow-md border-slate-200 ${getPriorityBorder(order.priority)}`}
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
                  <span className="text-[10px] font-bold text-slate-400">#{order.osNumber}</span>
    
                   {/* BADGE DE TIPO - ADICIONADO AQUI */}
                    <Badge variant="outline" className={`text-[10px] font-bold ${
                     order.type === 'emergencial' ? 'border-red-200 text-red-700 bg-red-50' :
                      order.type === 'orcamento' ? 'border-purple-200 text-purple-700 bg-purple-50' :
                     order.type === 'rotina' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                      'border-slate-200 text-slate-700 bg-slate-50'
                }`}>
                      {order.type?.toUpperCase() || 'GERAL'}
                      </Badge>

                       <StatusBadge status={order.status} />
                        <PriorityBadge priority={order.priority} />
                </div>
                    
                    <h3 className="text-slate-900 font-bold truncate md:text-lg mb-2">{order.title}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <strong>Cliente:</strong> {order.clientName || `ID #${order.clientId}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <strong>Data:</strong> {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/work-orders/${order.id}`)} className="text-slate-400 hover:text-blue-600">
                      <Eye className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/work-orders/${order.id}/edit`)} className="text-slate-400 hover:text-amber-600">
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
            <p className="text-sm text-slate-500">Página {page} de {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} ordens?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setIsDeleting(true); deleteBatchMutation.mutate({ ids: selectedIds }); }} className="bg-red-600">
              Confirmar Exclusão
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}