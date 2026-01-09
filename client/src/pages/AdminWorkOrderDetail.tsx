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
} from "lucide-react";
import { toast } from "sonner";

// Componentes para cada tab
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
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const workOrderId = Number(params.id);

  const { data: workOrder, isLoading, refetch } = trpc.workOrders.getById.useQuery({
    id: workOrderId,
  });

  const { data: history } = trpc.workOrders.getHistory.useQuery({
    workOrderId,
  });

  const updateStatusMutation = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  const exportPDFMutation = trpc.workOrders.exportPDF.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e fazer download
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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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

  const completeWorkOrderMutation = trpc.workOrders.complete.useMutation({
    onSuccess: () => {
      toast.success("OS concluida com sucesso!");
      refetch();
      setCompleteModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCompleteWorkOrder = async (data: any) => {
    console.log("[AdminWorkOrderDetail] handleCompleteWorkOrder chamado com:", {
      workOrderId,
      collaboratorName: data.collaboratorName,
      collaboratorSignatureSize: data.collaboratorSignature?.length,
      clientName: data.clientName,
      clientSignatureSize: data.clientSignature?.length,
    });
    
    completeWorkOrderMutation.mutate({
      id: workOrderId,
      ...data,
    });
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
        <Button onClick={() => navigate("/admin/work-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista
        </Button>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4">
      {/* Header */}
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
          {workOrder.status !== "concluida" && (
            <Button
              size="sm"
              onClick={() => setCompleteModalOpen(true)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir OS
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="gap-2"
          >
            {exportingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {exportingPDF ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>
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

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliente</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-xl font-bold">{workOrder.clientName || `Cliente #${workOrder.clientId}`}</div>
            {workOrder.clientPhone && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{workOrder.clientPhone}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Agendada</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrder.scheduledDate
                ? new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR")
                : "Não definida"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Estimado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrder.estimatedHours ? `${workOrder.estimatedHours}h` : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workOrder.estimatedValue
                ? `R$ ${workOrder.estimatedValue.toFixed(2)}`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-7">
            <TabsTrigger value="details" className="flex-shrink-0">Detalhes</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-shrink-0">Tarefas</TabsTrigger>
            <TabsTrigger value="inspections" className="flex-shrink-0">Inspeções</TabsTrigger>
            <TabsTrigger value="materials" className="flex-shrink-0">Materiais</TabsTrigger>
            <TabsTrigger value="attachments" className="flex-shrink-0">Anexos</TabsTrigger>
            <TabsTrigger value="comments" className="flex-shrink-0">Comentários</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-shrink-0">Timeline</TabsTrigger>
          </TabsList>
        </div>

        {/* Detalhes Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo de Serviço
                  </label>
                  <p className="text-lg">{workOrder.serviceType || "Não especificado"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Criada em
                  </label>
                  <p className="text-lg">
                    {new Date(workOrder.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Descrição
                </label>
                <p className="text-lg mt-2">
                  {workOrder.description || "Sem descrição"}
                </p>
              </div>

              {workOrder.clientAddress && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Endereço do Cliente
                    </label>
                    <p className="text-lg mt-2">{workOrder.clientAddress}</p>
                  </div>
                </>
              )}

              {workOrder.internalNotes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Notas Internas
                    </label>
                    <p className="text-lg mt-2">{workOrder.internalNotes}</p>
                  </div>
                </>
              )}

              {workOrder.clientNotes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Notas do Cliente
                    </label>
                    <p className="text-lg mt-2">{workOrder.clientNotes}</p>
                  </div>
                </>
              )}

              {workOrder.isRecurring === 1 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">OS Recorrente</span>
                    {(workOrder as any).recurrenceCanceled === 1 && (
                      <Badge variant="destructive">Recorrência Cancelada</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {workOrder.recurrenceType === "mensal_fixo" ? "Mensal (dia fixo)" : "Mensal (início do mês)"}
                    {workOrder.recurrenceDay && ` - Dia ${workOrder.recurrenceDay}`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {workOrder.status === "aberta" && (
                  <Button onClick={() => handleStatusChange("em_andamento")}>
                    Iniciar Atendimento
                  </Button>
                )}
                {workOrder.status === "aguardando_aprovacao" && (
                  <>
                    <Button onClick={() => handleStatusChange("aprovada")}>
                      Aprovar Orçamento
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange("rejeitada")}
                    >
                      Rejeitar Orçamento
                    </Button>
                  </>
                )}
                {workOrder.status === "em_andamento" && (
                  <Button onClick={() => handleStatusChange("concluida")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Concluir OS
                  </Button>
                )}
                {workOrder.status === "concluida" && (
                  <Button onClick={() => handleStatusChange("aguardando_pagamento")}>
                    Marcar como Aguardando Pagamento
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/admin/work-orders/${workOrderId}/edit`)}
                >
                  Editar OS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tarefas Tab */}
        <TabsContent value="tasks">
          <WorkOrderTasks workOrderId={workOrderId} />
        </TabsContent>

        {/* Inspeções Tab */}
        <TabsContent value="inspections">
          <InspectionTasksTab workOrderId={workOrderId} />
        </TabsContent>

        {/* Materiais Tab */}
        <TabsContent value="materials">
          <WorkOrderMaterials workOrderId={workOrderId} />
        </TabsContent>

        {/* Anexos Tab */}
        <TabsContent value="attachments">
          <WorkOrderAttachments workOrderId={workOrderId} />
        </TabsContent>

        {/* Comentários Tab */}
        <TabsContent value="comments">
          <WorkOrderComments workOrderId={workOrderId} />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <WorkOrderTimeline workOrderId={workOrderId} history={history || []} />
        </TabsContent>
      </Tabs>

      <CompleteWorkOrderModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        onComplete={handleCompleteWorkOrder}
        isLoading={completeWorkOrderMutation.isPending}
      />
    </div>
  );
}
