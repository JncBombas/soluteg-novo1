import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface WorkOrder {
  id: number;
  osNumber: string;
  title: string;
  description?: string;
  serviceType?: string;
  status: string;
  priority: string;
  scheduledDate?: Date;
  completedDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminEditWorkOrder() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/work-orders/:id/edit");
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceType: "",
    status: "aberta" as string,
    priority: "normal" as string,
    scheduledDate: "",
    estimatedHours: "",
    actualHours: "",
  });

  const osId = params?.id ? parseInt(params.id) : null;

  const updateMutation = trpc.workOrders.update.useMutation({
    onSuccess: () => {
      toast.success("OS atualizada com sucesso!");
      setTimeout(() => {
        setLocation(`/admin/work-orders/${osId}`);
      }, 500);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao salvar OS");
    },
  });

  useEffect(() => {
    if (!osId) {
      setError("ID da OS não encontrado");
      setLoading(false);
      return;
    }

    loadWorkOrder();
  }, [osId]);

  const loadWorkOrder = async () => {
    if (!osId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/work-orders/${osId}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar OS");
      }

      const data = await response.json();
      setWorkOrder(data);
      setFormData({
        title: data.title || "",
        description: data.description || "",
        serviceType: data.serviceType || "",
        status: data.status || "aberta",
        priority: data.priority || "normal",
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString().split('T')[0] : "",
        estimatedHours: data.estimatedHours?.toString() || "",
        actualHours: data.actualHours?.toString() || "",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao carregar OS";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!osId) return;

    updateMutation.mutate({
      id: osId,
      title: formData.title,
      description: formData.description || undefined,
      serviceType: formData.serviceType || undefined,
      status: formData.status as any,
      priority: formData.priority as any,
      scheduledDate: formData.scheduledDate || undefined,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      actualHours: formData.actualHours ? parseInt(formData.actualHours) : undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Carregando ordem de serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/work-orders")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error || "Ordem de serviço não encontrada"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/work-orders")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Editar Ordem de Serviço</CardTitle>
            <CardDescription>OS #{workOrder.osNumber}</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Título da OS"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Tipo de Serviço */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Serviço</label>
                <Input
                  placeholder="Ex: Manutenção preventiva"
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descrição da OS"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Data Agendada */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Agendada</label>
                <Input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                />
              </div>

              {/* Status e Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Horas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas Estimadas</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Horas Reais</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: e.target.value })}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 justify-end pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/admin/work-orders/${osId}`)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
