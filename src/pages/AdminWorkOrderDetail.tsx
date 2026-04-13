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
  UserCog,
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

import WorkOrderTasks from "@/components/workorder/WorkOrderTasks";
import WorkOrderMaterials from "@/components/workorder/WorkOrderMaterials";
import WorkOrderAttachments from "@/components/workorder/WorkOrderAttachments";
import WorkOrderComments from "@/components/workorder/WorkOrderComments";
import WorkOrderTimeline from "@/components/workorder/WorkOrderTimeline";
import InspectionTasksTab from "@/components/InspectionTasksTab";
import CompleteWorkOrderModal from "@/components/CompleteWorkOrderModal";

export default function AdminWorkOrderDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const workOrderId = Number(params.id);
  const adminId = parseInt(localStorage.getItem("adminId") || "1");

  const { data: workOrder, isLoading, refetch } = trpc.workOrders.getById.useQuery({ id: workOrderId });
  const { data: history } = trpc.workOrders.getHistory.useQuery({ workOrderId });
  const { data: techniciansList } = (trpc as any).technicians.list.useQuery(
    { adminId },
    { staleTime: 60_000 }
  );

  const updateStatusMutation = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado com sucesso"); refetch(); },
    onError: (error) => toast.error(`Erro ao atualizar status: ${error.message}`),
  });

  const exportPDFMutation = trpc.workOrders.exportPDF.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.remove(); window.URL.revokeObjectURL(url); }, 100);
      toast.success("PDF gerado com sucesso!");
      setExportingPDF(false);
    },
    onError: (error) => { toast.error(`Erro ao gerar PDF: ${error.message}`); setExportingPDF(false); },
  });

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
        vistoria: "Vistoria", visita: "Visita", servico: "Serviços", orcamentos: "Orçamentos",
      };
      toast.success(`OS enviada para a aba "${tabLabel[data.portalTab] || data.portalTab}" do portal! Cliente notificado via WhatsApp.`);
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const completeWorkOrderMutation = trpc.workOrders.complete.useMutation({
    onSuccess: () => { toast.success("OS concluída com sucesso!"); refetch(); setCompleteModalOpen(false); },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const assignTechnicianMutation = (trpc as any).workOrders.assignTechnician.useMutation({
    onSuccess: () => { toast.success("Técnico atribuído com sucesso!"); refetch(); },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const deleteWorkOrderMutation = trpc.workOrders.delete.useMutation({
    onSuccess: () => { toast.success("OS deletada com sucesso!"); navigate("/gestor/work-orders"); },
    onError: (error) => toast.error(`Erro ao deletar OS: ${error.message}`),
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      id: workOrderId,
      newStatus,
      changedBy: "Admin",
      changedByType: "admin",
      notes: `Status alterado para ${getStatusLabel(newStatus)}`,
    });
  };

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
    const labels: Record<string, string> = { rotina: "Rotina", emergencial: "Emergencial", orcamento: "Orçamento" };
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
    const labels: Record<string, string> = { normal: "Normal", alta: "Alta", critica: "Crítica" };
    return labels[priority] || priority;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  const technicianName = (workOrder as any).technicianName;
  const technicianId = (workOrder as any).technicianId;
  const isEmergencial = workOrder.type === "emergencial";

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 space-y-4 md:space-y-5">

      {/* ── CABEÇALHO ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/gestor/work-orders")}
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">OS #{workOrder.id}</h1>
            <Badge className={`${getStatusColor(workOrder.status)} text-white`}>
              {getStatusLabel(workOrder.status)}
            </Badge>
            <Badge variant="outline">{getTypeLabel(workOrder.type)}</Badge>
            <Badge className={getPriorityColor(workOrder.priority)}>
              {getPriorityLabel(workOrder.priority)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{workOrder.title}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu open={pdfMenuOpen} onOpenChange={setPdfMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={exportingPDF}>
                {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                <span className="hidden sm:inline">{exportingPDF ? "Gerando..." : "PDF"}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { setPdfMenuOpen(false); setExportingPDF(true); exportPDFMutation.mutate({ id: workOrderId }); }} className="gap-2">
                <Download className="h-4 w-4" /> Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setPdfMenuOpen(false); sendToClientWhatsappMutation.mutate({ id: workOrderId }); }} disabled={sendToClientWhatsappMutation.isPending} className="gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" /> Enviar para o Cliente (WhatsApp)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPdfMenuOpen(false); sendToAdminWhatsappMutation.mutate({ id: workOrderId }); }} disabled={sendToAdminWhatsappMutation.isPending} className="gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" /> Enviar para WhatsApp (Admin)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setPdfMenuOpen(false); shareToClientPortalMutation.mutate({ id: workOrderId }); }} disabled={shareToClientPortalMutation.isPending} className="gap-2">
                <Globe className="h-4 w-4 text-orange-600" /> Enviar para o Cliente (Portal)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── CARTÕES DE INFORMAÇÃO ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-semibold text-sm truncate">{workOrder.clientName || "Não informado"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Agendado</p>
              <p className="font-semibold text-sm">
                {workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Estimado</p>
              <p className="font-semibold text-sm">{workOrder.estimatedHours || 0}h</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Valor Est.</p>
              <p className="font-semibold text-sm">R$ {workOrder.estimatedValue?.toFixed(2) || "0,00"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PAINEL DE CONTROLE ──────────────────────────────────── */}
      <Card className={`border shadow-sm overflow-hidden ${isEmergencial ? "border-red-200" : ""}`}>
        <CardHeader className={`py-3 px-4 border-b ${isEmergencial ? "bg-red-50" : "bg-slate-50"}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${isEmergencial ? "text-red-500" : "text-slate-400"}`} />
            <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${isEmergencial ? "text-red-700" : "text-slate-500"}`}>
              Painel de Controle
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">

          {/* Técnico responsável */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <HardHat className="h-4 w-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Técnico</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {technicianName || <span className="text-muted-foreground font-normal">Não atribuído</span>}
              </p>
            </div>

            {technicianName ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  value={String(technicianId ?? "")}
                  onValueChange={(val) => assignTechnicianMutation.mutate({ workOrderId, technicianId: parseInt(val) })}
                  disabled={assignTechnicianMutation.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <UserCog className="h-3 w-3 mr-1 opacity-50" />
                    <SelectValue placeholder="Alterar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(techniciansList ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                  title="Remover técnico"
                  onClick={() => assignTechnicianMutation.mutate({ workOrderId, technicianId: null })}
                  disabled={assignTechnicianMutation.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Select
                onValueChange={(val) => assignTechnicianMutation.mutate({ workOrderId, technicianId: parseInt(val) })}
                disabled={assignTechnicianMutation.isPending}
              >
                <SelectTrigger className="h-8 w-44 text-xs shrink-0">
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

          {/* Ação principal por status */}
          {workOrder.status === "aberta" && (
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-base font-bold gap-2"
              onClick={() => handleStatusChange("em_andamento")}
              disabled={updateStatusMutation.isPending}
            >
              <Play className="h-5 w-5 fill-current" />
              Iniciar Atendimento
            </Button>
          )}

          {workOrder.status === "pausada" && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <Pause className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Serviço Pausado</p>
                <p className="text-xs text-amber-600">O técnico pausou o atendimento.</p>
              </div>
            </div>
          )}

          {workOrder.status === "em_andamento" && (
            <div className="space-y-1.5">
              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-base font-bold gap-2"
                onClick={() => setCompleteModalOpen(true)}
              >
                <CheckCircle2 className="h-5 w-5" />
                Finalizar Serviço
              </Button>
              <button
                onClick={() => handleStatusChange("aberta")}
                className="w-full py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-red-500 transition-colors"
              >
                Reverter para "Aberta"
              </button>
            </div>
          )}

          {/* Ações secundárias */}
          <div className="flex gap-2 pt-1 border-t border-slate-100">
            {workOrder.status === "aguardando_aprovacao" && (
              <>
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange("aprovada")}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Aprovar
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleStatusChange("rejeitada")}>
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Rejeitar
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(`/gestor/work-orders/${workOrderId}/edit`)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Editar OS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── ABAS ─────────────────────────────────────────────────── */}
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

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Descrição do Problema</label>
                <p className="text-base mt-1">{workOrder.description || "Sem descrição detalhada"}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm text-muted-foreground">Endereço de Execução</label>
                <p className="text-base mt-1">{workOrder.clientAddress || "Consultar cadastro"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks"><WorkOrderTasks workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="inspections"><InspectionTasksTab workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="materials"><WorkOrderMaterials workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="attachments"><WorkOrderAttachments workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="comments"><WorkOrderComments workOrderId={workOrderId} /></TabsContent>
        <TabsContent value="timeline"><WorkOrderTimeline workOrderId={workOrderId} history={history || []} /></TabsContent>
      </Tabs>

      {/* ── MODAIS ───────────────────────────────────────────────── */}
      <CompleteWorkOrderModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        onComplete={(data) => completeWorkOrderMutation.mutate({ id: workOrderId, ...data })}
        isLoading={completeWorkOrderMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar esta OS?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e removerá todos os dados desta Ordem de Serviço.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteWorkOrderMutation.mutate({ id: workOrderId }); setDeleteDialogOpen(false); }}
              className="bg-destructive text-white"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
