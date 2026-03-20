import { StatusBadge } from "../components/StatusBadge";
import { useState } from "react";
// UI COMPONENTS: Componentes de interface (botões, cards, inputs, seletores)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ICONS: Biblioteca Lucide para os símbolos visuais
import { 
  Plus, Eye, Edit2, Trash2, Search, Filter, Download, 
  Loader2, ArrowUpDown, ChevronLeft, ChevronRight, User, Calendar, AlertCircle,
  ArrowLeft 
} from "lucide-react";
import { toast } from "sonner"; // Notificações flutuantes
// ALERT DIALOG: Janelas de confirmação (ex: "Tem certeza que deseja excluir?")
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter"; // Navegação de rotas
import { trpc } from "@/lib/trpc"; // Comunicação com o Backend
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from "../hooks/useDebounce"; // Gancho para atrasar a busca enquanto digita

export default function AdminWorkOrders() {
  const [, navigate] = useLocation();
  
  // Recupera o ID do Administrador logado para filtrar as OS dele
  const [adminId] = useState(() => {
    const stored = localStorage.getItem("adminId");
    return stored ? parseInt(stored) : 1;
  });

  // --- ESTADOS DE FILTRO E BUSCA ---
  const [searchTerm, setSearchTerm] = useState("");
  // Debounce: Evita fazer uma busca no banco a cada letra digitada (espera 500ms de silêncio)
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // --- PAGINAÇÃO E ORDENAÇÃO ---
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- ESTADOS DE SELEÇÃO E EXCLUSÃO ---
  const [selectedIds, setSelectedIds] = useState<number[]>([]); // Lista de IDs marcados com checkbox
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // Controla o pop-up de exclusão

  // --- BUSCA DE DADOS (QUERY) ---
  // Faz o "Fetch" das ordens de serviço baseado em todos os filtros acima
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

  // Atalhos para os dados retornados
  const workOrders = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // --- AÇÃO DE EXCLUSÃO (MUTATION) ---
  const deleteBatchMutation = trpc.workOrders.deleteBatch.useMutation({
    onSuccess: () => {
      toast.success("Ordens excluídas");
      setSelectedIds([]); // Limpa a seleção
      setDeleteDialogOpen(false); // Fecha o pop-up
      refetch(); // Recarrega a lista
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- CABEÇALHO (HEADER) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Painel de Ordens</h1>
            <p className="text-slate-500 text-sm">Gerencie atendimentos e orçamentos.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Botão de excluir em massa - só aparece se houver itens selecionados */}
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir ({selectedIds.length})
              </Button>
            )}
            
            {/* Botão de retorno ao Dashboard principal */}
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/dashboard")}
              className="gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </Button>

            {/* Botão para criar nova OS */}
            <Button onClick={() => navigate("/admin/work-orders/new")} >
               Nova OS
            </Button>
          </div>
        </div>

        {/* --- SEÇÃO DE FILTROS --- */}
        <Card className="p-4 shadow-sm border-none bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar OS..." 
                className="pl-9 bg-slate-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtro por Status (Aberta, Em andamento, etc) */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por Tipo (Emergencial, Rotina, Orçamento) */}
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

        {/* --- LISTAGEM DE CARDS --- */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {workOrders.map((order) => {
                // Lógica de cores baseada no tipo e prioridade
                const typeColor = order.type === 'emergencial' ? '#dc2626' : order.type === 'orcamento' ? '#7e22ce' : '#059669';
                const priorityColor = order.priority === 'critica' || order.priority === 'urgente' ? '#dc2626' : order.priority === 'alta' ? '#f97316' : '#10b981';

                return (
                  <div 
                    key={order.id} 
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-2 border-slate-200 mb-4 cursor-pointer flex flex-col relative overflow-hidden"
                    onClick={() => navigate(`/admin/work-orders/${order.id}`)}
                  >
                    {/* Barra lateral colorida indicando a prioridade */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[8px] z-20"
                      style={{ backgroundColor: priorityColor }}
                    />

                    {/* Faixa superior colorida indicando o tipo (Emergencial/Orcamento/Rotina) */}
                    <div 
                      className="px-4 py-1.5 flex justify-between items-center relative z-10 pl-6"
                      style={{ backgroundColor: typeColor }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">
                        OS {order.type}
                      </span>
                      <span className="text-[10px] font-bold text-white/80 font-mono">
                        #{order.osNumber || order.id}
                      </span>
                    </div>

                    {/* Conteúdo principal do card */}
                    <div className="p-4 flex items-center justify-between pl-8 relative z-10">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Checkbox de seleção (stopPropagation impede que abra a OS ao clicar no check) */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIds.includes(order.id)} 
                            onCheckedChange={() => 
                              setSelectedIds(prev => 
                                prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]
                              )
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={order.status} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {order.priority}
                            </span>
                          </div>
                          <h3 className="text-slate-900 font-black text-lg leading-tight truncate">
                            {order.title}
                          </h3>
                          {/* Rodapé do card com Cliente e Data */}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-bold">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> {order.clientName || 'Sem Cliente'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões rápidos de visualizar e editar */}
                      <div className="flex items-center gap-2 ml-4 border-l pl-4 border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <div className="p-2 bg-slate-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors" onClick={() => navigate(`/admin/work-orders/${order.id}`)}>
                          <Eye className="w-5 h-5" />
                        </div>
                        <div className="p-2 bg-slate-50 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors" onClick={() => navigate(`/admin/work-orders/${order.id}/edit`)}>
                          <Edit2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- PAGINAÇÃO (Só aparece se houver mais de 1 página) --- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t mt-6">
            <p className="text-sm text-slate-500 font-medium">Total: {totalCount}</p>
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

      {/* --- JANELA DE CONFIRMAÇÃO DE EXCLUSÃO --- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. {selectedIds.length} ordem(ns) será(ão) removida(s) permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteBatchMutation.mutate({ ids: selectedIds })} 
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}