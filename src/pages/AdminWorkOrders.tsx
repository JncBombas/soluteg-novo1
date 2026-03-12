import { StatusBadge } from "../components/StatusBadge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Eye, Edit2, Trash2, Search, Filter, Download, 
  Loader2, ArrowUpDown, ChevronLeft, ChevronRight, User, Calendar, AlertCircle
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

  // Query tRPC
  const { data, isLoading, refetch } = trpc.workOrders.list.useQuery({
    adminId: Number(adminId),
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter !== "all" ? statusFilter : undefined,
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
      toast.success("Ordens excluídas");
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      setIsDeleting(false);
      refetch();
    },
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === workOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workOrders.map(o => o.id));
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case "critica": return "border-l-[6px] border-l-red-600";
      case "alta": return "border-l-[6px] border-l-orange-500";
      case "normal": return "border-l-[6px] border-l-emerald-500"; // Verde Soluteg
      default: return "border-l-[6px] border-l-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Ordens</h1>
            <p className="text-slate-500 text-sm">Gerencie atendimentos e orçamentos.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                Excluir ({selectedIds.length})
              </Button>
            )}
            <Button onClick={() => navigate("/admin/work-orders/new")} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nova OS
            </Button>
          </div>
        </div>

        {/* ALERTA DE ORÇAMENTO PENDENTE */}
        {workOrders.some(os => os.type === 'orcamento' && os.status === 'aguardando_aprovacao') && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-bold text-amber-900">Existem orçamentos aguardando aprovação!</p>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-amber-700 underline"
              onClick={() => { setTypeFilter('orcamento'); setStatusFilter('aguardando_aprovacao'); }}
            >
              Ver agora
            </Button>
          </div>
        )}

        {/* FILTROS */}
        <Card className="p-4 shadow-sm border-none bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar OS..." 
                className="pl-9 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Tipo de OS" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="emergencial">Emergencial</SelectItem>
                <SelectItem value="rotina">Rotina</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* LISTA DE CARDS */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
           {workOrders.map((order) => (
  <div 
    key={order.id} 
    className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-4 bg-white"
  >
    {/* CABEÇALHO DO TIPO - SÓLIDO E SEM BORDAS SOBRANDO */}
    <div className={`px-4 py-2 flex justify-between items-center ${
      order.type === 'emergencial' ? 'bg-red-600' : 
      order.type === 'orcamento' ? 'bg-purple-700' : 
      'bg-emerald-600'
    }`}>
      <span className="text-[11px] font-black uppercase tracking-widest text-white">
        OS {order.type}
      </span>
      <span className="text-[10px] font-bold text-white/80">
        #{order.osNumber || order.id}
      </span>
    </div>

    {/* CORPO DO CARD */}
    <div className="p-4 flex items-start gap-4">
      <Checkbox 
        checked={selectedIds.includes(order.id)} 
        onCheckedChange={() => 
          setSelectedIds(prev => 
            prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
          )
        }
        className="mt-1 border-slate-300"
      />
      
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <StatusBadge status={order.status} />
        </div>
        
        {/* Título com máximo impacto visual */}
        <h3 className="text-slate-900 font-black text-xl mb-2 leading-tight tracking-tight">
          {order.title}
        </h3>
        
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-800">
              {order.clientName || 'Cliente não definido'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">
              {new Date(order.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
))}

        {/* PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6">
            <p className="text-sm text-slate-500 font-medium">Mostrando {workOrders.length} de {totalCount}</p>
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
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle></AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setIsDeleting(true); deleteBatchMutation.mutate({ ids: selectedIds }); }} className="bg-red-600">
              Sim, excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}