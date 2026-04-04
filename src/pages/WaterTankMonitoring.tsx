import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Droplet, AlertTriangle, Plus, Loader2, ArrowLeft, Wifi, WifiOff } from "lucide-react";
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

function getLevelColor(pct: number) {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 50) return "bg-blue-500";
  if (pct >= 25) return "bg-yellow-500";
  return "bg-red-500";
}

function getLevelStatus(pct: number) {
  if (pct >= 75) return "Ótimo";
  if (pct >= 50) return "Bom";
  if (pct >= 25) return "Baixo";
  return "Crítico";
}

export default function WaterTankMonitoring() {
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [tanks, setTanks] = useState<WaterTank[]>([]);
  const [formData, setFormData] = useState({ tankName: "", levelPercentage: 50, capacity: "", notes: "" });
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    const id = localStorage.getItem("clientId");
    const name = localStorage.getItem("clientName");
    if (!token || !id) { window.location.href = "/client/login"; return; }
    setClientId(parseInt(id));
    setClientName(name || "Cliente");
  }, []);

  // Carregar dados iniciais via tRPC
  const { data: initialTanks = [], isLoading } = trpc.waterTankMonitoring.getLatest.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  useEffect(() => {
    if (initialTanks.length > 0) setTanks(initialTanks as WaterTank[]);
  }, [initialTanks]);

  // SSE para atualizações em tempo real
  useEffect(() => {
    if (!clientId) return;

    const es = new EventSource(`/api/water-tank-sse?clientId=${clientId}`);
    sseRef.current = es;

    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "connected") { setSseConnected(true); return; }
        if (msg.type !== "level_update") return;

        setTanks((prev) => {
          const idx = prev.findIndex((t) => t.tankName === msg.tankName);
          if (idx === -1) {
            // Nova caixa adicionada via sensor — inserir no topo
            return [{
              id: Date.now(),
              tankName: msg.tankName,
              levelPercentage: msg.currentLevel,
              capacity: msg.capacity ?? null,
              notes: null,
              recordedAt: new Date(msg.measuredAt),
            }, ...prev];
          }
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            levelPercentage: msg.currentLevel,
            capacity: msg.capacity ?? updated[idx].capacity,
            recordedAt: new Date(msg.measuredAt),
          };
          return updated;
        });
      } catch { /* ignore parse errors */ }
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [clientId]);

  const handleLogout = () => {
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("clientName");
    window.location.href = "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tankName.trim()) { toast.error("Nome da caixa é obrigatório"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/water-tank-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          tankName: formData.tankName,
          levelPercentage: formData.levelPercentage,
          capacity: formData.capacity || undefined,
          notes: formData.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Registro salvo!");
      setFormData({ tankName: "", levelPercentage: 50, capacity: "", notes: "" });
      setIsDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Monitoramento de Caixa d'Água</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-slate-600 text-sm">Acompanhe os níveis em tempo real</p>
              {sseConnected
                ? <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3 h-3" /> Ao vivo</span>
                : <span className="flex items-center gap-1 text-xs text-slate-400"><WifiOff className="w-3 h-3" /> Reconectando...</span>
              }
            </div>
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

      {/* Dialog de registro manual */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nível de Água</DialogTitle>
            <DialogDescription>Adicione um registro manual enquanto o sensor não está instalado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tankName">Nome da Caixa d'Água</Label>
              <Input
                id="tankName"
                placeholder="Ex: Caixa Principal, Bloco A"
                value={formData.tankName}
                onChange={(e) => setFormData({ ...formData, tankName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Água (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number" min="0" max="100"
                  value={formData.levelPercentage}
                  onChange={(e) => setFormData({ ...formData, levelPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-slate-900 min-w-12">{formData.levelPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className={`h-full ${getLevelColor(formData.levelPercentage)} transition-all`} style={{ width: `${formData.levelPercentage}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacidade (litros) — Opcional</Label>
              <Input type="number" placeholder="Ex: 1000" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações — Opcional</Label>
              <Textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full bg-orange-500" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Registro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cards */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {tanks.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tanks.map((tank) => (
              <Card key={tank.tankName} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{tank.tankName}</h3>
                      <p className="text-xs text-slate-500">
                        {new Date(tank.recordedAt).toLocaleDateString("pt-BR")} às {new Date(tank.recordedAt).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                    <Droplet className={`w-6 h-6 ${getLevelColor(tank.levelPercentage).replace("bg-", "text-")}`} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Nível</span>
                      <span className={`text-lg font-bold ${getLevelColor(tank.levelPercentage).replace("bg-", "text-")}`}>
                        {tank.levelPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full ${getLevelColor(tank.levelPercentage)} transition-all duration-500`}
                        style={{ width: `${tank.levelPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600">Status: <span className="font-semibold">{getLevelStatus(tank.levelPercentage)}</span></p>
                  </div>

                  {tank.capacity && (
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 space-y-0.5">
                      <p>Capacidade: <span className="font-semibold text-slate-900">{tank.capacity} L</span></p>
                      <p>Volume atual: <span className="font-semibold text-slate-900">{Math.round((tank.capacity * tank.levelPercentage) / 100)} L</span></p>
                    </div>
                  )}

                  {tank.notes && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-900">{tank.notes}</div>
                  )}

                  {tank.levelPercentage < 25 && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900">Nível crítico! Recomenda-se reabastecer.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma caixa monitorada</h3>
              <p className="text-slate-600 mb-6">Adicione um registro manual ou aguarde o primeiro envio do sensor.</p>
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
