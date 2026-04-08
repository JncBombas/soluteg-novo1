import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Droplet, Loader2, Copy, Check, Pencil, Trash2, AlertTriangle, Wifi, Flame } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SensorRow {
  id: number;
  clientId: number;
  clientName: string;
  tankName: string;
  capacity: number | null;
  notes: string | null;
  deadVolumePct: number;
  alarm1Pct: number;
  alarm2Pct: number;
  alertPhone: string | null;
  active: number;
  createdAt: Date;
  currentLevel: number | null;
  lastUpdate: Date | null;
  status: string | null;
}

type SensorForm = {
  clientId: string;
  tankName: string;
  capacity: string;
  notes: string;
  deadVolumePct: string;
  alarm1Pct: string;
  alarm2Pct: string;
  alertPhone: string;
};

const defaultForm: SensorForm = {
  clientId: "", tankName: "", capacity: "", notes: "",
  deadVolumePct: "0", alarm1Pct: "30", alarm2Pct: "15", alertPhone: "",
};

function getLevelBg(pct: number, a2: number, a1: number, dead: number) {
  if (dead > 0 && pct < dead) return "bg-red-600";
  if (a2 > 0 && pct < a2) return "bg-red-500";
  if (a1 > 0 && pct < a1) return "bg-yellow-500";
  if (pct >= 75) return "bg-green-500";
  if (pct >= 50) return "bg-blue-500";
  return "bg-blue-400";
}

function getLevelText(pct: number, a2: number, a1: number, dead: number) {
  if (dead > 0 && pct < dead) return "text-red-700";
  if (a2 > 0 && pct < a2) return "text-red-600";
  if (a1 > 0 && pct < a1) return "text-yellow-600";
  if (pct >= 75) return "text-green-600";
  if (pct >= 50) return "text-blue-600";
  return "text-blue-500";
}

function MqttTopicCell({ clientId, tankName }: { clientId: number; tankName: string }) {
  const [copied, setCopied] = useState(false);
  const topic = `soluteg/clients/${clientId}/tanks/${tankName}/level`;
  const copy = () => {
    navigator.clipboard.writeText(topic).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono truncate max-w-[240px]" title={topic}>{topic}</code>
      <button onClick={copy} className="shrink-0 text-slate-400 hover:text-slate-700" title="Copiar">
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function SensorFormFields({ form, setForm }: { form: SensorForm; setForm: (f: SensorForm) => void }) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome da caixa *</label>
        <Input placeholder="ex: Torre A, Reservatório Superior" value={form.tankName}
          onChange={(e) => setForm({ ...form, tankName: e.target.value })} required />
        <p className="text-xs text-slate-500">Usado no tópico MQTT — não altere depois de instalar o sensor.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Capacidade (L)</label>
          <Input type="number" min={1} placeholder="ex: 1000" value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tel. de alerta</label>
          <Input type="tel" placeholder="(13) 99999-9999" value={form.alertPhone}
            onChange={(e) => setForm({ ...form, alertPhone: e.target.value })} />
          <p className="text-xs text-slate-500">WhatsApp adicional para alertas.</p>
        </div>
      </div>

      {/* SCI */}
      <div className="border rounded-lg p-3 space-y-3 bg-red-50 border-red-200">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-red-600" />
          <p className="text-sm font-semibold text-red-900">Sistema de Combate a Incêndio (SCI)</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-red-900">Volume morto SCI (%)</label>
          <Input type="number" min={0} max={99} placeholder="0" value={form.deadVolumePct}
            onChange={(e) => setForm({ ...form, deadVolumePct: e.target.value })} />
          <p className="text-xs text-red-700">
            Reserva mínima que não pode ser consumida. Ex: 20 = os últimos 20% ficam reservados para combate a incêndio.
            Ao atingir esse nível, dispara alerta de emergência SCI.
          </p>
        </div>
      </div>

      {/* Alarmes */}
      <div className="border rounded-lg p-3 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Limiares de Alarme</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-yellow-700">⚠️ Alerta 1 (%)</label>
            <Input type="number" min={0} max={100} placeholder="30" value={form.alarm1Pct}
              onChange={(e) => setForm({ ...form, alarm1Pct: e.target.value })} />
            <p className="text-xs text-slate-500">1° aviso — nível baixo.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-red-700">🚨 Alerta 2 (%)</label>
            <Input type="number" min={0} max={100} placeholder="15" value={form.alarm2Pct}
              onChange={(e) => setForm({ ...form, alarm2Pct: e.target.value })} />
            <p className="text-xs text-slate-500">2° aviso — nível crítico.</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">Use 0 para desabilitar. Cooldown de 4h entre mensagens por limiar.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Observações</label>
        <Textarea placeholder="Localização, instruções, etc." value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
    </>
  );
}

export default function AdminWaterTanks() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<SensorForm>(defaultForm);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SensorRow | null>(null);
  const [editForm, setEditForm] = useState<SensorForm>(defaultForm);

  const [deleteTarget, setDeleteTarget] = useState<SensorRow | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) setAdminId(parseInt(id));
  }, []);

  const { data: sensors = [], isLoading, refetch } = trpc.waterTankAdmin.listSensors.useQuery(
    { adminId: adminId ?? 0 },
    { enabled: !!adminId }
  );

  const { data: clients = [] } = trpc.clients.list.useQuery(
    { adminId: adminId ?? 0 },
    { enabled: !!adminId }
  );

  const createMutation = trpc.waterTankAdmin.createSensor.useMutation({
    onSuccess: () => { setSuccess("Sensor cadastrado!"); setForm(defaultForm); setCreateOpen(false); refetch(); },
    onError: (e) => setError(e.message),
  });

  const updateMutation = trpc.waterTankAdmin.updateSensor.useMutation({
    onSuccess: () => { setSuccess("Sensor atualizado!"); setEditOpen(false); setEditTarget(null); refetch(); },
    onError: (e) => setError(e.message),
  });

  const deleteMutation = trpc.waterTankAdmin.deleteSensor.useMutation({
    onSuccess: () => { setSuccess("Sensor removido."); setDeleteTarget(null); refetch(); },
    onError: (e) => setError(e.message),
  });

  const parseForm = (f: SensorForm) => ({
    tankName: f.tankName.trim(),
    capacity: f.capacity ? parseInt(f.capacity) : null,
    notes: f.notes || null,
    deadVolumePct: parseInt(f.deadVolumePct) || 0,
    alarm1Pct: parseInt(f.alarm1Pct) || 30,
    alarm2Pct: parseInt(f.alarm2Pct) || 15,
    alertPhone: f.alertPhone || null,
  });

  const handleCreate: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault(); setError("");
    if (!adminId || !form.clientId || !form.tankName.trim()) return;
    createMutation.mutate({ adminId, clientId: parseInt(form.clientId), ...parseForm(form) });
  };

  const openEdit = (s: SensorRow) => {
    setEditTarget(s);
    setEditForm({
      clientId: String(s.clientId), tankName: s.tankName,
      capacity: s.capacity?.toString() ?? "", notes: s.notes ?? "",
      deadVolumePct: String(s.deadVolumePct ?? 0),
      alarm1Pct: String(s.alarm1Pct ?? 30),
      alarm2Pct: String(s.alarm2Pct ?? 15),
      alertPhone: s.alertPhone ?? "",
    });
    setEditOpen(true);
  };

  const handleEdit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault(); setError("");
    if (!adminId || !editTarget) return;
    updateMutation.mutate({ adminId, sensorId: editTarget.id, ...parseForm(editForm) });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-8 h-8 text-blue-500" /> Sensores de Caixa d'Água
            </h1>
            <p className="text-slate-600 mt-1">Gerencie sensores, volumes mortos SCI e alertas automáticos</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4" /> Novo Sensor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Cadastrar Sensor</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cliente *</label>
                  <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {(clients as Array<{id: number; name: string}>).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <SensorFormFields form={form} setForm={setForm} />

                {form.clientId && form.tankName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-blue-900">Tópico MQTT para o ESP32:</p>
                    <code className="text-xs text-blue-800 break-all font-mono">
                      soluteg/clients/{form.clientId}/tanks/{form.tankName.trim()}/level
                    </code>
                    <p className="text-xs text-blue-700 mt-1">Payload: {`{"level_pct": 73}`}</p>
                  </div>
                )}

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={!form.clientId || !form.tankName.trim() || createMutation.isLoading}>
                  {createMutation.isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Cadastrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sensores Cadastrados</CardTitle>
            <CardDescription>{sensors.length} sensor{sensors.length !== 1 ? "es" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="text-center py-12">
                <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Nenhum sensor cadastrado ainda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Caixa</TableHead>
                      <TableHead>Nível atual</TableHead>
                      <TableHead>SCI / Alarmes</TableHead>
                      <TableHead>Última leitura</TableHead>
                      <TableHead>Tópico MQTT</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sensors as SensorRow[]).map((s) => {
                      const dead = s.deadVolumePct ?? 0;
                      const a1 = s.alarm1Pct ?? 30;
                      const a2 = s.alarm2Pct ?? 15;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.clientName}</TableCell>
                          <TableCell>{s.tankName}</TableCell>
                          <TableCell>
                            {s.currentLevel != null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className={`h-full ${getLevelBg(s.currentLevel, a2, a1, dead)}`}
                                    style={{ width: `${s.currentLevel}%` }} />
                                </div>
                                <span className={`text-sm font-semibold ${getLevelText(s.currentLevel, a2, a1, dead)}`}>
                                  {s.currentLevel}%
                                </span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Wifi className="w-3 h-3" /> Aguardando
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-0.5">
                              {dead > 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <Flame className="w-3 h-3" /> SCI: {dead}%
                                </div>
                              )}
                              {a1 > 0 && <div className="text-yellow-700">⚠ Alerta: {a1}%</div>}
                              {a2 > 0 && <div className="text-red-600">🚨 Crítico: {a2}%</div>}
                              {!dead && !a1 && !a2 && <span className="text-slate-400">—</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {s.lastUpdate ? new Date(s.lastUpdate).toLocaleString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            <MqttTopicCell clientId={s.clientId} tankName={s.tankName} />
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(s)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Sensor</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <SensorFormFields form={editForm} setForm={setEditForm} />
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={updateMutation.isLoading}>
              {updateMutation.isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Remover sensor
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{deleteTarget?.tankName}</strong> ({deleteTarget?.clientName})?
              O histórico de leituras é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && adminId && deleteMutation.mutate({ adminId, sensorId: deleteTarget.id })}
              disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
