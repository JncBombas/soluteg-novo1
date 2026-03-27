import { useState } from "react";
import { InspectionTaskItem } from "./InspectionTaskItem";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  PenTool,
  Edit2,
  X,
} from "lucide-react";
import ChecklistForm from "./ChecklistForm";
import SignaturePad from "./SignaturePad";

interface InspectionTasksTabProps {
  workOrderId: number;
}

export default function InspectionTasksTab({ workOrderId }: InspectionTasksTabProps) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddChecklistOpen, setIsAddChecklistOpen] = useState(false);
  const [isCompleteTaskOpen, setIsCompleteTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [power, setPower] = useState("");
  
  // Campos de conclusão
  const [collaboratorName, setCollaboratorName] = useState("");
  const [collaboratorDocument, setCollaboratorDocument] = useState("");
  const [collaboratorSignature, setCollaboratorSignature] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientSignature, setClientSignature] = useState("");
  const [deleteChecklistDialogOpen, setDeleteChecklistDialogOpen] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: inspectionTasks, isLoading: isLoadingTasks } = trpc.checklists.inspectionTasks.listByWorkOrder.useQuery(
    { workOrderId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  const { data: templates = [] } = trpc.checklists.templates.list.useQuery();

  // Mutations
  const createTaskMutation = trpc.checklists.inspectionTasks.create.useMutation({
    onSuccess: async () => {
      toast.success("Tarefa de inspeção criada com sucesso!");
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
      setIsCreateTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
    },
    onError: (error) => {
      toast.error(`Erro ao criar tarefa: ${error.message}`);
    },
  });

  const deleteTaskMutation = trpc.checklists.inspectionTasks.delete.useMutation({
    onSuccess: async () => {
      toast.success("Tarefa deletada com sucesso!");
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
    },
    onError: (error) => {
      toast.error(`Erro ao deletar tarefa: ${error.message}`);
    },
  });

  const createChecklistMutation = trpc.checklists.instances.create.useMutation({
    onSuccess: async () => {
      toast.success("Checklist adicionado com sucesso!");
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
      setIsAddChecklistOpen(false);
      setSelectedTemplateId("");
      setCustomTitle("");
      setBrand("");
      setPower("");
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar checklist: ${error.message}`);
    },
  });

  const deleteChecklistMutation = trpc.checklists.instances.delete.useMutation({
    onSuccess: async () => {
      toast.success("Checklist removido com sucesso!");
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
      await utils.checklists.inspectionTasks.listByWorkOrder.refetch({ workOrderId });
      setDeleteChecklistDialogOpen(null);
    },
    onError: (error) => {
      toast.error(`Erro ao remover checklist: ${error.message}`);
      setDeleteChecklistDialogOpen(null);
    },
  });

  // Estado para rastrear qual checklist está sendo salvo
  const [savingChecklistId, setSavingChecklistId] = useState<number | null>(null);

  const updateResponsesMutation = trpc.checklists.instances.updateResponses.useMutation({
    onSuccess: async () => {
      toast.success("Respostas salvas com sucesso!");
      setSavingChecklistId(null);
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar respostas: ${error.message}`);
      setSavingChecklistId(null);
    },
  });

  const completeTaskMutation = trpc.checklists.inspectionTasks.complete.useMutation({
    onSuccess: async () => {
      toast.success("Tarefa concluída com sucesso!");
      await utils.checklists.inspectionTasks.listByWorkOrder.invalidate({ workOrderId });
      setIsCompleteTaskOpen(false);
      resetCompleteForm();
    },
    onError: (error) => {
      toast.error(`Erro ao concluir tarefa: ${error.message}`);
    },
  });

  const resetCompleteForm = () => {
    setCollaboratorName("");
    setCollaboratorDocument("");
    setCollaboratorSignature("");
    setClientName("");
    setClientSignature("");
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Digite um título para a tarefa");
      return;
    }
    createTaskMutation.mutate({
      workOrderId,
      title: newTaskTitle,
      description: newTaskDescription || undefined,
    });
  };

  const handleAddChecklist = () => {
    if (!selectedTaskId || !selectedTemplateId || !customTitle.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createChecklistMutation.mutate({
      inspectionTaskId: selectedTaskId,
      templateId: parseInt(selectedTemplateId),
      customTitle,
      brand: brand || undefined,
      power: power || undefined,
    });
  };

  const handleCompleteTask = () => {
    if (!selectedTaskId || !collaboratorName || !collaboratorDocument || !collaboratorSignature) {
      toast.error("Preencha todos os campos obrigatórios do colaborador");
      return;
    }
    completeTaskMutation.mutate({
      id: selectedTaskId,
      collaboratorName,
      collaboratorDocument,
      collaboratorSignature,
      clientName: clientName || undefined,
      clientSignature: clientSignature || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "em_andamento":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertCircle className="h-3 w-3 mr-1" />Em Andamento</Badge>;
      case "concluida":
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoadingTasks) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botão para criar nova tarefa */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tarefas de Inspeção</h3>
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Tarefa de Inspeção</DialogTitle>
              <DialogDescription>
                Crie uma tarefa para agrupar os checklists de inspeção.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Título *</Label>
                <Input
                  id="taskTitle"
                  placeholder="Ex: Inspeção Mensal"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDescription">Descrição</Label>
                <Textarea
                  id="taskDescription"
                  placeholder="Descrição opcional da tarefa"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de tarefas */}
      {!inspectionTasks || inspectionTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">Nenhuma tarefa de inspeção</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Crie uma tarefa para adicionar checklists de inspeção.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {inspectionTasks.map((task) => (
            <InspectionTaskItem
              key={task.id}
              task={task}
              workOrderId={workOrderId}
              templates={templates || []}
              onAddChecklist={(taskId) => {
                setSelectedTaskId(taskId);
                setIsAddChecklistOpen(true);
              }}
              onDeleteTask={(taskId) => deleteTaskMutation.mutate({ id: taskId })}
              onDeleteChecklist={(checklistId) => deleteChecklistMutation.mutate({ id: checklistId })}
              onSaveResponses={(checklistId, responses, isComplete) => {
                setSavingChecklistId(checklistId);
                updateResponsesMutation.mutate({ id: checklistId, responses, isComplete });
              }}
              onCompleteTask={(taskId) => {
                setSelectedTaskId(taskId);
                setIsCompleteTaskOpen(true);
              }}
              isSavingResponses={savingChecklistId === task.id && updateResponsesMutation.isPending}
              deleteChecklistDialogOpen={deleteChecklistDialogOpen}
              setDeleteChecklistDialogOpen={setDeleteChecklistDialogOpen}
              deleteChecklistMutation={deleteChecklistMutation}
            />
          ))}
        </Accordion>
      )}

      {/* Modal para adicionar checklist */}
      <Dialog open={isAddChecklistOpen} onOpenChange={setIsAddChecklistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Checklist</DialogTitle>
            <DialogDescription>
              Selecione um tipo de checklist e personalize o título.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Checklist *</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customTitle">Título Personalizado *</Label>
              <Input
                id="customTitle"
                placeholder="Ex: Bomba de Recalque Bloco 1"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  placeholder="Ex: WEG"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="power">Potência</Label>
                <Input
                  id="power"
                  placeholder="Ex: 5 CV"
                  value={power}
                  onChange={(e) => setPower(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChecklistOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddChecklist} disabled={createChecklistMutation.isPending}>
              {createChecklistMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para concluir tarefa */}
      <Dialog open={isCompleteTaskOpen} onOpenChange={setIsCompleteTaskOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Concluir Tarefa de Inspeção</DialogTitle>
            <DialogDescription>
              Preencha os dados e colete as assinaturas para finalizar a tarefa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Dados do Colaborador */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Dados do Colaborador *
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="collabName">Nome Completo *</Label>
                  <Input
                    id="collabName"
                    placeholder="Nome do colaborador"
                    value={collaboratorName}
                    onChange={(e) => setCollaboratorName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collabDoc">CPF ou RG *</Label>
                  <Input
                    id="collabDoc"
                    placeholder="000.000.000-00"
                    value={collaboratorDocument}
                    onChange={(e) => setCollaboratorDocument(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assinatura do Colaborador *</Label>
                <SignaturePad
                  onSave={setCollaboratorSignature}
                  onClear={() => setCollaboratorSignature("")}
                />
                {collaboratorSignature && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Assinatura capturada
                  </Badge>
                )}
              </div>
            </div>

            {/* Dados do Cliente (opcional) */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados do Cliente (opcional)
              </h4>
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  placeholder="Nome do responsável pelo cliente"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Assinatura do Cliente</Label>
                <SignaturePad
                  onSave={setClientSignature}
                  onClear={() => setClientSignature("")}
                />
                {clientSignature && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Assinatura capturada
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteTaskOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCompleteTask} 
              disabled={completeTaskMutation.isPending || !collaboratorSignature}
            >
              {completeTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Concluir Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para cada tarefa de inspeção
interface InspectionTaskItemProps {
  task: {
    id: number;
    title: string;
    description: string | null;
    status: string;
    completedAt: Date | null;
  };
  templates: Array<{ id: number; name: string; formStructure: string }>;
  onAddChecklist: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onDeleteChecklist: (checklistId: number) => void;
  onSaveResponses: (checklistId: number, responses: Record<string, unknown>, isComplete: boolean) => void;
  onCompleteTask: (taskId: number) => void;
  isSavingResponses: boolean;
  deleteChecklistDialogOpen: number | null;
  setDeleteChecklistDialogOpen: (id: number | null) => void;
  deleteChecklistMutation: { isPending: boolean };
  onAddChecklistClick?: (taskId: number) => void;
}