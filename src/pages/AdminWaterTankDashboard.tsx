import { useState, useEffect } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Droplet, Flame, AlertTriangle, Loader2, Copy, Check, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ---- helpers ----------------------------------------------------------------

function getActiveAlarm(pct: number, a2: number, a1: number, dead: number) {
  if (dead > 0 && pct < dead) return "sci";
  if (a2 > 0 && pct < a2) return "alarm2";
  if (a1 > 0 && pct < a1) return "alarm1";
  return null;
}

function getLevelColor(pct: number, a2: number, a1: number, dead: number) {
  const a = getActiveAlarm(pct, a2, a1, dead);
  if (a === "sci" || a === "alarm2") return { bar: "bg-red-500", text: "text-red-600", hex: "#ef4444" };
  if (a === "alarm1") return { bar: "bg-yellow-500", text: "text-yellow-600", hex: "#eab308" };
  if (pct >= 75) return { bar: "bg-green-500", text: "text-green-600", hex: "#22c55e" };
  if (pct >= 50) return { bar: "bg-blue-500", text: "text-blue-600", hex: "#3b82f6" };
  return { bar: "bg-blue-400", text: "text-blue-500", hex: "#60a5fa" };
}

function LevelBar({ pct, dead, alarm1, alarm2 }: { pct: number; dead: number; alarm1: number; alarm2: number }) {
  const colors = getLevelColor(pct, alarm2, alarm1, dead);
  return (
    <div className="relative w-full bg-slate-200 rounded-full h-6 overflow-hidden">
      <div className={`absolute left-0 top-0 h-full ${colors.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      {dead > 0 && (
        <div
          className="absolute left-0 top-0 h-full opacity-70"
          style={{ width: `${dead}%`, background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 4px,#fca5a5 4px,#fca5a5 8px)" }}
          title={`Reserva SCI: ${dead}%`}
        />
      )}
      {alarm1 > 0 && <div className="absolute top-0 h-full w-0.5 bg-yellow-400 opacity-90" style={{ left: `${alarm1}%` }} />}
      {alarm2 > 0 && <div className="absolute top-0 h-full w-0.5 bg-red-600 opacity-90" style={{ left: `${alarm2}%` }} />}
    </div>
  );
}

function alertTypeLabel(t: string) {
  if (t === "sci_reserve") return { label: "Emergência SCI", color: "destructive" as const };
  if (t === "alarm2") return { label: "Crítico (Alarme 2)", color: "destructive" as const };
  return { label: "Alerta (Alarme 1)", color: "secondary" as const };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
      className="ml-1 text-slate-400 hover:text-slate-700"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500 inline" /> : <Copy className="w-3.5 h-3.5 inline" />}
    </button>
  );
}

// ---- page -------------------------------------------------------------------

export default function AdminWaterTankDashboard() {
  const params = useParams<{ id: string }>();
  const sensorId = parseInt(params.id ?? "0");
  const [adminId, setAdminId] = useState<number | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) setAdminId(parseInt(id));
  }, []);

  const { data, isLoading, isError } = trpc.waterTankAdmin.getSensorDashboard.useQuery(
    { adminId: adminId ?? 0, sensorId },
    { enabled: !!adminId && !!sensorId, refetchInterval: 30_000 },
  );

  if (isLoading || !adminId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !data) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-slate-500">Sensor não encontrado.</div>
      </DashboardLayout>
    );
  }

  const { sensor, history, alerts } = data;
  const dead = sensor.deadVolumePct ?? 0;
  const a1 = sensor.alarm1Pct ?? 30;
  const a2 = sensor.alarm2Pct ?? 15;

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const pct = latest?.currentLevel ?? null;
  const colors = pct != null ? getLevelColor(pct, a2, a1, dead) : null;
  const alarm = pct != null ? getActiveAlarm(pct, a2, a1, dead) : null;
  const mqttTopic = `soluteg/clients/${sensor.clientId}/tanks/${sensor.tankName}/level`;

  // chart data — limit to last 100 points
  const chartData = history.slice(-100).map((r) => ({
    time: new Date(r.measuredAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    nivel: r.currentLevel,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500"
              onClick={() => window.location.href = "/admin/sensores-agua"}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-8 h-8 text-blue-500" />
              {sensor.tankName}
            </h1>
            <p className="text-slate-500 mt-0.5">
              Cliente: <span className="font-medium text-slate-700">{sensor.clientName}</span>
            </p>
          </div>

          {/* Status badge */}
          {pct != null && (
            <div className="flex items-center gap-2">
              {alarm === "sci" && <Badge variant="destructive" className="gap-1"><Flame className="w-3 h-3" /> Emergência SCI</Badge>}
              {alarm === "alarm2" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Crítico</Badge>}
              {alarm === "alarm1" && <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="w-3 h-3" /> Alerta</Badge>}
              {!alarm && <Badge className="gap-1 bg-green-500 hover:bg-green-600"><Activity className="w-3 h-3" /> Normal</Badge>}
            </div>
          )}
        </div>

        {/* Top row: nível atual + config */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* Nível atual */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nível atual</CardTitle>
              {latest && (
                <CardDescription>
                  Última leitura: {new Date(latest.measuredAt).toLocaleString("pt-BR")}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {pct != null ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className={`text-5xl font-bold ${colors!.text}`}>{pct}%</span>
                    {sensor.capacity && (
                      <span className="text-slate-500 mb-1 text-sm">
                        ≈ {Math.round((sensor.capacity * pct) / 100).toLocaleString("pt-BR")} L
                      </span>
                    )}
                  </div>

                  <LevelBar pct={pct} dead={dead} alarm1={a1} alarm2={a2} />

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {dead > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <span className="w-2 h-2 rounded-sm inline-block"
                          style={{ background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 2px,#fca5a5 2px,#fca5a5 4px)" }} />
                        Reserva SCI {dead}%
                      </span>
                    )}
                    {a1 > 0 && <span className="text-yellow-600"><span className="inline-block w-0.5 h-3 bg-yellow-400 mr-1" />Alerta {a1}%</span>}
                    {a2 > 0 && <span className="text-red-600"><span className="inline-block w-0.5 h-3 bg-red-600 mr-1" />Crítico {a2}%</span>}
                  </div>

                  {sensor.capacity && (
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 space-y-0.5">
                      <p>Capacidade: <span className="font-semibold text-slate-900">{sensor.capacity.toLocaleString("pt-BR")} L</span></p>
                      <p>Volume atual: <span className="font-semibold text-slate-900">{Math.round((sensor.capacity * pct) / 100).toLocaleString("pt-BR")} L</span></p>
                      {dead > 0 && (
                        <>
                          <p>Reserva SCI: <span className="font-semibold text-red-600">{Math.round((sensor.capacity * dead) / 100).toLocaleString("pt-BR")} L</span></p>
                          <p>Vol. utilizável: <span className={`font-semibold ${pct > dead ? "text-slate-900" : "text-red-600"}`}>
                            {Math.max(0, Math.round((sensor.capacity * (pct - dead)) / 100)).toLocaleString("pt-BR")} L
                          </span></p>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <Droplet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aguardando primeira leitura</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuração */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">

              <div>
                <p className="text-xs text-slate-500 mb-0.5">Tópico MQTT</p>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono break-all">{mqttTopic}</code>
                  <CopyButton text={mqttTopic} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Payload: {`{"level_pct": 73}`}</p>
              </div>

              <div className="border-t pt-2 space-y-1.5 text-slate-700">
                {sensor.clientPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">WhatsApp cliente</span>
                    <span className="font-medium">{sensor.clientPhone}</span>
                  </div>
                )}
                {sensor.alertPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tel. adicional</span>
                    <span className="font-medium">{sensor.alertPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Volume morto SCI</span>
                  <span className={`font-medium ${dead > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {dead > 0 ? `${dead}%` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alerta 1</span>
                  <span className="font-medium text-yellow-600">{a1 > 0 ? `${a1}%` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alerta 2 (crítico)</span>
                  <span className="font-medium text-red-600">{a2 > 0 ? `${a2}%` : "—"}</span>
                </div>
                {sensor.notes && (
                  <div className="bg-blue-50 border border-blue-200 p-2 rounded text-blue-900 text-xs mt-2">
                    {sensor.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de nível */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de nível</CardTitle>
            <CardDescription>Últimas {chartData.length} leituras</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Nível"]} />
                  {dead > 0 && (
                    <ReferenceLine y={dead} stroke="#ef4444" strokeDasharray="4 3" label={{ value: `SCI ${dead}%`, fill: "#ef4444", fontSize: 11 }} />
                  )}
                  {a1 > 0 && (
                    <ReferenceLine y={a1} stroke="#eab308" strokeDasharray="4 3" label={{ value: `Alerta ${a1}%`, fill: "#ca8a04", fontSize: 11 }} />
                  )}
                  {a2 > 0 && (
                    <ReferenceLine y={a2} stroke="#dc2626" strokeDasharray="4 3" label={{ value: `Crítico ${a2}%`, fill: "#dc2626", fontSize: 11 }} />
                  )}
                  <Line
                    type="monotone"
                    dataKey="nivel"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={chartData.length <= 20}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                Dados insuficientes para o gráfico.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Log de alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log de alertas</CardTitle>
            <CardDescription>{alerts.length} alerta{alerts.length !== 1 ? "s" : ""} registrado{alerts.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Nenhum alerta enviado ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data / Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nível no disparo</TableHead>
                      <TableHead>Limiar</TableHead>
                      <TableHead>Enviado para</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a) => {
                      const { label, color } = alertTypeLabel(a.alertType);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {new Date(a.sentAt).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={color} className="text-xs">{label}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">{a.currentLevel}%</TableCell>
                          <TableCell className="text-slate-500">{a.triggerPct}%</TableCell>
                          <TableCell className="text-sm text-slate-600">{a.sentTo ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
