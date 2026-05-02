import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Users,
  Search,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type TargetType = "all" | "com_portal" | "sem_portal" | "selected";

interface BroadcastResult {
  id: number;
  name: string;
  phone: string;
  status: "sent" | "failed" | "skipped";
  reason?: string;
}

// Variáveis disponíveis para personalização da mensagem
const MERGE_TAGS = [
  { tag: "{{nome}}",     label: "Nome",       desc: "Nome completo do cliente" },
  { tag: "{{usuario}}", label: "Usuário",     desc: "Nome de usuário do portal" },
  { tag: "{{telefone}}",label: "Telefone",    desc: "Telefone do cliente" },
  { tag: "{{email}}",   label: "E-mail",      desc: "E-mail do cliente" },
  { tag: "{{endereco}}",label: "Endereço",    desc: "Endereço do cliente" },
  { tag: "{{sindico}}", label: "Síndico",     desc: "Nome do síndico responsável" },
  { tag: "{{cnpj}}",    label: "CNPJ/CPF",   desc: "Documento do cliente" },
];

// Substitui as variáveis na mensagem com os dados reais de um cliente
function replaceVars(msg: string, client: {
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  address?: string;
  syndicName?: string;
  cnpjCpf?: string;
}): string {
  return msg
    .replace(/\{\{nome\}\}/g,     client.name      || "—")
    .replace(/\{\{usuario\}\}/g,  client.username  || "—")
    .replace(/\{\{telefone\}\}/g, client.phone     || "—")
    .replace(/\{\{email\}\}/g,    client.email     || "—")
    .replace(/\{\{endereco\}\}/g, client.address   || "—")
    .replace(/\{\{sindico\}\}/g,  client.syndicName|| "—")
    .replace(/\{\{cnpj\}\}/g,     client.cnpjCpf   || "—");
}

export default function AdminMassMessage() {
  const [adminId, setAdminId] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [clientSearch, setClientSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    results: BroadcastResult[];
  } | null>(null);

  // Ref para controlar posição do cursor no textarea
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("adminId");
    if (id) setAdminId(parseInt(id));
  }, []);

  const { data: clients = [], isLoading: loadingClients } = trpc.clients.list.useQuery(undefined);

  const broadcast = trpc.clients.broadcastMessage.useMutation({
    onSuccess: (data) => {
      setResults(data);
      setConfirmOpen(false);
    },
  });

  const filteredForPicker = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
    );
  }, [clients, clientSearch]);

  const previewTargets = useMemo(() => {
    if (targetType === "all") return clients;
    if (targetType === "com_portal") return clients.filter((c) => c.type === "com_portal");
    if (targetType === "sem_portal") return clients.filter((c) => c.type === "sem_portal");
    return clients.filter((c) => selectedIds.has(c.id));
  }, [clients, targetType, selectedIds]);

  const withPhone = previewTargets.filter((c) => c.phone);
  const withoutPhone = previewTargets.filter((c) => !c.phone);

  // Preview da mensagem com dados do primeiro destinatário
  const previewMessage = useMemo(() => {
    const first = withPhone[0];
    if (!first || !message.trim()) return message;
    return replaceVars(message, first as any);
  }, [message, withPhone]);

  const toggleClient = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredForPicker.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredForPicker.map((c) => c.id)));
    }
  };

  // Insere a tag na posição atual do cursor no textarea
  const insertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage((prev) => prev + tag);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newMsg = message.slice(0, start) + tag + message.slice(end);
    setMessage(newMsg);
    // Reposiciona o cursor após a tag inserida
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const canSend =
    message.trim().length > 0 &&
    previewTargets.length > 0 &&
    (targetType !== "selected" || selectedIds.size > 0);

  const handleSend = () => {
    if (!adminId || !canSend) return;
    broadcast.mutate({
      message: message.trim(),
      targetType,
      clientIds: targetType === "selected" ? Array.from(selectedIds) : undefined,
    });
  };

  const targetLabel: Record<TargetType, string> = {
    all: "Todos os clientes",
    com_portal: "Clientes com portal",
    sem_portal: "Clientes sem portal",
    selected: "Clientes selecionados",
  };

  return (
    <DashboardLayout>
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-orange-500" />
          Mensagens em Massa
        </h1>
        <p className="text-slate-600 mt-1">
          Envie mensagens via WhatsApp para grupos de clientes ou clientes específicos
        </p>
      </div>

      {/* Resultados do envio */}
      {results && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Envio Concluído
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">{results.sent}</span>
                <span className="text-green-700">enviados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="font-semibold text-red-700">{results.failed}</span>
                <span className="text-red-600">falhas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MinusCircle className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-600">{results.skipped}</span>
                <span className="text-slate-500">ignorados (sem telefone)</span>
              </div>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto border rounded bg-white p-2">
              {results.results.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {r.status === "sent" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                    {r.status === "failed" && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    {r.status === "skipped" && <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    <span className="font-medium">{r.name}</span>
                    {r.phone && <span className="text-slate-400 text-xs">{r.phone}</span>}
                  </div>
                  {r.reason && <span className="text-xs text-red-500">{r.reason}</span>}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResults(null); setMessage(""); setSelectedIds(new Set()); }}
            >
              Novo Envio
            </Button>
          </CardContent>
        </Card>
      )}

      {!results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna esquerda: destinatários */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Destinatários</CardTitle>
                <CardDescription>Escolha quem vai receber a mensagem</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    <SelectItem value="com_portal">Apenas clientes com portal</SelectItem>
                    <SelectItem value="sem_portal">Apenas clientes sem portal</SelectItem>
                    <SelectItem value="selected">Selecionar clientes específicos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Seletor manual */}
                {targetType === "selected" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        className="pl-9 h-8 text-sm"
                        placeholder="Buscar cliente..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>{selectedIds.size} selecionado(s)</span>
                      <button className="text-orange-500 hover:underline" onClick={toggleAll}>
                        {selectedIds.size === filteredForPicker.length ? "Desmarcar todos" : "Selecionar todos"}
                      </button>
                    </div>
                    <div className="border rounded max-h-52 overflow-y-auto divide-y">
                      {loadingClients ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                        </div>
                      ) : filteredForPicker.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400">Nenhum cliente encontrado</div>
                      ) : (
                        filteredForPicker.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                          >
                            <Checkbox
                              checked={selectedIds.has(c.id)}
                              onCheckedChange={() => toggleClient(c.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              <p className="text-xs text-slate-400">{c.phone || "Sem telefone"}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${
                                c.type === "com_portal"
                                  ? "border-green-300 text-green-700"
                                  : "border-slate-300 text-slate-500"
                              }`}
                            >
                              {c.type === "com_portal" ? "Portal" : "Sem portal"}
                            </Badge>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo dos destinatários */}
            <Card className="bg-slate-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium text-slate-800">
                      {previewTargets.length} {previewTargets.length === 1 ? "destinatário" : "destinatários"}
                    </p>
                    <p className="text-slate-500">
                      {withPhone.length} com telefone · {withoutPhone.length} sem telefone (serão ignorados)
                    </p>
                    {previewTargets.length > 0 && (
                      <p className="text-xs text-slate-400 pt-1">{targetLabel[targetType]}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita: mensagem */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Mensagem</CardTitle>
                <CardDescription>
                  Será enviada via WhatsApp. Use variáveis abaixo para personalizar por cliente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Chips de variáveis personalizadas */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Inserir variável (clique para adicionar ao texto)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_TAGS.map(({ tag, label, desc }) => (
                      <button
                        key={tag}
                        type="button"
                        title={desc}
                        onClick={() => insertTag(tag)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Legenda das variáveis */}
                  <div className="rounded border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                    {MERGE_TAGS.map(({ tag, desc }) => (
                      <div key={tag} className="flex items-baseline gap-2 px-2 py-1">
                        <span className="font-mono text-[11px] text-orange-600 shrink-0 w-28">{tag}</span>
                        <span className="text-[11px] text-slate-500">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Textarea
                  ref={textareaRef}
                  placeholder={"Ex: Olá {{nome}}, temos uma novidade para você!"}
                  className="min-h-48 resize-none font-mono text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={4096}
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{message.length}/4096 caracteres</span>
                  {withPhone.length > 0 && message.includes("{{") && (
                    <span className="text-orange-500">Prévia com dados do 1º destinatário no envio</span>
                  )}
                </div>

                {/* Prévia da mensagem personalizada */}
                {withPhone.length > 0 && message.trim() && previewMessage !== message && (
                  <div className="border rounded p-3 bg-slate-50 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      Prévia — {withPhone[0]?.name}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{previewMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!canSend && message.trim() && previewTargets.length === 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Nenhum destinatário selecionado para o tipo escolhido.
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
              disabled={!canSend || broadcast.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {broadcast.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar para {withPhone.length} {withPhone.length === 1 ? "cliente" : "clientes"}
                </>
              )}
            </Button>

            {broadcast.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {broadcast.error?.message || "Erro ao enviar mensagens"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Confirmação */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-orange-500" />
              Confirmar Envio em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Você está prestes a enviar uma mensagem via WhatsApp para{" "}
                <strong>{withPhone.length} {withPhone.length === 1 ? "cliente" : "clientes"}</strong>{" "}
                ({targetLabel[targetType]}).
              </span>
              {withoutPhone.length > 0 && (
                <span className="block text-amber-600">
                  {withoutPhone.length} cliente(s) sem telefone serão ignorados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Prévia da mensagem no modal de confirmação */}
          <div className="space-y-1">
            {withPhone[0] && previewMessage !== message && (
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                Exemplo com dados de {withPhone[0].name}
              </p>
            )}
            <div className="bg-slate-50 border rounded p-3 text-sm text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
              {previewMessage || message}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={broadcast.isPending}
            >
              {broadcast.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar Envio"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </DashboardLayout>
  );
}
