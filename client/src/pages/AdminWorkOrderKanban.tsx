import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Calendar, User, AlertCircle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type WorkOrderStatus = "aberta" | "aguardando_aprovacao" | "aprovada" | "rejeitada" | "em_andamento" | "concluida" | "aguardando_pagamento" | "cancelada";

const STATUS_COLUMNS: { status: WorkOrderStatus; label: string; color: string }[] = [
  { status: "aberta", label: "Aberta", color: "bg-blue-100 text-blue-800" },
  { status: "aguardando_aprovacao", label: "Aguardando Aprovação", color: "bg-yellow-100 text-yellow-800" },
  { status: "aprovada", label: "Aprovada", color: "bg-green-100 text-green-800" },
  { status: "em_andamento", label: "Em Andamento", color: "bg-purple-100 text-purple-800" },
  { status: "concluida", label: "Concluída", color: "bg-emerald-100 text-emerald-800" },
  { status: "aguardando_pagamento", label: "Aguardando Pagamento", color: "bg-orange-100 text-orange-800" },
];

const PRIORITY_CONFIG = {
  normal: { label: "Normal", icon: CheckCircle2, color: "text-green-600" },
  alta: { label: "Alta", icon: AlertCircle, color: "text-orange-600" },
  critica: { label: "Crítica", icon: AlertCircle, color: "text-red-600" },
};

const TYPE_CONFIG = {
  rotina: { label: "Rotina", color: "bg-blue-100 text-blue-800" },
  emergencial: { label: "Emergencial", color: "bg-red-100 text-red-800" },
  orcamento: { label: "Orçamento", color: "bg-purple-100 text-purple-800" },
};

export default function AdminWorkOrderKanban() {
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workOrders, isLoading, refetch } = trpc.workOrders.list.useQuery({});
  const { data: clients } = trpc.clients.list.useQuery({ adminId: 1 }); // TODO: usar adminId real
  const updateStatusMutation = trpc.workOrders.updateStatus.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filtrar OS
  const filteredWorkOrders = workOrders?.filter((wo) => {
    if (filterType !== "all" && wo.type !== filterType) return false;
    if (filterPriority !== "all" && wo.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const client = clients?.find((c) => c.id === wo.clientId);
      return (
        wo.title.toLowerCase().includes(query) ||
        wo.osNumber.toLowerCase().includes(query) ||
        client?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Agrupar OS por status
  const groupedWorkOrders = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.status] = filteredWorkOrders?.filter((wo) => wo.status === column.status) || [];
    return acc;
  }, {} as Record<WorkOrderStatus, typeof workOrders>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const workOrderId = active.id as number;
    const newStatus = over.id as WorkOrderStatus;
    const workOrder = workOrders?.find((wo) => wo.id === workOrderId);

    if (!workOrder || workOrder.status === newStatus) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: workOrderId,
        newStatus: newStatus,
        changedBy: "Admin",
        changedByType: "admin",
        notes: `Status alterado via Kanban de "${workOrder.status}" para "${newStatus}"`,
      });
      toast.success("Status atualizado com sucesso!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const activeWorkOrder = workOrders?.find((wo) => wo.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kanban de Ordens de Serviço</h1>
          <p className="text-muted-foreground">Arraste os cards para mudar o status</p>
        </div>
        <Button onClick={() => navigate("/admin/work-orders/new")}>Nova OS</Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, OS#, cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="rotina">Rotina</SelectItem>
                <SelectItem value="emergencial">Emergencial</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setFilterType("all");
                setFilterPriority("all");
                setSearchQuery("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              color={column.color}
              workOrders={groupedWorkOrders[column.status] || []}
              clients={clients || []}
              onCardClick={(id) => navigate(`/admin/work-orders/${id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeWorkOrder && (
            <WorkOrderCard
              workOrder={activeWorkOrder}
              client={clients?.find((c) => c.id === activeWorkOrder.clientId)}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  workOrders,
  clients,
  onCardClick,
}: {
  status: WorkOrderStatus;
  label: string;
  color: string;
  workOrders: any[];
  clients: any[];
  onCardClick: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Column Header */}
      <Card className={`${color} border-2`}>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{label}</span>
            <Badge variant="secondary" className="ml-2">
              {workOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Droppable Area */}
      <div
        id={status}
        className="flex-1 space-y-3 min-h-[200px] p-2 rounded-lg bg-muted/30"
      >
        {workOrders.map((wo) => (
          <div key={wo.id} id={`wo-${wo.id}`} onClick={() => onCardClick(wo.id)}>
            <WorkOrderCard
              workOrder={wo}
              client={clients.find((c) => c.id === wo.clientId)}
            />
          </div>
        ))}
        {workOrders.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhuma OS
          </div>
        )}
      </div>
    </div>
  );
}

function WorkOrderCard({
  workOrder,
  client,
  isDragging = false,
}: {
  workOrder: any;
  client?: any;
  isDragging?: boolean;
}) {
  const PriorityIcon = PRIORITY_CONFIG[workOrder.priority as keyof typeof PRIORITY_CONFIG]?.icon || CheckCircle2;
  const priorityColor = PRIORITY_CONFIG[workOrder.priority as keyof typeof PRIORITY_CONFIG]?.color || "text-gray-600";
  const typeConfig = TYPE_CONFIG[workOrder.type as keyof typeof TYPE_CONFIG];

  return (
    <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${isDragging ? "opacity-50 rotate-3" : ""}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {workOrder.osNumber}
              </Badge>
              <PriorityIcon className={`w-4 h-4 ${priorityColor}`} />
            </div>
            <h4 className="font-semibold text-sm line-clamp-2">{workOrder.title}</h4>
          </div>
        </div>

        {/* Type Badge */}
        <Badge className={`${typeConfig.color} text-xs`}>{typeConfig.label}</Badge>

        {/* Client */}
        {client && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate">{client.name}</span>
          </div>
        )}

        {/* Date */}
        {workOrder.scheduledDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(workOrder.scheduledDate).toLocaleDateString("pt-BR")}</span>
          </div>
        )}

        {/* Value */}
        {workOrder.estimatedValue && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span>R$ {(workOrder.estimatedValue / 100).toFixed(2)}</span>
          </div>
        )}

        {/* Hours */}
        {workOrder.estimatedHours && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{workOrder.estimatedHours}h estimadas</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
