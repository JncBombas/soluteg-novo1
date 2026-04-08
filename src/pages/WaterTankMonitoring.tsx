import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, Droplet, AlertTriangle, Loader2, ArrowLeft, Wifi, WifiOff, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface WaterTank {
  id: number;
  tankName: string;
  levelPercentage: number | null;
  capacity?: number | null;
  notes?: string | null;
  recordedAt: Date | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
}

function getActiveAlarm(pct: number, alarm2: number, alarm1: number, dead: number): "sci" | "alarm2" | "alarm1" | null {
  if (dead > 0 && pct < dead) return "sci";
  if (alarm2 > 0 && pct < alarm2) return "alarm2";
  if (alarm1 > 0 && pct < alarm1) return "alarm1";
  return null;
}

function getLevelColor(pct: number, alarm2: number, alarm1: number, dead: number) {
  const alarm = getActiveAlarm(pct, alarm2, alarm1, dead);
  if (alarm === "sci" || alarm === "alarm2") return { bar: "bg-red-500", text: "text-red-600" };
  if (alarm === "alarm1") return { bar: "bg-yellow-500", text: "text-yellow-600" };
  if (pct >= 75) return { bar: "bg-green-500", text: "text-green-600" };
  if (pct >= 50) return { bar: "bg-blue-500", text: "text-blue-600" };
  return { bar: "bg-blue-400", text: "text-blue-500" };
}

function getLevelStatus(pct: number, alarm2: number, alarm1: number, dead: number) {
  const alarm = getActiveAlarm(pct, alarm2, alarm1, dead);
  if (alarm === "sci") return "Emergência SCI";
  if (alarm === "alarm2") return "Crítico";
  if (alarm === "alarm1") return "Alerta";
  if (pct >= 75) return "Ótimo";
  if (pct >= 50) return "Bom";
  return "Normal";
}

/** Barra de nível com zona de volume morto SCI */
function LevelBar({ pct, dead, alarm1, alarm2 }: { pct: number; dead: number; alarm1: number; alarm2: number }) {
  const colors = getLevelColor(pct, alarm2, alarm1, dead);

  return (
    <div className="relative w-full bg-slate-200 rounded-full h-5 overflow-hidden">
      {/* Água atual */}
      <div
        className={`absolute left-0 top-0 h-full ${colors.bar} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />

      {/* Zona de volume morto SCI — listrada em vermelho */}
      {dead > 0 && (
        <div
          className="absolute left-0 top-0 h-full opacity-70"
          style={{
            width: `${dead}%`,
            background: "repeating-linear-gradient(45deg, #ef4444, #ef4444 4px, #fca5a5 4px, #fca5a5 8px)",
          }}
          title={`Reserva SCI: ${dead}%`}
        />
      )}

      {/* Linha do alarme 1 */}
      {alarm1 > 0 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-yellow-500 opacity-80"
          style={{ left: `${alarm1}%` }}
          title={`Alerta: ${alarm1}%`}
        />
      )}

      {/* Linha do alarme 2 */}
      {alarm2 > 0 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-red-600 opacity-80"
          style={{ left: `${alarm2}%` }}
          title={`Crítico: ${alarm2}%`}
        />
      )}
    </div>
  );
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

  const { data: initialTanks = [], isLoading } = trpc.waterTankMonitoring.getLatest.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  useEffect(() => {
    if (initialTanks.length > 0) setTanks(initialTanks as WaterTank[]);
  }, [initialTanks]);

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
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], levelPercentage: msg.currentLevel, recordedAt: new Date(msg.measuredAt) };
          return updated;
        });
      } catch { /* ignore */ }
    };
    return () => { es.close(); setSseConnected(false); };
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
                : <span className="flex items-center gap-1 text-xs text-slate-400"><WifiOff className="w-3 h-3" /> Reconectando...</span>}
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
            {tanks.map((tank) => {
              const pct = tank.levelPercentage;
              const dead = tank.deadVolumePct ?? 0;
              const a1 = tank.alarm1Pct ?? 30;
              const a2 = tank.alarm2Pct ?? 15;
              const alarm = pct != null ? getActiveAlarm(pct, a2, a1, dead) : null;
              const colors = pct != null ? getLevelColor(pct, a2, a1, dead) : { bar: "bg-slate-300", text: "text-slate-300" };

              return (
                <Card key={tank.tankName} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">

                    {/* Header do card */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{tank.tankName}</h3>
                        <p className="text-xs text-slate-500">
                          {tank.recordedAt
                            ? `${new Date(tank.recordedAt).toLocaleDateString("pt-BR")} às ${new Date(tank.recordedAt).toLocaleTimeString("pt-BR")}`
                            : "Aguardando primeiro sinal"}
                        </p>
                      </div>
                      <Droplet className={`w-6 h-6 ${colors.text}`} />
                    </div>

                    {/* Barra de nível */}
                    {pct != null ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">Nível total</span>
                          <span className={`text-lg font-bold ${colors.text}`}>{pct}%</span>
                        </div>

                        <LevelBar pct={pct} dead={dead} alarm1={a1} alarm2={a2} />

                        {/* Legenda da barra */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className={`font-semibold ${colors.text}`}>
                            {getLevelStatus(pct, a2, a1, dead)}
                          </span>
                          {dead > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500">
                              <span className="w-2 h-2 rounded-sm inline-block"
                                style={{ background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 2px,#fca5a5 2px,#fca5a5 4px)" }}
                              />
                              Reserva SCI {dead}%
                            </span>
                          )}
                          {a1 > 0 && (
                            <span className="flex items-center gap-0.5 text-yellow-600">
                              <span className="w-0.5 h-3 bg-yellow-500 inline-block" /> Alerta {a1}%
                            </span>
                          )}
                          {a2 > 0 && (
                            <span className="flex items-center gap-0.5 text-red-600">
                              <span className="w-0.5 h-3 bg-red-600 inline-block" /> Crítico {a2}%
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-5 bg-slate-100 rounded-full" />
                    )}

                    {/* Volumes */}
                    {tank.capacity && pct != null && (
                      <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 space-y-0.5">
                        <p>Capacidade total: <span className="font-semibold text-slate-900">{tank.capacity} L</span></p>
                        <p>Volume atual: <span className="font-semibold text-slate-900">{Math.round((tank.capacity * pct) / 100)} L</span></p>
                        {dead > 0 && (
                          <>
                            <p>Reserva SCI: <span className="font-semibold text-red-600">{Math.round((tank.capacity * dead) / 100)} L ({dead}%)</span></p>
                            <p>Vol. utilizável: <span className={`font-semibold ${pct > dead ? "text-slate-900" : "text-red-600"}`}>
                              {Math.max(0, Math.round((tank.capacity * (pct - dead)) / 100))} L
                            </span></p>
                          </>
                        )}
                      </div>
                    )}

                    {tank.capacity && pct == null && (
                      <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                        Capacidade: <span className="font-semibold text-slate-900">{tank.capacity} L</span>
                        {dead > 0 && (
                          <span className="ml-2 text-red-500">• Reserva SCI: {dead}%</span>
                        )}
                      </div>
                    )}

                    {tank.notes && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-900">{tank.notes}</div>
                    )}

                    {/* Alertas visuais */}
                    {alarm === "sci" && (
                      <div className="bg-red-50 border border-red-300 p-3 rounded-lg flex items-start gap-2">
                        <Flame className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-900 font-semibold">
                          Reserva de incêndio sendo consumida! Abastecimento imediato necessário.
                        </p>
                      </div>
                    )}
                    {alarm === "alarm2" && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-900">Nível crítico! Acionar abastecimento imediatamente.</p>
                      </div>
                    )}
                    {alarm === "alarm1" && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-900">Nível baixo. Verificar abastecimento em breve.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
