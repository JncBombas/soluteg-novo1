import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileDown,
  Trash2,
  Play,
  Pause,
  FileText,
  Download,
  MessageCircle,
  Globe,
  ChevronDown,
  HardHat,
  UserCheck,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Importação das sub-telas (Abas)
import WorkOrderTasks from "@/components/workorder/WorkOrderTasks";
import WorkOrderMaterials from "@/components/workorder/WorkOrderMaterials";
import WorkOrderAttachments from "@/components/workorder/WorkOrderAttachments";
import WorkOrderComments from "@/components/workorder/WorkOrderComments";
import WorkOrderTimeline from "@/components/workorder/WorkOrderTimeline";
import InspectionTasksTab from "@/components/InspectionTasksTab";
import CompleteWorkOrderModal from "@/components/CompleteWorkOrderModal";

export default function AdminWorkOrderDetail() {
  // --- CONFIGURAÇÕES INICIAIS ---
  const params = useParams();
  const [, navigate] = useLocation();
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const workOrderId = Number(params.id);
  const adminId = parseInt(localStorage.getItem("adminId") || "1");

  // --- BUSCA DE DADOS (CONVERSA COM O BANCO) ---
  const { data: workOrder, isLoading, refetch } = trpc.workOrders.getById.useQuery({
    id: workOrderId,
  });

  const { data: history } = trpc.workOrders.getHistory.useQuery({
    workOrderId,
  });

  const { data: techniciansList } = (trpc as any).technicians.list.useQuery(
    { adminId },
    { staleTime: 60_000 }
  );

  // --- AÇÕES (BOTÕES QUE ALTERAM O BANCO) ---

  // Função para mudar o status (ex: de Aberta para Em Andamento)
  const updateStatusMutation = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso");
      refetch(); // Atualiza a tela com a nova info
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Função para gerar e baixar o arquivo PDF
  const exportPDFMutation = trpc.workOrders.exportPDF.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.remove(); window.URL.revokeObjectURL(url); }, 100);
      toast.success("PDF gerado com sucesso!");
      setExportingPDF(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar PDF: ${error.message}`);
      setExportingPDF(false);
    },
  });

  const handleExportPDF = async () => {
    setExportingPDF(true);
    exportPDFMutation.mutate({ id: workOrderId });
  };

  const sendToClientWhatsappMutation = trpc.workOrders.sendToClientWhatsapp.useMutation({
    onSuccess: () => toast.success("Mensagem enviada para o WhatsApp do cliente!"),
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const sendToAdminWhatsappMutation = trpc.workOrders.sendToAdminWhatsapp.useMutation({
    onSuccess: () => toast.success("Mensagem enviada para o WhatsApp Admin!"),
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const shareToClientPortalMutation = trpc.workOrders.shareToClientPortal.useMutation({
    onSuccess: (data) => {
      const tabLabel: Record<string, string> = {
        vistoria: "Vistoria",
        visita: "Visita",
        servico: "Serviços",
        orcamentos: "Orçamentos",
      };
      toast.success(`OS enviada para a aba "${tabLabel[data.portalTab] || data.portalTab}" do portal! Cliente notificado via WhatsApp.`);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Finalizar a OS (Envia assinaturas e dados finais)
  const completeWorkOrderMutation = trpc.workOrders.complete.useMutation({
    onSuccess: () => {
      toast.success("OS concluída com sucesso!");
      refetch();
      setCompleteModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Atribuir técnico
  const assignTechnicianMutation = (trpc as any).workOrders.assignTechnician.useMutation({
    onSuccess: () => {
      toast.success("Técnico atribuído com sucesso!");
      refetch();
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  // Deletar a OS permanentemente
  const deleteWorkOrderMutation = trpc.workOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("OS deletada com sucesso!");
      navigate("/gestor/work-orders");
    },
    onError: (error) => {
      toast.error(`Erro ao deletar OS: ${error.message}`);
    },
  });

  const handleDeleteWorkOrder = () => {
    deleteWorkOrderMutation.mutate({ id: workOrderId });
    setDeleteDialogOpen(false);
  };

  const handleCompleteWorkOrder = async (data: any) => {
    completeWorkOrderMutation.mutate({
      id: workOrderId,
      ...data,
    });
  };

  // --- TRADUTORES DE CORES E NOMES (LOGICA VISUAL) ---
  
  // Define a cor da etiqueta baseada no status
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberta: "bg-blue-500",
      aguardando_aprovacao: "bg-yellow-500",
      aprovada: "bg-green-500",
      rejeitada: "bg-red-500",
      em_andamento: "bg-purple-500",
      pausada: "bg-amber-500",
      concluida: "bg-green-600",
      aguardando_pagamento: "bg-orange-500",
      cancelada: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  // Transforma o nome técnico do banco em texto bonito para o usuário
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      aguardando_aprovacao: "Aguardando Aprovação",
      aprovada: "Aprovada",
      rejeitada: "Rejeitada",
      em_andamento: "Em Andamento",
      pausada: "Pausada",
      concluida: "Concluída",
      aguardando_pagamento: "Aguardando Pagamento",
      cancelada: "Cancelada",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rotina: "Rotina",
      emergencial: "Emergencial",
      orcamento: "Orçamento",
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      normal: "bg-blue-100 text-blue-800",
      alta: "bg-orange-100 text-orange-800",
      critica: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      normal: "Normal",
      alta: "Alta",
      critica: "Crítica",
    };
    return labels[priority] || priority;
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      id: workOrderId,
      newStatus,
      changedBy: "Admin",
      changedByType: "admin",
      notes: `Status alterado para ${getStatusLabel(newStatus)}`,
    });
  };

  // Se estiver carregando, mostra o ícone de girar
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não encontrar a OS, mostra erro
  if (!workOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">OS não encontrada</h2>
        <Button onClick={() => navigate("/gestor/work-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista
        </Button>
      </div>
    );
  }

  // --- O QUE APARECE NA TELA (LAYOUT) ---
  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4">
      
      {/* SEÇÃO: CABEÇALHO (Título, Botão Voltar e Ações rápidas) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/gestor/work-orders")}
            className="h-9 w-9 md:h-10 md:w-10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold">OS #{workOrder.id}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{workOrder.title}</p>
          </div>
          
          {/* Dropdown PDF */}
          <DropdownMenu open={pdfMenuOpen} onOpenChange={setPdfMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={exportingPDF}>
                {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {exportingPDF ? "Gerando..." : "Exportar PDF"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => { setPdfMenuOpen(false); handleExportPDF(); }}
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setPdfMenuOpen(false); sendToClientWhatsappMutation.mutate({ id: workOrderId }); }}
                disabled={sendToClientWhatsappMutation.isPending}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Enviar para o Cliente (WhatsApp)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { setPdfMenuOpen(false); sendToAdminWhatsappMutation.mutate({ id: workOrderId }); }}
                disabled={sendToAdminWhatsappMutation.isPending}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4 text-blue-600" />
                Enviar para WhatsApp (Admin)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setPdfMenuOpen(false); shareToClientPortalMutation.mutate({ id: workOrderId }); }}
                disabled={shareToClientPortalMutation.isPending}
                className="gap-2"
              >
                <Globe className="h-4 w-4 text-orange-600" />
                Enviar para o Cliente (Portal)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Deletar
          </Button>
        </div>
        
        {/* Badges de Status e Prioridade */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={getStatusColor(workOrder.status)}>
            {getStatusLabel(workOrder.status)}
          </Badge>
          <Badge variant="outline">{getTypeLabel(workOrder.type)}</Badge>
          <Badge className={getPriorityColor(workOrder.priority)}>
            {getPriorityLabel(workOrder.priority)}
          </Badge>
        </div>
      </div>

      {/* SEÇÃO: CARTÕES DE INFORMAÇÃO RÁPIDA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliente</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Correção feita aqui: de order.clientName para workOrder.clientName */}
            <div className="text-lg md:text-xl font-bold">{workOrder.clientName || "Não informado"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Agendada</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR") : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Estimado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{workOrder.estimatedHours || 0}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Est.</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ {workOrder.estimatedValue?.toFixed(2) || "0,00"}</div>
          </CardContent>
        </Card>
      </div>

      {/* PAINEL DE CONTROLE — fora das abas, sempre visível */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className={`px-4 py-3 flex items-center justify-between ${workOrder.type === 'emergencial' ? 'bg-red-600' : 'bg-slate-900'}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-white animate-pulse" />
            <span className="text-white text-sm font-black uppercase">Controle de Operação</span>
          </div>
          {/* Técnico responsável no cabeçalho do painel */}
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-slate-300" />
            {(workOrder as any).technicianName ? (
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold">{(workOrder as any).technicianName}</span>
                <button
                  className="text-slate-400 hover:text-red-300 text-xs underline"
                  onClick={() => assignTechnicianMutation.mutate({ workOrderId, technicianId: null })}
                  disabled={assignTechnicianMutation.isPending}
                >
                  remover
                </button>
              </div>
            ) : (
              <Select
                onValueChange={(val) =>
                  assignTechnicianMutation.mutate({ workOrderId, technicianId: parseInt(val) })
                }
                disabled={assignTechnicianMutation.isPending}
              >
                <SelectTrigger className="h-7 text-xs bg-white/10 border-white/20 text-white w-44">
                  <SelectValue placeholder="Atribuir técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {(techniciansList ?? []).map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}{t.specialization ? ` — ${t.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex flex-col gap-3">

            {workOrder.status === "aberta" && (
              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 h-16 text-xl font-black shadow-xl"
                onClick={() => handleStatusChange("em_andamento")}
              >
                <Play className="mr-3 h-7 w-7 fill-current" />
                INICIAR AGORA
              </Button>
            )}

            {workOrder.status === "pausada" && (
              <div className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Pause className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-800">Serviço Pausado</p>
                  <p className="text-sm text-amber-700">O técnico pausou o atendimento.</p>
                </div>
              </div>
            )}

            {workOrder.status === "em_andamento" && (
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-16 text-xl font-black shadow-xl"
                  onClick={() => setCompleteModalOpen(true)}
                >
                  <CheckCircle2 className="mr-3 h-7 w-7" />
                  FINALIZAR SERVIÇO
                </Button>
                <button
                  onClick={() => handleStatusChange("aberta")}
                  className="w-full py-1 text-slate-400 hover:text-red-600 text-[10px] font-black uppercase"
                >
                  Voltar para "Aberta" (Correção de erro)
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              {workOrder.status === "aguardando_aprovacao" && (
                <>
                  <Button size="sm" className="flex-1 bg-green-600" onClick={() => handleStatusChange("aprovada")}>Aprovar</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStatusChange("rejeitada")}>Rejeitar</Button>
                </>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 font-bold"
                onClick={() => navigate(`/gestor/work-orders/${workOrderId}/edit`)}
              >
                Editar Dados da OS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: ABAS DE NAVEGAÇÃO */}
      <Tabs defaultValue="details" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-7">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="inspections">Inspeções</TabsTrigger>
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="attachments">Anexos</TabsTrigger>
            <TabsTrigger value="comments">Comentários</TabsTrigger>
            <TabsTrigger value="timeline">Histórico</TabsTrigger>
          </TabsList>
        </div>

        {/* CONTEÚDO DA ABA DETALHES */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Descrição do Problema</label>
                <p className="text-lg">{workOrder.description || "Sem descrição detalhada"}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm text-muted-foreground">Endereço de Execução</label>
                <p className="text-lg">{workOrder.clientAddress || "Consultar cadastro"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OUTRAS ABAS (Carregam componentes externos) */}
        <TabsContent value="tasks"><WorkOrderTasks workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="inspections"><InspectionTasksTab workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="materials"><WorkOrderMaterials workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="attachments"><WorkOrderAttachments workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="comments"><WorkOrderComments workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="timeline"><WorkOrderTimeline workOrderId={workOrderId} history={history || []} /></TabsContent>
      </Tabs>

      {/* MODAIS (Janelas que abrem por cima da tela) */}
      <CompleteWorkOrderModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        onComplete={handleCompleteWorkOrder}
        isLoading={completeWorkOrderMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta OS?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente e removerá todos os dados desta Ordem de Serviço.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkOrder} className="bg-destructive text-white">Deletar</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}