import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Droplet, TrendingUp, AlertTriangle, Plus, Loader2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface WaterTank {
  id: number;
  tankName: string;
  levelPercentage: number;
  capacity?: number | null;
  notes?: string | null;
  recordedAt: Date;
}

export default function WaterTankMonitoring() {
  const [, setLocation] = useLocation();
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    tankName: "",
    levelPercentage: 50,
    capacity: "",
    notes: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    const id = localStorage.getItem("clientId");
    const name = localStorage.getItem("clientName");

    if (!token || !id) {
      window.location.href = "/client/login";
      return;
    }

    setClientId(parseInt(id));
    setClientName(name || "Cliente");
  }, []);

  const { data: latestTanks = [], isLoading: isFetching, refetch } = trpc.waterTankMonitoring.getLatest.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("clientName");
    window.location.href = "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tankName.trim()) {
      toast.error("Nome da caixa d'água é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/water-tank-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          adminId: 1, // Será preenchido pelo backend
          tankName: formData.tankName,
          levelPercentage: parseInt(formData.levelPercentage.toString()),
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) throw new Error("Erro ao registrar monitoramento");

      toast.success("Registro de monitoramento criado com sucesso!");
      setFormData({ tankName: "", levelPercentage: 50, capacity: "", notes: "" });
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao registrar monitoramento");
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelColor = (percentage: number): string => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getLevelStatus = (percentage: number): string => {
    if (percentage >= 75) return "Ótimo";
    if (percentage >= 50) return "Bom";
    if (percentage >= 25) return "Baixo";
    return "Crítico";
  };

  const TankCard = ({ tank }: { tank: WaterTank }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{tank.tankName}</h3>
              <p className="text-sm text-slate-500">
                Última atualização: {new Date(tank.recordedAt).toLocaleDateString("pt-BR")} às {new Date(tank.recordedAt).toLocaleTimeString("pt-BR")}
              </p>
            </div>
            <Droplet className={`w-6 h-6 ${getLevelColor(tank.levelPercentage).replace('bg-', 'text-')}`} />
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Nível de Água</span>
              <span className={`text-lg font-bold ${getLevelColor(tank.levelPercentage).replace('bg-', 'text-')}`}>
                {tank.levelPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getLevelColor(tank.levelPercentage)} transition-all duration-300`}
                style={{ width: `${tank.levelPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              Status: <span className="font-semibold">{getLevelStatus(tank.levelPercentage)}</span>
            </p>
          </div>

          {/* Capacity Info */}
          {tank.capacity && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">
                Capacidade: <span className="font-semibold text-slate-900">{tank.capacity} litros</span>
              </p>
              <p className="text-sm text-slate-600">
                Volume atual: <span className="font-semibold text-slate-900">{Math.round((tank.capacity * tank.levelPercentage) / 100)} litros</span>
              </p>
            </div>
          )}

          {/* Notes */}
          {tank.notes && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-900">{tank.notes}</p>
            </div>
          )}

          {/* Alert for low level */}
          {tank.levelPercentage < 25 && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">Nível crítico! Recomenda-se reabastecer a caixa d'água.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isFetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitoramento de Caixa d'Água</h1>
            <p className="text-slate-600">Acompanhe os níveis de água em tempo real</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = "/client/portal"} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Registro
            </Button>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nível de Água</DialogTitle>
            <DialogDescription>Adicione um novo registro de monitoramento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tankName">Nome da Caixa d'Água</Label>
              <Input
                id="tankName"
                placeholder="Ex: Caixa Principal, Caixa Bloco A"
                value={formData.tankName}
                onChange={(e) => setFormData({ ...formData, tankName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="levelPercentage">Nível de Água (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="levelPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.levelPercentage}
                  onChange={(e) => setFormData({ ...formData, levelPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-slate-900 min-w-12">{formData.levelPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${getLevelColor(formData.levelPercentage)} transition-all duration-300`}
                  style={{ width: `${formData.levelPercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade (litros) - Opcional</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="Ex: 1000"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações - Opcional</Label>
              <Textarea
                id="notes"
                placeholder="Adicione qualquer observação relevante..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full bg-orange-500" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {latestTanks.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestTanks.map((tank) => (
              <TankCard key={tank.id} tank={tank} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum registro de monitoramento</h3>
              <p className="text-slate-600 mb-6">Comece adicionando o primeiro registro de nível de água.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Registro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
