import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Phone,
  Wrench,
  FileText,
  PlayCircle,
  CheckCircle2,
  PauseCircle,
  PenLine,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";

const TYPE_LABEL: Record<string, string> = {
  rotina: "Rotina",
  emergencial: "Emergencial",
  instalacao: "Instalação",
  manutencao: "Manutenção",
  corretiva: "Corretiva",
  preventiva: "Preventiva",
};

export default function TechnicianWorkOrderDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/technician/work-orders/:id");
  const workOrderId = match ? parseInt(params!.id) : null;

  const [technicianId, setTechnicianId] = useState<number | null>(null);

  // Diálogo: Pausar
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseNotes, setPauseNotes] = useState("");

  // Diálogo: Concluir
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [concludeNotes, setConcludeNotes] = useState("");

  // Diálogo: Assinar
  const [signOpen, setSignOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("technicianId");
    if (!id) {
      window.location.href = "/technician/login";
      return;
    }
    setTechnicianId(parseInt(id));
  }, []);

  const { data: os, isLoading, refetch } = (trpc as any).technicianPortal.getWorkOrderById.useQuery(
    { id: workOrderId! },
    { enabled: !!workOrderId && !!technicianId }
  );

  const updateStatusMutation = (trpc as any).technicianPortal.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      setPauseOpen(false);
      setConcludeOpen(false);
      setPauseNotes("");
      setConcludeNotes("");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveSignatureMutation = (trpc as any).technicianPortal.saveSignature.useMutation({
    onSuccess: () => {
      toast.success("Assinatura salva!");
      setSignOpen(false);
      setPendingSignature(null);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleIniciar() {
    if (!workOrderId) return;
    updateStatusMutation.mutate({ workOrderId, newStatus: "em_andamento" });
  }

  function handleResumir() {
    if (!workOrderId) return;
    updateStatusMutation.mutate({ workOrderId, newStatus: "em_andamento", notes: "Atendimento retomado" });
  }

  function handlePausar() {
    if (!workOrderId) return;
    updateStatusMutation.mutate({ workOrderId, newStatus: "pausada", notes: pauseNotes || undefined });
  }

  function handleSaveSignature() {
    if (!workOrderId || !pendingSignature) return;
    saveSignatureMutation.mutate({ workOrderId, signature: pendingSignature });
  }

  function handleConcluir() {
    if (!workOrderId) return;
    if (!os?.technicianSignature) {
      toast.error("É necessário assinar a OS antes de finalizar.");
      setConcludeOpen(false);
      setSignOpen(true);
      return;
    }
    updateStatusMutation.mutate({ workOrderId, newStatus: "concluida", notes: concludeNotes || undefined });
  }

  const canInteract = os?.status === "em_andamento" || os?.status === "pausada";
  const isActive    = os?.status === "em_andamento";
  const isPaused    = os?.status === "pausada";

  if (!match || !workOrderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">OS não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/technician/portal")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Ordem de Serviço</p>
            <p className="font-semibold text-sm">{os?.osNumber ?? "Carregando..."}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !os ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>OS não encontrada ou você não tem permissão de acesso.</p>
            <Button variant="link" onClick={() => setLocation("/technician/portal")}>
              Voltar ao portal
            </Button>
          </div>
        ) : (
          <>
            {/* Status e Prioridade */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={os.status} />
                <PriorityBadge priority={os.priority} />
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5 font-medium">
                  {TYPE_LABEL[os.type] ?? os.type}
                </span>
              </div>
              <h1 className="text-lg font-bold">{os.title}</h1>
              {os.description && (
                <p className="text-sm text-muted-foreground">{os.description}</p>
              )}
            </div>

            {/* Aviso de bloqueio — aguardando início */}
            {!canInteract && os.status !== "concluida" && os.status !== "cancelada" && (
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  O preenchimento de tarefas, materiais e anexos só é liberado após o início do atendimento.
                </p>
              </div>
            )}

            {/* Assinatura — indicador */}
            {canInteract && (
              <div className={`flex items-center justify-between rounded-lg border p-3 ${os.technicianSignature ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <PenLine className={`w-4 h-4 ${os.technicianSignature ? "text-green-600" : "text-slate-400"}`} />
                  <span className="text-sm font-medium">
                    {os.technicianSignature ? "Assinatura registrada" : "Sem assinatura"}
                  </span>
                  {os.technicianSignedAt && (
                    <span className="text-xs text-muted-foreground">
                      · {format(new Date(os.technicianSignedAt), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setSignOpen(true)}>
                  {os.technicianSignature ? "Reassinar" : "Assinar"}
                </Button>
              </div>
            )}

            {/* Informações do Cliente */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cliente</h2>
              {os.clientName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{os.clientName}</span>
                </div>
              )}
              {os.clientPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${os.clientPhone}`} className="text-blue-600 hover:underline">{os.clientPhone}</a>
                </div>
              )}
              {os.clientAddress && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{os.clientAddress}</span>
                </div>
              )}
            </div>

            {/* Datas */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Datas</h2>
              {os.scheduledDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Agendado: {format(new Date(os.scheduledDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {os.startedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <PlayCircle className="w-4 h-4 text-blue-500" />
                  <span>Iniciado: {format(new Date(os.startedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {os.pausedAt && isPaused && (
                <div className="flex items-center gap-2 text-sm">
                  <PauseCircle className="w-4 h-4 text-amber-500" />
                  <span>Pausado: {format(new Date(os.pausedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {os.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Concluído: {format(new Date(os.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Tipo de Serviço */}
            {os.serviceType && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipo de Serviço</h2>
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <span>{os.serviceType}</span>
                </div>
              </div>
            )}

            {/* Instruções internas */}
            {os.internalNotes && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  Instruções do Responsável
                </h2>
                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{os.internalNotes}</p>
              </div>
            )}

            {/* Ações de Status */}
            <div className="space-y-2">
              {/* Iniciar */}
              {(os.status === "aberta" || os.status === "aprovada") && (
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleIniciar}
                  disabled={updateStatusMutation.isPending}
                >
                  <PlayCircle className="w-5 h-5" />
                  Iniciar Atendimento
                </Button>
              )}

              {/* Pausar + Concluir (em andamento) */}
              {isActive && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-50"
                    onClick={() => setPauseOpen(true)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <PauseCircle className="w-5 h-5" />
                    Pausar
                  </Button>
                  <Button
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setConcludeOpen(true)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Concluir
                  </Button>
                </div>
              )}

              {/* Retomar (pausada) */}
              {isPaused && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleResumir}
                    disabled={updateStatusMutation.isPending}
                  >
                    <PlayCircle className="w-5 h-5" />
                    Retomar
                  </Button>
                  <Button
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setConcludeOpen(true)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Concluir
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal: Pausar */}
      <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pausar Atendimento</DialogTitle>
            <DialogDescription>Você pode adicionar um motivo ou observação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pause-notes">Observações (opcional)</Label>
            <Textarea
              id="pause-notes"
              value={pauseNotes}
              onChange={(e) => setPauseNotes(e.target.value)}
              placeholder="Motivo da pausa..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseOpen(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handlePausar}
              disabled={updateStatusMutation.isPending}
            >
              <PauseCircle className="w-4 h-4 mr-2" />
              Confirmar Pausa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Assinar */}
      <Dialog open={signOpen} onOpenChange={(v) => { setSignOpen(v); if (!v) setPendingSignature(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinar OS</DialogTitle>
            <DialogDescription>Sua assinatura ficará registrada antes da finalização.</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-1 bg-white shadow-sm">
            <SignaturePad onSave={setPendingSignature} height={300} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSignOpen(false); setPendingSignature(null); }}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveSignature}
              disabled={!pendingSignature || saveSignatureMutation.isPending}
            >
              <PenLine className="w-4 h-4 mr-2" />
              Salvar Assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Concluir */}
      <Dialog open={concludeOpen} onOpenChange={setConcludeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Concluir OS?</DialogTitle>
            <DialogDescription>
              {os?.technicianSignature
                ? "Confirme a conclusão do atendimento."
                : "Você ainda não assinou esta OS. A assinatura é obrigatória para finalizar."}
            </DialogDescription>
          </DialogHeader>

          {!os?.technicianSignature && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800">Assine a OS antes de finalizar.</p>
            </div>
          )}

          {os?.technicianSignature && (
            <div className="space-y-2">
              <Label htmlFor="conclude-notes">Observações (opcional)</Label>
              <Textarea
                id="conclude-notes"
                value={concludeNotes}
                onChange={(e) => setConcludeNotes(e.target.value)}
                placeholder="Descreva o que foi realizado..."
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludeOpen(false)}>Cancelar</Button>
            {!os?.technicianSignature ? (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setConcludeOpen(false); setSignOpen(true); }}
              >
                <PenLine className="w-4 h-4 mr-2" />
                Ir para Assinatura
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConcluir}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Conclusão
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
