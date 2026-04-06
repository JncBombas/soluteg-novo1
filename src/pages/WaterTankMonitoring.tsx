import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, Droplet, AlertTriangle, Loader2, ArrowLeft, Wifi, WifiOff } from "lucide-react";
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
  const [sseConnected, setSseConnected] = useState(false);
  const [tanks, setTanks] = useState<WaterTank[]>([]);
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
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </div>

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
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aguardando sensores</h3>
              <p className="text-slate-600">Os níveis aparecerão aqui automaticamente quando os sensores enviarem dados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
