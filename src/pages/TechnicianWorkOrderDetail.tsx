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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [concludeNotes, setConcludeNotes] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("technicianId");
    if (!id) {
      window.location.href = "/technician/login";
      return;
    }
    setTechnicianId(parseInt(id));
  }, []);

  const { data: os, isLoading, refetch } = (trpc as any).technicianPortal.getWorkOrderById.useQuery(
    { id: workOrderId!, technicianId: technicianId! },
    { enabled: !!workOrderId && !!technicianId }
  );

  const updateStatusMutation = (trpc as any).technicianPortal.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      setConfirmOpen(false);
      setConcludeNotes("");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleIniciar() {
    if (!workOrderId || !technicianId) return;
    updateStatusMutation.mutate({
      workOrderId,
      technicianId,
      newStatus: "em_andamento",
    });
  }

  function handleConcluir() {
    if (!workOrderId || !technicianId) return;
    updateStatusMutation.mutate({
      workOrderId,
      technicianId,
      newStatus: "concluida",
      notes: concludeNotes || undefined,
    });
  }

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

            {/* Informações do Cliente */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Cliente
              </h2>
              {os.clientName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{os.clientName}</span>
                </div>
              )}
              {os.clientPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${os.clientPhone}`} className="text-blue-600 hover:underline">
                    {os.clientPhone}
                  </a>
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
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Datas
              </h2>
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
              {os.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Concluído: {format(new Date(os.completedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Serviço */}
            {os.serviceType && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Tipo de Serviço
                </h2>
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
                <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  {os.internalNotes}
                </p>
              </div>
            )}

            {/* Ações de Status */}
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

            {os.status === "em_andamento" && (
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setConfirmOpen(true)}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar como Concluída
              </Button>
            )}
          </>
        )}
      </main>

      {/* Confirm Concluir */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Concluir OS?</DialogTitle>
            <DialogDescription>
              Confirme a conclusão do atendimento. Você pode adicionar uma observação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={concludeNotes}
              onChange={(e) => setConcludeNotes(e.target.value)}
              placeholder="Descreva o que foi realizado..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConcluir}
              disabled={updateStatusMutation.isPending}
            >
              Confirmar Conclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
