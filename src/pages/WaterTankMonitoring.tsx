import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogOut, Droplet, AlertTriangle, Loader2, ArrowLeft,
  Wifi, WifiOff, Flame, CheckCircle, Info, BarChart2, Bell,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, Tooltip as RechartTooltip, ResponsiveContainer, YAxis,
  LineChart, Line, XAxis, CartesianGrid, Tooltip, ReferenceLine, Brush,
} from "recharts";

const RANGES = [
  { label: "6h",  days: 0.25 },
  { label: "24h", days: 1 },
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
] as const;
type RangeDays = typeof RANGES[number]["days"];

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveAlarm(pct: number, a2: number, a1: number, dead: number) {
  if (dead > 0 && pct < dead) return "sci" as const;
  if (a2 > 0 && pct < a2) return "alarm2" as const;
  if (a1 > 0 && pct < a1) return "alarm1" as const;
  return null;
}

function getWaterGradient(pct: number, a2: number, a1: number, dead: number) {
  const alarm = getActiveAlarm(pct, a2, a1, dead);
  if (alarm === "sci" || alarm === "alarm2") return "linear-gradient(to top, #b91c1c, #ef4444)";
  if (alarm === "alarm1")                    return "linear-gradient(to top, #a16207, #eab308)";
  if (pct >= 75) return "linear-gradient(to top, #15803d, #22c55e)";
  if (pct >= 50) return "linear-gradient(to top, #1d4ed8, #60a5fa)";
  return "linear-gradient(to top, #2563eb, #93c5fd)";
}

function getTextColor(pct: number, a2: number, a1: number, dead: number) {
  const alarm = getActiveAlarm(pct, a2, a1, dead);
  if (alarm === "sci" || alarm === "alarm2") return "text-red-600";
  if (alarm === "alarm1")                    return "text-yellow-600";
  if (pct >= 75) return "text-green-600";
  return "text-blue-600";
}

function getStatusInfo(pct: number, a2: number, a1: number, dead: number) {
  const alarm = getActiveAlarm(pct, a2, a1, dead);
  if (alarm === "sci")    return { label: "Emergência SCI", bg: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-600" };
  if (alarm === "alarm2") return { label: "Crítico",         bg: "bg-red-100 text-red-800 border-red-200",          dot: "bg-red-500" };
  if (alarm === "alarm1") return { label: "Alerta",          bg: "bg-yellow-100 text-yellow-800 border-yellow-200", dot: "bg-yellow-500" };
  if (pct >= 75) return { label: "Ótimo",  bg: "bg-green-100 text-green-800 border-green-200", dot: "bg-green-500" };
  if (pct >= 50) return { label: "Bom",    bg: "bg-blue-100 text-blue-800 border-blue-200",    dot: "bg-blue-500" };
  return          { label: "Normal", bg: "bg-slate-100 text-slate-700 border-slate-200",   dot: "bg-slate-400" };
}

function fmt(n: number) { return n.toLocaleString("pt-BR"); }

function fmtTime(date: Date | null, short = false) {
  if (!date) return "Sem leituras ainda";
  return `Atualizado ${new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: short ? undefined : "2-digit" })}`;
}

// ── Signal status ─────────────────────────────────────────────────────────────
// Buffer = 30 s → leitura normal chega a cada ~30 s.
// 3 min sem leitura = provável instabilidade; 10 min = fora do ar.

function getSensorSignalStatus(recordedAt: Date | null) {
  if (!recordedAt) return "never" as const;
  const ago = Date.now() - new Date(recordedAt).getTime();
  if (ago < 3 * 60_000)  return "live"    as const;
  if (ago < 10 * 60_000) return "delayed" as const;
  return "offline" as const;
}

function SignalBadge({ recordedAt }: { recordedAt: Date | null }) {
  const status = getSensorSignalStatus(recordedAt);
  if (status === "live") return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      Ao vivo
    </span>
  );
  if (status === "delayed") return (
    <span className="flex items-center gap-1 text-xs font-medium text-yellow-600">
      <span className="w-2 h-2 rounded-full bg-yellow-400" />
      Sem sinal
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
      <WifiOff className="w-3 h-3" />
      Fora do ar
    </span>
  );
}

// ── Vertical tank visual ──────────────────────────────────────────────────────

function TankVisual({
  pct, dead, alarm1, alarm2, large = false,
}: { pct: number | null; dead: number; alarm1: number; alarm2: number; large?: boolean }) {
  const H = large ? 220 : 160;
  const W = large ? 72 : 52;

  return (
    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: W }}>
      <div
        className="relative w-full rounded-t-sm rounded-b-xl border-2 border-slate-300 bg-slate-100 overflow-hidden"
        style={{ height: H }}
      >
        {[25, 50, 75].map((m) => (
          <div key={m} className="absolute left-0 right-0 pointer-events-none" style={{ bottom: `${m}%` }}>
            <div className="w-full h-px bg-slate-200 opacity-60" />
          </div>
        ))}

        {dead > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 opacity-80"
            style={{ height: `${dead}%`, background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 3px,#fca5a5 3px,#fca5a5 6px)" }}
          />
        )}

        {pct != null && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-1000"
            style={{ height: `${pct}%`, background: getWaterGradient(pct, alarm2, alarm1, dead) }}
          >
            <div className="absolute -top-1 left-0 right-0 h-3 bg-white opacity-30 water-wave-surface" />
          </div>
        )}

        {alarm1 > 0 && (
          <div className="absolute left-0 right-0 h-0.5 bg-yellow-400 z-30 opacity-90" style={{ bottom: `${alarm1}%` }} />
        )}
        {alarm2 > 0 && (
          <div className="absolute left-0 right-0 h-0.5 bg-red-600 z-30 opacity-90" style={{ bottom: `${alarm2}%` }} />
        )}

        {pct != null && (
          <div className="absolute left-0 right-0 z-40 flex justify-center" style={{ bottom: `${Math.min(pct + 2, 94)}%` }}>
            <span className="text-[9px] font-bold text-white drop-shadow leading-none">{pct}%</span>
          </div>
        )}
      </div>

      <div className="flex justify-between w-full text-[9px] text-slate-400 px-0.5">
        <span>0</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── Sparkline (preview rápido, mobile) ───────────────────────────────────────

function Sparkline({ data, alarm1, alarm2, dead }: {
  data: Array<{ level: number; time: string }>;
  alarm1: number; alarm2: number; dead: number;
}) {
  if (data.length < 2) return null;
  const chartData = data.map((d) => ({
    v: d.level,
    t: new Date(d.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }));
  const last = data[data.length - 1].level;
  const color = getActiveAlarm(last, alarm2, alarm1, dead) === null ? "#3b82f6" : "#ef4444";

  return (
    <div className="w-full mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] text-slate-400 mb-1">Últimas {data.length} leituras</p>
      <ResponsiveContainer width="100%" height={56}>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: -32, bottom: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <RechartTooltip formatter={(v: number) => [`${v}%`, "Nível"]} labelFormatter={(l) => l} contentStyle={{ fontSize: 11, padding: "2px 8px" }} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace("#", "")})`} dot={false} activeDot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ tanks, sseConnected }: { tanks: WaterTank[]; sseConnected: boolean }) {
  const withLevel = tanks.filter((t) => t.levelPercentage != null);
  const sci    = withLevel.filter((t) => getActiveAlarm(t.levelPercentage!, t.alarm2Pct, t.alarm1Pct, t.deadVolumePct) === "sci");
  const alarm2 = withLevel.filter((t) => getActiveAlarm(t.levelPercentage!, t.alarm2Pct, t.alarm1Pct, t.deadVolumePct) === "alarm2");
  const alarm1 = withLevel.filter((t) => getActiveAlarm(t.levelPercentage!, t.alarm2Pct, t.alarm1Pct, t.deadVolumePct) === "alarm1");
  const ok     = withLevel.length - sci.length - alarm2.length - alarm1.length;

  const offline = tanks.filter((t) => getSensorSignalStatus(t.recordedAt) === "offline").length;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border rounded-xl shadow-sm text-sm">
      <div className="flex items-center gap-1.5 mr-auto">
        {sseConnected
          ? <><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-green-600 font-medium text-xs">Conectado</span></>
          : <><div className="w-2 h-2 rounded-full bg-slate-300" /><span className="text-slate-400 text-xs">Reconectando…</span></>
        }
      </div>
      <div className="flex items-center gap-1 text-slate-500">
        <Droplet className="w-4 h-4 text-blue-400" />
        <span className="font-semibold text-slate-700">{tanks.length}</span>
        <span className="hidden sm:inline">caixa{tanks.length !== 1 ? "s" : ""}</span>
      </div>
      {ok > 0 && (
        <div className="flex items-center gap-1 text-green-700">
          <CheckCircle className="w-4 h-4" /><span className="font-semibold">{ok}</span>
          <span className="hidden sm:inline text-xs">normal</span>
        </div>
      )}
      {alarm1.length > 0 && (
        <div className="flex items-center gap-1 text-yellow-700">
          <AlertTriangle className="w-4 h-4" /><span className="font-semibold">{alarm1.length}</span>
          <span className="hidden sm:inline text-xs">alerta</span>
        </div>
      )}
      {(alarm2.length > 0 || sci.length > 0) && (
        <div className="flex items-center gap-1 text-red-700">
          <Flame className="w-4 h-4" /><span className="font-semibold">{alarm2.length + sci.length}</span>
          <span className="hidden sm:inline text-xs">crítico</span>
        </div>
      )}
      {offline > 0 && (
        <div className="flex items-center gap-1 text-slate-400">
          <WifiOff className="w-4 h-4" /><span className="font-semibold">{offline}</span>
          <span className="hidden sm:inline text-xs">fora do ar</span>
        </div>
      )}
    </div>
  );
}

// ── Tank chart (interativo) ───────────────────────────────────────────────────

function TankChart({ clientId, tankName, alarm1, alarm2, dead, height = 220 }: {
  clientId: number; tankName: string;
  alarm1: number; alarm2: number; dead: number;
  height?: number;
}) {
  const [days, setDays] = useState<RangeDays>(1);

  const { data = [], isFetching } = trpc.waterTankMonitoring.getTankHistory.useQuery(
    { tankName, days },
    { staleTime: 60_000 },
  );

  const timeFormat = (iso: string) => {
    const d = new Date(iso);
    if (days <= 1) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const chartData = (data as Array<{ nivel: number; time: string }>).map((r) => ({
    time: timeFormat(r.time),
    rawTime: new Date(r.time).toLocaleString("pt-BR"),
    nivel: r.nivel,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-400">{isFetching ? "Carregando…" : `${chartData.length} pontos`}</span>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                days === r.days ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isFetching ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
        </div>
      ) : chartData.length < 2 ? (
        <div className="flex items-center justify-center text-slate-400 text-xs" style={{ height }}>
          Sem dados para este período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={40} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} width={36} />
            <Tooltip
              formatter={(v: number) => [`${v}%`, "Nível"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.rawTime ?? ""}
              contentStyle={{ fontSize: 11 }}
            />
            {dead > 0   && <ReferenceLine y={dead}   stroke="#ef4444" strokeDasharray="4 3" label={{ value: `SCI ${dead}%`,     fill: "#ef4444", fontSize: 10 }} />}
            {alarm1 > 0 && <ReferenceLine y={alarm1} stroke="#eab308" strokeDasharray="4 3" label={{ value: `⚠ ${alarm1}%`,   fill: "#ca8a04", fontSize: 10 }} />}
            {alarm2 > 0 && <ReferenceLine y={alarm2} stroke="#dc2626" strokeDasharray="4 3" label={{ value: `🚨 ${alarm2}%`, fill: "#dc2626", fontSize: 10 }} />}
            <Line type="monotone" dataKey="nivel" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Brush dataKey="time" height={20} stroke="#94a3b8" fill="#f1f5f9" travellerWidth={6} tickFormatter={() => ""} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Alarm log (desktop) ───────────────────────────────────────────────────────

function AlarmLog({ clientId, tankName }: { clientId: number; tankName: string }) {
  const { data = [], isLoading } = trpc.waterTankMonitoring.getAlarmHistory.useQuery(
    { tankName },
    { staleTime: 5 * 60_000 },
  );

  if (isLoading) {
    return <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>;
  }

  if ((data as any[]).length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 text-xs">
        <Bell className="w-6 h-6 mx-auto mb-1 opacity-30" />
        Nenhum alarme registrado.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {(data as Array<{ id: number; alertType: string; triggerPct: number; currentLevel: number; sentAt: string }>).map((a) => {
        const isSci  = a.alertType === "sci_reserve";
        const isCrit = a.alertType === "alarm2";
        return (
          <div key={a.id} className={`p-2.5 rounded-lg text-xs border ${isSci || isCrit ? "bg-red-50 border-red-100" : "bg-yellow-50 border-yellow-100"}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span>{isSci ? "🔥" : isCrit ? "🚨" : "⚠️"}</span>
              <span className={`font-semibold ${isSci || isCrit ? "text-red-800" : "text-yellow-800"}`}>
                {isSci ? "Emergência SCI" : isCrit ? "Nível Crítico" : "Alerta de Nível"}
              </span>
            </div>
            <p className="text-slate-500 ml-5">
              {a.currentLevel}% · {new Date(a.sentAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Alarm banners (shared) ────────────────────────────────────────────────────

function AlarmBanners({ alarm, compact = false }: { alarm: ReturnType<typeof getActiveAlarm>; compact?: boolean }) {
  const p = compact ? "p-2.5" : "p-3";
  const icon = compact ? "w-4 h-4" : "w-5 h-5";
  const title = compact ? "text-xs" : "text-sm";
  const sub = "text-xs";

  if (alarm === "sci") return (
    <div className={`bg-red-50 border border-red-300 rounded-xl ${p} flex items-start gap-2`}>
      <Flame className={`${icon} text-red-700 shrink-0 mt-0.5 animate-pulse`} />
      <div>
        <p className={`${title} font-bold text-red-900`}>Reserva de incêndio atingida!</p>
        <p className={`${sub} text-red-700 mt-0.5`}>Volume abaixo do limite SCI. Abastecimento imediato necessário.</p>
      </div>
    </div>
  );
  if (alarm === "alarm2") return (
    <div className={`bg-red-50 border border-red-200 rounded-xl ${p} flex items-start gap-2`}>
      <AlertTriangle className={`${icon} text-red-600 shrink-0 mt-0.5`} />
      <div>
        <p className={`${title} font-bold text-red-900`}>Nível crítico!</p>
        <p className={`${sub} text-red-700 mt-0.5`}>Acionar abastecimento imediatamente.</p>
      </div>
    </div>
  );
  if (alarm === "alarm1") return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-xl ${p} flex items-start gap-2`}>
      <AlertTriangle className={`${icon} text-yellow-600 shrink-0 mt-0.5`} />
      <div>
        <p className={`${title} font-bold text-yellow-900`}>Nível baixo</p>
        <p className={`${sub} text-yellow-800 mt-0.5`}>Verificar abastecimento em breve.</p>
      </div>
    </div>
  );
  return null;
}

// ── Tank card ─────────────────────────────────────────────────────────────────

function TankCard({ tank, sparkData, clientId }: {
  tank: WaterTank;
  sparkData: Array<{ level: number; time: string }> | undefined;
  clientId: number;
}) {
  const [showChart, setShowChart] = useState(false);
  const pct  = tank.levelPercentage;
  const dead = tank.deadVolumePct ?? 0;
  const a1   = tank.alarm1Pct ?? 30;
  const a2   = tank.alarm2Pct ?? 15;
  const alarm   = pct != null ? getActiveAlarm(pct, a2, a1, dead) : null;
  const status  = pct != null ? getStatusInfo(pct, a2, a1, dead) : null;
  const textCol = pct != null ? getTextColor(pct, a2, a1, dead) : "text-slate-300";

  const cardBorder =
    alarm === "sci" || alarm === "alarm2" ? "border-red-300 shadow-red-100"
    : alarm === "alarm1"                  ? "border-yellow-300 shadow-yellow-100"
    :                                       "border-transparent";

  return (
    <Card className={`border-2 ${cardBorder} shadow-md hover:shadow-lg transition-shadow`}>
      <CardContent className="p-5">

        {/* ══════════════════════════════════════════════════════════════
            DESKTOP LAYOUT (md+)
        ══════════════════════════════════════════════════════════════ */}
        <div className="hidden md:block">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-900">{tank.tankName}</h3>
              {status && (
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SignalBadge recordedAt={tank.recordedAt} />
              <p className="text-xs text-slate-400">{fmtTime(tank.recordedAt)}</p>
            </div>
          </div>

          {/* 3 columns */}
          <div className="grid grid-cols-[160px_1fr_260px] gap-6">

            {/* ── Col 1: Tank + stats ──────────────────────────────── */}
            <div className="flex flex-col items-center">
              <TankVisual pct={pct} dead={dead} alarm1={a1} alarm2={a2} large />

              {pct != null ? (
                <>
                  <div className="mt-3 text-center">
                    <span className={`text-5xl font-extrabold leading-none ${textCol}`}>{pct}%</span>
                    {tank.capacity && (
                      <p className="text-sm text-slate-500 mt-1">
                        {fmt(Math.round((tank.capacity * pct) / 100))} L
                      </p>
                    )}
                  </div>

                  {tank.capacity && (
                    <div className="mt-3 w-full space-y-1 text-xs bg-slate-50 rounded-lg p-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacidade</span>
                        <span className="font-semibold text-slate-900">{fmt(tank.capacity)} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Volume atual</span>
                        <span className={`font-semibold ${textCol}`}>{fmt(Math.round((tank.capacity * pct) / 100))} L</span>
                      </div>
                      {dead > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Reserva SCI</span>
                            <span className="font-semibold text-red-600">{fmt(Math.round((tank.capacity * dead) / 100))} L</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Utilizável</span>
                            <span className={`font-semibold ${pct > dead ? "text-slate-900" : "text-red-600"}`}>
                              {fmt(Math.max(0, Math.round((tank.capacity * (pct - dead)) / 100)))} L
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-2 w-full flex flex-col gap-0.5 text-xs">
                    {dead > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 2px,#fca5a5 2px,#fca5a5 4px)" }} />
                        Reserva SCI {dead}%
                      </span>
                    )}
                    {a1 > 0 && <span className="text-yellow-600">⚠ Alerta {a1}%</span>}
                    {a2 > 0 && <span className="text-red-600">🚨 Crítico {a2}%</span>}
                  </div>
                </>
              ) : (
                <div className="mt-4 text-center text-slate-400 text-sm">
                  <Droplet className="w-6 h-6 mx-auto mb-1 opacity-30" />
                  Aguardando sensor…
                </div>
              )}

              {tank.notes && (
                <div className="mt-3 w-full bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-900 flex gap-1.5">
                  <Info className="w-3 h-3 shrink-0 mt-0.5 text-blue-500" />
                  {tank.notes}
                </div>
              )}
            </div>

            {/* ── Col 2: Chart ─────────────────────────────────────── */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Histórico de Nível
              </p>
              <TankChart clientId={clientId} tankName={tank.tankName} alarm1={a1} alarm2={a2} dead={dead} height={260} />
            </div>

            {/* ── Col 3: Alarms ────────────────────────────────────── */}
            <div>
              {alarm && (
                <div className="mb-3">
                  <AlarmBanners alarm={alarm} compact />
                </div>
              )}
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Histórico de Alarmes
              </p>
              <AlarmLog clientId={clientId} tankName={tank.tankName} />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MOBILE LAYOUT (<md)
        ══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden">
          {/* Main row: tank visual + info */}
          <div className="flex gap-5 items-start">
            <TankVisual pct={pct} dead={dead} alarm1={a1} alarm2={a2} />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 leading-tight">{tank.tankName}</h3>
                {status && (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${status.bg} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                )}
              </div>

              {pct != null ? (
                <div className="mt-1 flex items-end gap-2">
                  <span className={`text-4xl font-extrabold leading-none ${textCol}`}>{pct}%</span>
                  {tank.capacity && (
                    <span className="text-sm text-slate-500 mb-0.5">{fmt(Math.round((tank.capacity * pct) / 100))} L</span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400 italic">Aguardando sensor…</p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-slate-400">{fmtTime(tank.recordedAt)}</p>
                <SignalBadge recordedAt={tank.recordedAt} />
              </div>

              {pct != null && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-[11px] text-slate-500">
                  {dead > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: "repeating-linear-gradient(45deg,#ef4444,#ef4444 2px,#fca5a5 2px,#fca5a5 4px)" }} />
                      SCI {dead}%
                    </span>
                  )}
                  {a1 > 0 && <span className="text-yellow-600">⚠ {a1}%</span>}
                  {a2 > 0 && <span className="text-red-600">🚨 {a2}%</span>}
                </div>
              )}

              {tank.capacity && pct != null && (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5">
                  <span className="text-slate-400">Capacidade</span>
                  <span className="font-semibold text-slate-900 text-right">{fmt(tank.capacity)} L</span>
                  <span className="text-slate-400">Volume atual</span>
                  <span className={`font-semibold text-right ${textCol}`}>{fmt(Math.round((tank.capacity * pct) / 100))} L</span>
                  {dead > 0 && (
                    <>
                      <span className="text-slate-400">Reserva SCI</span>
                      <span className="font-semibold text-red-600 text-right">{fmt(Math.round((tank.capacity * dead) / 100))} L</span>
                      <span className="text-slate-400">Utilizável</span>
                      <span className={`font-semibold text-right ${pct > dead ? "text-slate-900" : "text-red-600"}`}>
                        {fmt(Math.max(0, Math.round((tank.capacity * (pct - dead)) / 100)))} L
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {tank.notes && (
            <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" />
              {tank.notes}
            </div>
          )}

          {!showChart && sparkData && <Sparkline data={sparkData} alarm1={a1} alarm2={a2} dead={dead} />}

          <button
            onClick={() => setShowChart((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            {showChart ? "Fechar histórico" : "Ver histórico completo"}
          </button>

          {showChart && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <TankChart clientId={clientId} tankName={tank.tankName} alarm1={a1} alarm2={a2} dead={dead} />
            </div>
          )}

          {alarm && (
            <div className="mt-4">
              <AlarmBanners alarm={alarm} />
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WaterTankMonitoring() {
  const [clientId, setClientId]         = useState<number | null>(null);
  const [clientName, setClientName]     = useState("");
  const [sseConnected, setSseConnected] = useState(false);
  const [tanks, setTanks]               = useState<WaterTank[]>([]);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    const id    = localStorage.getItem("clientId");
    const name  = localStorage.getItem("clientName");
    if (!token || !id) { window.location.href = "/client/login"; return; }
    setClientId(parseInt(id));
    setClientName(name || "Cliente");
  }, []);

  const { data: initialTanks = [], isLoading } = trpc.waterTankMonitoring.getLatest.useQuery(
    undefined,
    { enabled: !!clientId },
  );

  const { data: histories = {} } = trpc.waterTankMonitoring.getAllHistory.useQuery(
    undefined,
    { enabled: !!clientId, staleTime: 60_000 },
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
    fetch("/api/client-logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientId");
    localStorage.removeItem("clientName");
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Droplet className="w-6 h-6 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">Caixas d'Água</h1>
            <p className="text-xs text-slate-500 truncate">{clientName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sseConnected
              ? <span className="hidden sm:flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3.5 h-3.5" /> Ao vivo</span>
              : <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400"><WifiOff className="w-3.5 h-3.5" /> Reconectando…</span>
            }
            <Button onClick={() => window.location.href = "/client/portal"} variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Voltar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {tanks.length > 0 && <SummaryStrip tanks={tanks} sseConnected={sseConnected} />}

        {tanks.length > 0 ? (
          /* Desktop: full-width (1 col) · Mobile: 2 col when possible */
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            {tanks.map((tank) => (
              <TankCard
                key={tank.tankName}
                tank={tank}
                clientId={clientId!}
                sparkData={(histories as Record<string, Array<{ level: number; time: string }>>)[tank.tankName]}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
              <Droplet className="w-10 h-10 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700">Aguardando sensores</h3>
              <p className="text-slate-500 text-sm mt-1">Os níveis aparecem aqui automaticamente quando os sensores enviarem dados.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
