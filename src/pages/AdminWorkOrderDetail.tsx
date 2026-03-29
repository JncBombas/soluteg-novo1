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
  FileText,
  Download,
  MessageCircle,
  Globe,
  ChevronDown,
} from "lucide-react";
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
  const params = useParams(); // Pega o ID da OS na URL do navegador
  const [, navigate] = useLocation(); // Função para mudar de página
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false); // Abre/fecha o modal de finalizar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // Abre/fecha o aviso de deletar
  const workOrderId = Number(params.id);

  // --- BUSCA DE DADOS (CONVERSA COM O BANCO) ---
  const { data: workOrder, isLoading, refetch } = trpc.workOrders.getById.useQuery({
    id: workOrderId,
  });

  const { data: history } = trpc.workOrders.getHistory.useQuery({
    workOrderId,
  });

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

  // Deletar a OS permanentemente
  const deleteWorkOrderMutation = trpc.workOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("OS deletada com sucesso!");
      navigate("/admin/work-orders");
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
        <Button onClick={() => navigate("/admin/work-orders")}>
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
            onClick={() => navigate("/admin/work-orders")}
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

          {/* PAINEL DE CONTROLE INDUSTRIAL (Ações de Status) */}
          <Card className="border-none shadow-2xl overflow-hidden bg-white">
            <div className={`px-4 py-4 flex justify-between items-center ${workOrder.type === 'emergencial' ? 'bg-red-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-white animate-pulse" />
                <span className="text-white text-sm font-black uppercase">Controle de Operação</span>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="flex flex-col gap-5">
                
                {/* Botão para dar PLAY no serviço */}
                {workOrder.status === "aberta" && (
                  <Button 
                    size="lg" 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-24 text-2xl font-black shadow-xl"
                    onClick={() => handleStatusChange("em_andamento")}
                  >
                    <Play className="mr-4 h-10 w-10 fill-current" />
                    INICIAR AGORA
                  </Button>
                )}

                {/* Botão para FINALIZAR o serviço */}
                {workOrder.status === "em_andamento" && (
                  <div className="space-y-4">
                    <Button 
                      size="lg" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-24 text-2xl font-black shadow-xl"
                      onClick={() => setCompleteModalOpen(true)}
                    >
                      <CheckCircle2 className="mr-4 h-10 w-10" />
                      FINALIZAR SERVIÇO
                    </Button>
                    <button 
                      onClick={() => handleStatusChange("aberta")}
                      className="w-full py-2 text-slate-400 hover:text-red-600 text-[10px] font-black uppercase"
                    >
                      Voltar para "Aberta" (Correção de erro)
                    </button>
                  </div>
                )}

                {/* Ações de aprovação (Escritório) */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                  {workOrder.status === "aguardando_aprovacao" && (
                    <>
                      <Button size="sm" className="bg-green-600" onClick={() => handleStatusChange("aprovada")}>Aprovar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange("rejeitada")}>Rejeitar</Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="col-span-2 font-bold"
                    onClick={() => navigate(`/admin/work-orders/${workOrderId}/edit`)}
                  >
                    Editar Dados da OS
                  </Button>
                </div>
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