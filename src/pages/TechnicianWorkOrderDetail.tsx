import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  MessageSquare,
  Paperclip,
  Send,
  ListChecks,
  ClipboardList,
  ImageIcon,
  Download,
  Globe,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import SignaturePad from "@/components/SignaturePad";
import ChecklistForm from "@/components/ChecklistForm";

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

  // Diálogo: Assinar (técnico)
  const [signOpen, setSignOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  // Diálogo: Assinar (cliente)
  const [clientSignOpen, setClientSignOpen] = useState(false);
  const [pendingClientSignature, setPendingClientSignature] = useState<string | null>(null);

  // Comentários
  const [newComment, setNewComment] = useState("");

  // Anexos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Checklists
  const [savingChecklistId, setSavingChecklistId] = useState<number | null>(null);

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

  const canInteract = os?.status === "em_andamento" || os?.status === "pausada";

  // Tasks
  const { data: tasks, refetch: refetchTasks } = (trpc as any).technicianPortal.tasks.list.useQuery(
    { workOrderId: workOrderId! },
    { enabled: !!workOrderId && !!technicianId && canInteract }
  );

  // Comments
  const { data: comments, refetch: refetchComments } = (trpc as any).technicianPortal.comments.list.useQuery(
    { workOrderId: workOrderId! },
    { enabled: !!workOrderId && !!technicianId && canInteract }
  );

  // Attachments
  const { data: attachments, refetch: refetchAttachments } = (trpc as any).technicianPortal.attachments.list.useQuery(
    { workOrderId: workOrderId! },
    { enabled: !!workOrderId && !!technicianId && canInteract }
  );

  // Checklists
  const { data: checklists = [], refetch: refetchChecklists } = (trpc as any).technicianPortal.checklists.listByWorkOrder.useQuery(
    { workOrderId: workOrderId! },
    { enabled: !!workOrderId && !!technicianId && canInteract }
  );

  const { data: checklistTemplates = [] } = (trpc as any).technicianPortal.checklists.listTemplates.useQuery(
    undefined,
    { enabled: canInteract }
  );

  const updateResponsesMutation = (trpc as any).technicianPortal.checklists.updateResponses.useMutation({
    onSuccess: () => {
      toast.success("Respostas salvas!");
      setSavingChecklistId(null);
      refetchChecklists();
    },
    onError: (e: any) => {
      toast.error(e.message);
      setSavingChecklistId(null);
    },
  });

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

  const saveClientSignatureMutation = (trpc as any).technicianPortal.saveClientSignature.useMutation({
    onSuccess: () => {
      toast.success("Assinatura do cliente salva!");
      setClientSignOpen(false);
      setPendingClientSignature(null);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendPdfToClientMutation = (trpc as any).technicianPortal.sendPdfToClient.useMutation({
    onSuccess: () => toast.success("PDF enviado ao cliente via WhatsApp!"),
    onError:   (e: any) => toast.error(e.message),
  });

  const sendPdfToAdminMutation = (trpc as any).technicianPortal.sendPdfToAdmin.useMutation({
    onSuccess: () => toast.success("PDF enviado ao gestor via WhatsApp!"),
    onError:   (e: any) => toast.error(e.message),
  });

  const exportPDFMutation = (trpc as any).technicianPortal.exportPDF.useMutation({
    onSuccess: (data: any) => {
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = data.filename;
      link.click();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const shareToPortalMutation = (trpc as any).technicianPortal.shareToClientPortal.useMutation({
    onSuccess: () => toast.success("OS enviada ao portal do cliente!"),
    onError:   (e: any) => toast.error(e.message),
  });

  const toggleTaskMutation = (trpc as any).technicianPortal.tasks.toggle.useMutation({
    onSuccess: () => refetchTasks(),
    onError: (e: any) => toast.error(e.message),
  });

  const createCommentMutation = (trpc as any).technicianPortal.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      refetchComments();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createAttachmentMutation = (trpc as any).technicianPortal.attachments.create.useMutation({
    onSuccess: () => refetchAttachments(),
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

  function handleSaveClientSignature() {
    if (!workOrderId || !pendingClientSignature) return;
    saveClientSignatureMutation.mutate({ workOrderId, clientSignature: pendingClientSignature });
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

  function handleToggleTask(taskId: number, currentCompleted: number) {
    if (!workOrderId) return;
    const newVal = currentCompleted === 1 ? false : true;
    toggleTaskMutation.mutate({ workOrderId, taskId, isCompleted: newVal });
  }

  function handleSendComment() {
    if (!workOrderId || !newComment.trim()) return;
    createCommentMutation.mutate({ workOrderId, comment: newComment.trim() });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !workOrderId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const res = await fetch("/api/work-orders/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Erro no upload");

      for (const uploaded of data.urls) {
        await createAttachmentMutation.mutateAsync({
          workOrderId,
          fileName: uploaded.fileName,
          fileKey:  uploaded.key,
          fileUrl:  uploaded.url,
          fileType: uploaded.fileType,
          fileSize: uploaded.fileSize,
          category: "during",
        });
      }

      toast.success(`${data.urls.length} arquivo(s) enviado(s)!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isActive  = os?.status === "em_andamento";
  const isPaused  = os?.status === "pausada";

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
            {/* Assinatura do técnico */}
            {canInteract && (
              <div className={`flex items-center justify-between rounded-lg border p-3 ${os.technicianSignature ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <PenLine className={`w-4 h-4 ${os.technicianSignature ? "text-green-600" : "text-slate-400"}`} />
                  <span className="text-sm font-medium">
                    {os.technicianSignature ? "Sua assinatura registrada" : "Sem assinatura (técnico)"}
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

            {/* Assinatura do cliente */}
            {canInteract && (
              <div className={`flex items-center justify-between rounded-lg border p-3 ${os.clientSignature ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <PenLine className={`w-4 h-4 ${os.clientSignature ? "text-blue-600" : "text-slate-400"}`} />
                  <span className="text-sm font-medium">
                    {os.clientSignature ? "Assinatura do cliente registrada" : "Sem assinatura (cliente)"}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setClientSignOpen(true)}>
                  {os.clientSignature ? "Reassinar" : "Coletar assinatura"}
                </Button>
              </div>
            )}

            {/* ==================== CHECKLIST DE TAREFAS ==================== */}
            {canInteract && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Tarefas
                </h2>

                {!tasks || tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada para esta OS.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 py-1.5"
                      >
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={task.isCompleted === 1}
                          onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                          disabled={toggleTaskMutation.isPending}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`task-${task.id}`}
                          className={`text-sm cursor-pointer select-none leading-snug ${
                            task.isCompleted === 1
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {task.title}
                          {task.description && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {task.description}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== CHECKLISTS ==================== */}
            {canInteract && checklists.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Checklists
                </h2>

                <div className="space-y-4">
                  {checklists.map((checklist: any) => {
                    const template = checklistTemplates.find((t: any) => t.id === checklist.templateId) ?? null;
                    let formStructure = null;
                    if (template?.formStructure) {
                      try {
                        const parsed = JSON.parse(template.formStructure);
                        formStructure = parsed.fields && !parsed.sections
                          ? { sections: [{ id: "default", title: "Informações", fields: parsed.fields }] }
                          : parsed;
                      } catch { /* ignore */ }
                    }
                    const responses = checklist.responses ? JSON.parse(checklist.responses) : {};
                    const isSaving = savingChecklistId === checklist.id && updateResponsesMutation.isPending;

                    return (
                      <div key={checklist.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{checklist.customTitle}</p>
                            {(checklist.brand || checklist.power) && (
                              <p className="text-xs text-muted-foreground">
                                {[checklist.brand, checklist.power].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${checklist.isComplete ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                            {checklist.isComplete ? "Completo" : "Incompleto"}
                          </span>
                        </div>
                        {formStructure && (
                          <ChecklistForm
                            formStructure={formStructure}
                            initialResponses={responses}
                            onSave={(newResponses, isComplete) => {
                              setSavingChecklistId(checklist.id);
                              updateResponsesMutation.mutate({ checklistId: checklist.id, workOrderId: workOrderId!, responses: newResponses, isComplete });
                            }}
                            isSaving={isSaving}
                            readOnly={!!checklist.isComplete}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== COMENTÁRIOS / OBSERVAÇÕES ==================== */}
            {canInteract && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Observações
                </h2>

                {comments && comments.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((c: any) => (
                      <div key={c.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {c.userId?.startsWith("tecnico-") ? "Técnico" : c.userId}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {format(new Date(c.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar observação..."
                    rows={2}
                    className="flex-1 resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="self-end bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ==================== FOTOS E ANEXOS ==================== */}
            {canInteract && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Fotos e Anexos
                </h2>

                {attachments && attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {attachments.map((a: any) => (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 aspect-square"
                      >
                        {a.fileType?.startsWith("image/") ? (
                          <img
                            src={a.fileUrl}
                            alt={a.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground text-center truncate w-full">
                              {a.fileName}
                            </span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  {uploading ? "Enviando..." : "Adicionar Foto / Arquivo"}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
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
            <div className="space-y-2 pb-6">
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

              {/* Ações pós-conclusão */}
              {os.status === "concluida" && (
                <div className="space-y-2 pt-2 border-t">
                  {/* Download e Portal */}
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Documento</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => exportPDFMutation.mutate({ workOrderId: workOrderId! })}
                      disabled={exportPDFMutation.isPending}
                    >
                      {exportPDFMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Baixar PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-50"
                      onClick={() => shareToPortalMutation.mutate({ workOrderId: workOrderId! })}
                      disabled={shareToPortalMutation.isPending}
                    >
                      {shareToPortalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                      Enviar ao Portal
                    </Button>
                  </div>

                  {/* WhatsApp */}
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-1">Enviar PDF via WhatsApp</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => sendPdfToClientMutation.mutate({ workOrderId: workOrderId! })}
                      disabled={sendPdfToClientMutation.isPending}
                    >
                      {sendPdfToClientMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Para Cliente
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-slate-400 text-slate-700 hover:bg-slate-50"
                      onClick={() => sendPdfToAdminMutation.mutate({ workOrderId: workOrderId! })}
                      disabled={sendPdfToAdminMutation.isPending}
                    >
                      {sendPdfToAdminMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Para Gestor
                    </Button>
                  </div>
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
          <SignaturePad onSave={setPendingSignature} />
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

      {/* Modal: Assinar (cliente) */}
      <Dialog open={clientSignOpen} onOpenChange={(v) => { setClientSignOpen(v); if (!v) setPendingClientSignature(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinatura do Cliente</DialogTitle>
            <DialogDescription>O cliente assina aqui confirmando o serviço realizado.</DialogDescription>
          </DialogHeader>
          <SignaturePad onSave={setPendingClientSignature} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClientSignOpen(false); setPendingClientSignature(null); }}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveClientSignature}
              disabled={!pendingClientSignature || saveClientSignatureMutation.isPending}
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
