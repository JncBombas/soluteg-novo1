import { useState } from "react";
// COMPONENTES DE INTERFACE (UI): Peças visuais prontas como botões, cards e etiquetas
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ÍCONES: Biblioteca Lucide para desenhar os símbolos na tela
import { 
  ArrowLeft, Edit2, RefreshCw, AlertCircle, DollarSign, 
  Calendar, Clock, User, FileText, History, CheckCircle,
  XCircle, Play
} from "lucide-react";
// NAVEGAÇÃO E REQUISIÇÕES: Ferramentas para mudar de página e falar com o servidor
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner"; // Avisos flutuantes (sucesso/erro)
// DIALOG: Janelas pop-up (modais)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// DEFINIÇÃO DE TIPOS: Lista de status permitidos para o sistema
type OSStatus = "aberta" | "aguardando_aprovacao" | "aprovada" | "rejeitada" | "em_andamento" | "concluida" | "aguardando_pagamento" | "cancelada";

export default function AdminViewWorkOrder() {
  // --- CONTROLES DE NAVEGAÇÃO ---
  const [, navigate] = useLocation(); // Função para mudar de página
  const params = useParams(); // Pega o ID da OS na URL (ex: /admin/work-orders/123)
  const osId = parseInt(params.id || "0");

  // --- ESTADOS DA TELA (STATE): Controlam o que está aberto ou selecionado agora ---
  const [statusDialogOpen, setStatusDialogOpen] = useState(false); // Janela de mudar status
  const [newStatus, setNewStatus] = useState<OSStatus>("aberta");  // O status escolhido no seletor
  const [statusNotes, setStatusNotes] = useState("");              // Texto de observação do status
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false); // Janela de cancelar recorrência
  const [cancelFuture, setCancelFuture] = useState(false);         // Opção de cancelar o futuro ou só esta

  // --- BUSCA DE DADOS (QUERIES): Pegando informações do banco de dados ---
  const { data: workOrder, isLoading, refetch } = trpc.workOrders.getById.useQuery({ id: osId });
  const { data: history = [] } = trpc.workOrders.getHistory.useQuery({ workOrderId: osId });
  const { data: clients = [] } = trpc.clients.list.useQuery({ adminId: workOrder?.adminId || 1 });

  // --- AÇÕES DE SALVAMENTO (MUTATIONS): Enviando mudanças para o banco de dados ---
  const updateStatusMutation = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetch(); // Recarrega os dados da tela
      setStatusDialogOpen(false); // Fecha o pop-up
      setStatusNotes(""); // Limpa o texto digitado
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const cancelRecurrenceMutation = trpc.workOrders.cancelRecurrence.useMutation({
    onSuccess: () => {
      toast.success("Recorrência cancelada com sucesso!");
      refetch();
      setCancelDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao cancelar recorrência");
    },
  });

  // --- TELA DE CARREGAMENTO: Exibida enquanto os dados não chegam do servidor ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // --- TELA DE ERRO: Exibida se o ID da OS não existir ---
  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">OS não encontrada</h2>
          <Button onClick={() => navigate("/admin/work-orders")}>Voltar</Button>
        </Card>
      </div>
    );
  }

  // Encontra o cliente dono desta OS na lista de clientes
  const client = clients.find(c => c.id === workOrder.clientId);

  // --- CONFIGURAÇÕES VISUAIS: Definem cores e ícones baseados no tipo/status ---
  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      rotina: { label: "Rotina", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      emergencial: { label: "Emergencial", color: "bg-red-100 text-red-800", icon: AlertCircle },
      orcamento: { label: "Orçamento", color: "bg-purple-100 text-purple-800", icon: DollarSign },
    };
    return configs[type] || configs.emergencial;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      aberta: { label: "Aberta", color: "bg-blue-100 text-blue-800", icon: FileText },
      aguardando_aprovacao: { label: "Aguardando Aprovação", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      aprovada: { label: "Aprovada", color: "bg-green-100 text-green-800", icon: CheckCircle },
      rejeitada: { label: "Rejeitada", color: "bg-red-100 text-red-800", icon: XCircle },
      em_andamento: { label: "Em Andamento", color: "bg-orange-100 text-orange-800", icon: Play },
      concluida: { label: "Concluída", color: "bg-green-100 text-green-800", icon: CheckCircle },
      aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-800", icon: DollarSign },
      cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
    };
    return configs[status] || configs.aberta;
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      normal: { label: "Normal", color: "text-green-600" },
      alta: { label: "Alta", color: "text-yellow-600" },
      critica: { label: "Crítica", color: "text-red-600" },
    };
    return configs[priority] || configs.normal;
  };

  // Preparação das variáveis de estilo para usar no HTML abaixo
  const typeConfig = getTypeConfig(workOrder.type);
  const statusConfig = getStatusConfig(workOrder.status);
  const priorityConfig = getPriorityConfig(workOrder.priority);
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  // Funções disparadas pelos botões de "Salvar" nos pop-ups
  const handleUpdateStatus = () => {
    updateStatusMutation.mutate({
      id: osId,
      newStatus,
      changedBy: "Admin",
      changedByType: "admin",
      notes: statusNotes || undefined,
    });
  };

  const handleCancelRecurrence = () => {
    cancelRecurrenceMutation.mutate({
      id: osId,
      cancelFuture,
    });
  };

  // Regra de negócio: Orçamentos têm mais opções de status que uma OS comum
  const getAvailableStatuses = (): OSStatus[] => {
    if (workOrder.type === "orcamento") {
      return ["aberta", "aguardando_aprovacao", "aprovada", "rejeitada", "em_andamento", "concluida", "aguardando_pagamento", "cancelada"];
    }
    return ["aberta", "em_andamento", "concluida", "aguardando_pagamento", "cancelada"];
  };

  // --- ESTRUTURA VISUAL (O QUE O USUÁRIO VÊ) ---
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* TOPO: Botão voltar e Cabeçalho da OS */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin/work-orders")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-lg bg-gray-100 px-3 py-1 rounded">
                  {workOrder.osNumber}
                </span>
                <Badge className={typeConfig.color}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                <Badge className={statusConfig.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{workOrder.title}</h1>
            </div>
            {/* Botões de Ação Superior */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
                Alterar Status
              </Button>
              <Button onClick={() => navigate(`/admin/work-orders/${osId}/edit`)} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* CORPO DA PÁGINA: Dividido em 3 colunas (2 principais, 1 lateral) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUNA DA ESQUERDA: Detalhes principais */}
          <div className="md:col-span-2 space-y-6">
            
            {/* CARD: Detalhes Técnicos */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Detalhes</h2>
              {workOrder.description && (
                <div className="mb-4">
                  <label className="text-sm text-gray-600">Descrição</label>
                  <p className="mt-1">{workOrder.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Tipo de Serviço</label>
                  <p className="font-medium">{workOrder.serviceType || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Prioridade</label>
                  <p className={`font-medium ${priorityConfig.color}`}>{priorityConfig.label}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Data Agendada</label>
                  <p className="font-medium">
                    {workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR") : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Horas Estimadas</label>
                  <p className="font-medium">{workOrder.estimatedHours || "-"}</p>
                </div>
              </div>

              {/* Seção de Valores (Só aparece se for Orçamento) */}
              {workOrder.type === "orcamento" && (
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Valor Estimado</label>
                      <p className="font-medium text-lg">
                        {workOrder.estimatedValue ? `R$ ${workOrder.estimatedValue.toFixed(2)}` : "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Valor Final</label>
                      <p className="font-medium text-lg">
                        {workOrder.finalValue ? `R$ ${workOrder.finalValue.toFixed(2)}` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* CARD: Recorrência (Configuração de repetição automática) */}
            {workOrder.isRecurring === 1 && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold">OS Recorrente</h2>
                      <p className="text-sm text-gray-600">
                        {workOrder.recurrenceType === "mensal_inicio"
                          ? "Criada automaticamente todo dia 1 de cada mês"
                          : `Criada automaticamente todo dia ${workOrder.recurrenceDay} de cada mês`}
                      </p>
                    </div>
                  </div>
                  {/* Botão de cancelar repetição */}
                  {(workOrder as any).recurrenceCanceled === 0 ? (
                    <Button variant="outline" onClick={() => setCancelDialogOpen(true)} className="text-red-600">
                      Cancelar Recorrência
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-red-600">Recorrência Cancelada</Badge>
                  )}
                </div>
              </Card>
            )}

            {/* CARD: Histórico (Log de quem mudou o status) */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Alterações
              </h2>
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma alteração registrada</p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry: any) => (
                    <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="w-2 h-2 mt-2 rounded-full bg-orange-500"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{entry.changedBy}</span>
                          <span className="text-sm text-gray-600">
                            {new Date(entry.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-sm">
                          Mudou de <Badge variant="outline" className="mx-1">{getStatusConfig(entry.previousStatus).label}</Badge>
                          para <Badge className={getStatusConfig(entry.newStatus).color}>{getStatusConfig(entry.newStatus).label}</Badge>
                        </p>
                        {entry.notes && <p className="text-sm text-gray-600 mt-1 italic">"{entry.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* COLUNA DA DIREITA: Informações de contato e datas */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" /> Cliente
              </h2>
              <div className="space-y-2">
                <p className="font-medium">{client?.name || `Cliente #${workOrder.clientId}`}</p>
                {client?.email && <p className="text-sm text-gray-600">{client.email}</p>}
                {client?.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Datas
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Criada em</label>
                  <p className="font-medium">{new Date(workOrder.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                {workOrder.startedAt && (
                  <div>
                    <label className="text-sm text-gray-600">Iniciada em</label>
                    <p className="font-medium">{new Date(workOrder.startedAt).toLocaleString("pt-BR")}</p>
                  </div>
                )}
                {workOrder.completedAt && (
                  <div>
                    <label className="text-sm text-gray-600">Concluída em</label>
                    <p className="font-medium">{new Date(workOrder.completedAt).toLocaleString("pt-BR")}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* CARD: Notas Internas e para o Cliente */}
            {(workOrder.internalNotes || workOrder.clientNotes) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Notas</h2>
                {workOrder.internalNotes && (
                  <div className="mb-4">
                    <label className="text-sm text-gray-600">Notas Internas</label>
                    <p className="mt-1 text-sm bg-yellow-50 p-3 rounded">{workOrder.internalNotes}</p>
                  </div>
                )}
                {workOrder.clientNotes && (
                  <div>
                    <label className="text-sm text-gray-600">Notas do Cliente</label>
                    <p className="mt-1 text-sm bg-blue-50 p-3 rounded">{workOrder.clientNotes}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* --- POP-UP: MUDAR STATUS --- */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Status da OS</DialogTitle>
              <DialogDescription>Escolha o novo status e adicione uma nota se desejar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Novo Status</label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OSStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses().map((s) => (
                      <SelectItem key={s} value={s}>{getStatusConfig(s).label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Observação</label>
                <Textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="O que aconteceu?" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- POP-UP: CANCELAR RECORRÊNCIA --- */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cancelar Recorrência</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <input type="radio" checked={!cancelFuture} onChange={() => setCancelFuture(false)} />
                <div><p className="font-medium">Apenas esta OS</p></div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <input type="radio" checked={cancelFuture} onChange={() => setCancelFuture(true)} />
                <div><p className="font-medium">Esta e as futuras</p></div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
              <Button onClick={handleCancelRecurrence} disabled={cancelRecurrenceMutation.isPending} className="bg-red-600">Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}