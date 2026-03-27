import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, CheckCircle2, Circle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface WorkOrderTasksProps {
  workOrderId: number;
}

export default function WorkOrderTasks({ workOrderId }: WorkOrderTasksProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  const { data: tasks, refetch } = trpc.workOrders.tasks.list.useQuery({
    workOrderId,
  });

  const createTaskMutation = trpc.workOrders.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Tarefa criada com sucesso");
      refetch();
      setIsDialogOpen(false);
      setNewTask({ title: "", description: "" });
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao criar tarefa: ${err.message}`);
    },
  });

  const setStatusMutation = trpc.workOrders.tasks.setStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao atualizar tarefa: ${err.message}`);
    },
  });

  const deleteTaskMutation = trpc.workOrders.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Tarefa deletada com sucesso");
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao deletar tarefa: ${err.message}`);
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast.error("Título da tarefa é obrigatório");
      return;
    }

    createTaskMutation.mutate({
      workOrderId,
      title: newTask.title,
      description: newTask.description || undefined,
      orderIndex: (tasks?.length || 0) + 1,
    });
  };

  // Ciclo: 0 (pendente) → 1 (concluída) → 2 (não concluída/X) → 0
  const getNextStatus = (current: number) => {
    if (current === 0) return 1;
    if (current === 1) return 2;
    return 0;
  };

  const handleToggleTask = (taskId: number, currentStatus: number) => {
    setStatusMutation.mutate({
      id: taskId,
      status: getNextStatus(currentStatus),
      completedBy: "Admin",
    });
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm("Tem certeza que deseja deletar esta tarefa?")) {
      deleteTaskMutation.mutate({ id: taskId });
    }
  };

  const completedCount = tasks?.filter((t: { isCompleted: number }) => t.isCompleted === 1).length || 0;
  const notDoneCount = tasks?.filter((t: { isCompleted: number }) => t.isCompleted === 2).length || 0;
  const totalCount = tasks?.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tarefas / Checklist</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} de {totalCount} concluídas ({progress.toFixed(0)}%)
              {notDoneCount > 0 && ` • ${notDoneCount} não concluída(s)`}
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Adicione uma nova tarefa ao checklist desta OS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    placeholder="Ex: Verificar bomba d'água"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    placeholder="Detalhes adicionais sobre a tarefa..."
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks && tasks.length > 0 ? (
            tasks.map((task: { id: number; isCompleted: number; title: string; description?: string | null; completedAt?: Date | string | null; completedBy?: string | null }) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  task.isCompleted === 1
                    ? "bg-green-50 border-green-200"
                    : task.isCompleted === 2
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <GripVertical className="h-5 w-5 text-gray-400 mt-0.5 cursor-move" />

                <button
                  onClick={() => handleToggleTask(task.id, task.isCompleted)}
                  className="mt-0.5"
                  title={
                    task.isCompleted === 0
                      ? "Clique para marcar como concluída"
                      : task.isCompleted === 1
                      ? "Clique para marcar como não concluída"
                      : "Clique para redefinir como pendente"
                  }
                >
                  {task.isCompleted === 1 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : task.isCompleted === 2 ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      task.isCompleted === 1
                        ? "line-through text-gray-500"
                        : task.isCompleted === 2
                        ? "line-through text-red-500"
                        : "text-gray-900"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {task.description}
                    </p>
                  )}
                  {task.isCompleted === 1 && task.completedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Concluída em{" "}
                      {new Date(task.completedAt).toLocaleString("pt-BR")}
                      {task.completedBy && ` por ${task.completedBy}`}
                    </p>
                  )}
                  {task.isCompleted === 2 && (
                    <p className="text-xs text-red-400 mt-2">Não concluída</p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Circle className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma tarefa criada ainda</p>
              <p className="text-sm mt-1">
                Clique em "Nova Tarefa" para adicionar
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
