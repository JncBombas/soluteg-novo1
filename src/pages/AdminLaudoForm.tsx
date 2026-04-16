import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle,
  Download,
  ArrowLeft,
  Loader2,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Constatacao {
  item: string;
  descricao: string;
  status: "conforme" | "nao_conforme" | "atencao";
  referenciaNormativa?: string;
}

interface Norma {
  codigo: string;
  titulo: string;
}

interface Medicao {
  id?: number;
  descricao: string;
  unidade: string;
  valorMedido: string;
  valorReferencia: string;
  resultado: "aprovado" | "reprovado" | "";
}

interface Foto {
  id?: number;
  url: string;
  legenda: string;
  comentario: string;
  classificacao: "conforme" | "nao_conforme" | "atencao" | "";
  ordem: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const TIPOS = [
  { value: "instalacao_eletrica", label: "Instalação Elétrica" },
  { value: "inspecao_predial", label: "Inspeção Predial" },
  { value: "nr10_nr12", label: "NR-10 / NR-12" },
  { value: "grupo_gerador", label: "Grupo Gerador" },
  { value: "adequacoes", label: "Adequações" },
];

const STATUS_CONSTATACAO = [
  { value: "conforme", label: "Conforme", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "nao_conforme", label: "Não Conforme", color: "bg-red-100 text-red-800 border-red-300" },
  { value: "atencao", label: "Requer Atenção", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
] as const;

// ── Componente principal ───────────────────────────────────────────────────

export default function AdminLaudoForm() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "novo";
  const laudoId = isNew ? null : Number(params.id);

  // ── Aba 1: Identificação
  const [tipo, setTipo] = useState("instalacao_eletrica");
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [osId, setOsId] = useState<number | null>(null);
  const [dataInspecao, setDataInspecao] = useState("");
  const [validadeMeses, setValidadeMeses] = useState(12);
  const [normas, setNormas] = useState<Norma[]>([]);
  const [normaCodigo, setNormaCodigo] = useState("");
  const [normaTitulo, setNormaTitulo] = useState("");

  // ── Aba 2: Contexto Técnico
  const [objeto, setObjeto] = useState("");
  const [metodologia, setMetodologia] = useState("");
  const [equipamentos, setEquipamentos] = useState("");
  const [condicoes, setCondicoes] = useState("");

  // ── Aba 3: Constatações
  const [constatacoes, setConstatacoes] = useState<Constatacao[]>([]);

  // ── Aba 4: Medições
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);

  // ── Aba 5: Fotos
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Aba 6: Conclusão
  const [parecer, setParecer] = useState<"conforme" | "nao_conforme" | "parcialmente_conforme" | "">("");
  const [conclusao, setConclusao] = useState("");
  const [recomendacoes, setRecomendacoes] = useState("");

  // ── Estado geral
  const [laudoStatus, setLaudoStatus] = useState("rascunho");
  const [finalizeConfirm, setFinalizeConfirm] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Dados de suporte
  const { data: clientesList = [] } = trpc.clients.list.useQuery({ adminId: 1 }, { staleTime: 60_000 });

  // ── Carregar laudo existente
  const { data: laudoData, isLoading: loadingLaudo } = trpc.laudos.getById.useQuery(
    { id: laudoId! },
    { enabled: !isNew && laudoId !== null }
  );

  useEffect(() => {
    if (!laudoData) return;
    setTipo(laudoData.tipo);
    setTitulo(laudoData.titulo);
    setClienteId(laudoData.clienteId ?? null);
    setOsId(laudoData.osId ?? null);
    setDataInspecao(
      laudoData.dataInspecao ? new Date(laudoData.dataInspecao).toISOString().split("T")[0] : ""
    );
    setValidadeMeses(laudoData.validadeMeses);
    setNormas(laudoData.normasReferencia ?? []);
    setObjeto(laudoData.objeto ?? "");
    setMetodologia(laudoData.metodologia ?? "");
    setEquipamentos(laudoData.equipamentosUtilizados ?? "");
    setCondicoes(laudoData.condicoesLocal ?? "");
    setConstatacoes(laudoData.constatacoes ?? []);
    setMedicoes(
      (laudoData.medicoes ?? []).map((m: any) => ({
        id: m.id,
        descricao: m.descricao,
        unidade: m.unidade ?? "",
        valorMedido: m.valorMedido ?? "",
        valorReferencia: m.valorReferencia ?? "",
        resultado: m.resultado ?? "",
      }))
    );
    setFotos(
      (laudoData.fotos ?? []).map((f: any) => ({
        id: f.id,
        url: f.url,
        legenda: f.legenda ?? "",
        comentario: f.comentario ?? "",
        classificacao: f.classificacao ?? "",
        ordem: f.ordem ?? 0,
      }))
    );
    setParecer((laudoData.conclusaoParecer as any) ?? "");
    setConclusao(laudoData.conclusaoTexto ?? "");
    setRecomendacoes(laudoData.recomendacoes ?? "");
    setLaudoStatus(laudoData.status);
  }, [laudoData]);

  // ── Mutations
  const createMutation = trpc.laudos.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Laudo ${data.numero} criado!`);
      navigate(`/gestor/laudos/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = trpc.laudos.update.useMutation({
    onSuccess: () => toast.success("Laudo salvo"),
    onError: (e: any) => toast.error(e.message),
  });

  const finalizeMutation = trpc.laudos.finalize.useMutation({
    onSuccess: () => {
      toast.success("Laudo finalizado!");
      setLaudoStatus("finalizado");
      setFinalizeConfirm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addFotoMutation = trpc.laudos.addFoto.useMutation();
  const removeFotoMutation = trpc.laudos.removeFoto.useMutation();
  const updateFotoMutation = trpc.laudos.updateFoto.useMutation();
  const addMedicaoMutation = trpc.laudos.addMedicao.useMutation();
  const removeMedicaoMutation = trpc.laudos.removeMedicao.useMutation();

  const generatePdfMutation = trpc.laudos.generatePdf.useMutation({
    onSuccess: (data: any) => {
      const bytes = atob(data.pdf);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado!");
    },
    onError: (e: any) => toast.error(`Erro ao gerar PDF: ${e.message}`),
    onSettled: () => setPdfLoading(false),
  });

  const isFinalized = laudoStatus !== "rascunho";

  // ── Salvar rascunho ──────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      if (isNew) {
        await createMutation.mutateAsync({ tipo: tipo as any, titulo, clienteId: clienteId ?? undefined, osId: osId ?? undefined });
        return;
      }

      await updateMutation.mutateAsync({
        id: laudoId!,
        tipo: tipo as any,
        titulo,
        clienteId,
        osId,
        objeto,
        metodologia,
        equipamentosUtilizados: equipamentos,
        condicoesLocal: condicoes,
        constatacoes: constatacoes as any,
        conclusaoParecer: parecer || null,
        conclusaoTexto: conclusao,
        recomendacoes,
        normasReferencia: normas as any,
        validadeMeses,
        dataInspecao: dataInspecao || null,
      });

      // Sincronizar medições (remover todas e adicionar de novo é simples para ETAPA 1)
      // Na prática, as medições são gerenciadas via addMedicao/removeMedicao inline
    } finally {
      setSaving(false);
    }
  }

  // ── Fotos ────────────────────────────────────────────────────────────────

  async function handleFotoUpload(files: FileList) {
    if (!laudoId) {
      toast.error("Salve o laudo antes de adicionar fotos");
      return;
    }
    setUploadingFotos(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch("/api/work-orders/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      for (const uploaded of data.urls) {
        const ordem = fotos.length;
        await addFotoMutation.mutateAsync({ laudoId, url: uploaded.url, ordem });
        setFotos((prev) => [...prev, { url: uploaded.url, legenda: "", comentario: "", classificacao: "", ordem }]);
      }
      toast.success("Foto(s) adicionada(s)");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao fazer upload");
    } finally {
      setUploadingFotos(false);
    }
  }

  async function handleRemoveFoto(index: number) {
    const foto = fotos[index];
    if (foto.id) {
      await removeFotoMutation.mutateAsync({ id: foto.id });
    }
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFotoChange(index: number, field: keyof Foto, value: string) {
    setFotos((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  }

  async function saveFotoMeta(index: number) {
    const foto = fotos[index];
    if (!foto.id) return;
    await updateFotoMutation.mutateAsync({
      id: foto.id,
      legenda: foto.legenda || undefined,
      comentario: foto.comentario || undefined,
      classificacao: foto.classificacao as any || undefined,
    });
  }

  function moveFoto(index: number, direction: -1 | 1) {
    setFotos((prev) => {
      const next = [...prev];
      const swap = index + direction;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next.map((f, i) => ({ ...f, ordem: i }));
    });
  }

  // ── Medições ─────────────────────────────────────────────────────────────

  function addMedicaoLocal() {
    setMedicoes((prev) => [
      ...prev,
      { descricao: "", unidade: "", valorMedido: "", valorReferencia: "", resultado: "" },
    ]);
  }

  async function handleSaveMedicao(index: number) {
    if (!laudoId) { toast.error("Salve o laudo primeiro"); return; }
    const m = medicoes[index];
    if (!m.descricao) return;
    if (m.id) return; // já salvo
    try {
      await addMedicaoMutation.mutateAsync({
        laudoId,
        descricao: m.descricao,
        unidade: m.unidade || undefined,
        valorMedido: m.valorMedido || undefined,
        valorReferencia: m.valorReferencia || undefined,
        resultado: m.resultado as any || undefined,
        ordem: index,
      });
      toast.success("Medição salva");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemoveMedicao(index: number) {
    const m = medicoes[index];
    if (m.id) {
      await removeMedicaoMutation.mutateAsync({ id: m.id });
    }
    setMedicoes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMedicao(index: number, field: keyof Medicao, value: string) {
    setMedicoes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  // ── Normas ───────────────────────────────────────────────────────────────

  function addNorma() {
    if (!normaCodigo.trim()) return;
    setNormas((prev) => [...prev, { codigo: normaCodigo.trim(), titulo: normaTitulo.trim() }]);
    setNormaCodigo("");
    setNormaTitulo("");
  }

  function removeNorma(index: number) {
    setNormas((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Constatações ─────────────────────────────────────────────────────────

  function addConstatacao() {
    setConstatacoes((prev) => [
      ...prev,
      { item: `Item ${prev.length + 1}`, descricao: "", status: "conforme", referenciaNormativa: "" },
    ]);
  }

  function updateConstatacao(index: number, field: keyof Constatacao, value: string) {
    setConstatacoes((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  function removeConstatacao(index: number) {
    setConstatacoes((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isNew && loadingLaudo) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/gestor/laudos")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {isNew ? "Novo Laudo Técnico" : (laudoData?.numero ?? "Laudo")}
              </h1>
              {!isNew && laudoData?.titulo && (
                <p className="text-sm text-muted-foreground">{laudoData.titulo}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                disabled={pdfLoading}
                onClick={() => { setPdfLoading(true); generatePdfMutation.mutate({ id: laudoId! }); }}
              >
                {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                PDF
              </Button>
            )}
            {isFinalized && (
              <Badge className="bg-blue-600 text-white">Finalizado</Badge>
            )}
          </div>
        </div>

        {/* Banner laudo finalizado */}
        {isFinalized && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Este laudo está finalizado e não pode ser editado.
          </div>
        )}

        {/* Abas */}
        <Tabs defaultValue="identificacao">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            <TabsTrigger value="identificacao">Identificação</TabsTrigger>
            <TabsTrigger value="contexto">Contexto</TabsTrigger>
            <TabsTrigger value="constatacoes">Constatações</TabsTrigger>
            <TabsTrigger value="medicoes">Medições</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="conclusao">Conclusão</TabsTrigger>
          </TabsList>

          {/* ── ABA 1: Identificação ─────────────────────────────────── */}
          <TabsContent value="identificacao">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificação do Laudo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo do Laudo *</Label>
                    <Select value={tipo} onValueChange={setTipo} disabled={isFinalized}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Título *</Label>
                    <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={isFinalized} placeholder="Ex: Vistoria elétrica do condomínio X" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Cliente</Label>
                    <Select
                      value={clienteId?.toString() ?? "none"}
                      onValueChange={(v) => setClienteId(v === "none" ? null : Number(v))}
                      disabled={isFinalized}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {clientesList.map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data da Inspeção</Label>
                    <Input type="date" value={dataInspecao} onChange={(e) => setDataInspecao(e.target.value)} disabled={isFinalized} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Validade (meses)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={validadeMeses}
                      onChange={(e) => setValidadeMeses(Number(e.target.value))}
                      disabled={isFinalized}
                    />
                  </div>
                </div>

                {/* Normas de referência */}
                <div className="space-y-2">
                  <Label>Normas de Referência</Label>
                  {normas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {normas.map((n, i) => (
                        <div key={i} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-sm">
                          <span className="font-mono font-medium">{n.codigo}</span>
                          {n.titulo && <span className="text-muted-foreground">— {n.titulo}</span>}
                          {!isFinalized && (
                            <button onClick={() => removeNorma(i)} className="ml-1 text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!isFinalized && (
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Código (ex: ABNT NBR 5410)"
                        value={normaCodigo}
                        onChange={(e) => setNormaCodigo(e.target.value)}
                        className="w-48"
                      />
                      <Input
                        placeholder="Título (opcional)"
                        value={normaTitulo}
                        onChange={(e) => setNormaTitulo(e.target.value)}
                        className="flex-1"
                      />
                      <Button variant="outline" size="icon" onClick={addNorma} disabled={!normaCodigo.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA 2: Contexto Técnico ──────────────────────────────── */}
          <TabsContent value="contexto">
            <Card>
              <CardHeader><CardTitle className="text-base">Contexto Técnico</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Objeto do Laudo</Label>
                  <Textarea
                    rows={4}
                    placeholder="Descreva a finalidade/objeto que foi inspecionado..."
                    value={objeto}
                    onChange={(e) => setObjeto(e.target.value)}
                    disabled={isFinalized}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Metodologia</Label>
                  <Textarea
                    rows={4}
                    placeholder="Descreva como foi realizada a inspeção..."
                    value={metodologia}
                    onChange={(e) => setMetodologia(e.target.value)}
                    disabled={isFinalized}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Equipamentos Utilizados</Label>
                  <Textarea
                    rows={3}
                    placeholder="Liste os equipamentos e instrumentos usados..."
                    value={equipamentos}
                    onChange={(e) => setEquipamentos(e.target.value)}
                    disabled={isFinalized}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Condições do Local</Label>
                  <Textarea
                    rows={3}
                    placeholder="Descreva as condições encontradas no local..."
                    value={condicoes}
                    onChange={(e) => setCondicoes(e.target.value)}
                    disabled={isFinalized}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA 3: Constatações ─────────────────────────────────── */}
          <TabsContent value="constatacoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Constatações Técnicas</CardTitle>
                {!isFinalized && (
                  <Button variant="outline" size="sm" onClick={addConstatacao} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {constatacoes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma constatação adicionada.
                  </p>
                )}
                {constatacoes.map((c, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Constatação {i + 1}
                      </span>
                      {!isFinalized && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeConstatacao(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Item</Label>
                        <Input
                          value={c.item}
                          onChange={(e) => updateConstatacao(i, "item", e.target.value)}
                          disabled={isFinalized}
                          placeholder="Nome do item verificado"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Referência Normativa</Label>
                        <Input
                          value={c.referenciaNormativa ?? ""}
                          onChange={(e) => updateConstatacao(i, "referenciaNormativa", e.target.value)}
                          disabled={isFinalized}
                          placeholder="Ex: ABNT NBR 5410 Item 9.3"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        rows={2}
                        value={c.descricao}
                        onChange={(e) => updateConstatacao(i, "descricao", e.target.value)}
                        disabled={isFinalized}
                        placeholder="Descreva o que foi observado..."
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_CONSTATACAO.map((s) => (
                          <button
                            key={s.value}
                            disabled={isFinalized}
                            onClick={() => updateConstatacao(i, "status", s.value)}
                            className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                              c.status === s.value
                                ? s.color + " ring-2 ring-offset-1 ring-current"
                                : "bg-background text-muted-foreground border-border hover:bg-secondary"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA 4: Medições ─────────────────────────────────────── */}
          <TabsContent value="medicoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Medições e Ensaios</CardTitle>
                {!isFinalized && (
                  <Button variant="outline" size="sm" onClick={addMedicaoLocal} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {medicoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma medição adicionada.</p>
                ) : (
                  <div className="space-y-2">
                    {/* Cabeçalho */}
                    <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 text-xs font-semibold text-muted-foreground uppercase px-1">
                      <span>Descrição</span>
                      <span>Unidade</span>
                      <span>Medido</span>
                      <span>Referência</span>
                      <span>Resultado</span>
                      <span />
                    </div>
                    {medicoes.map((m, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center border rounded p-2">
                        <Input
                          value={m.descricao}
                          onChange={(e) => updateMedicao(i, "descricao", e.target.value)}
                          disabled={isFinalized}
                          placeholder="Descrição"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={m.unidade}
                          onChange={(e) => updateMedicao(i, "unidade", e.target.value)}
                          disabled={isFinalized}
                          placeholder="V, A, Ω..."
                          className="h-8 text-sm"
                        />
                        <Input
                          value={m.valorMedido}
                          onChange={(e) => updateMedicao(i, "valorMedido", e.target.value)}
                          disabled={isFinalized}
                          placeholder="Valor"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={m.valorReferencia}
                          onChange={(e) => updateMedicao(i, "valorReferencia", e.target.value)}
                          disabled={isFinalized}
                          placeholder="Ref."
                          className="h-8 text-sm"
                        />
                        <Select
                          value={m.resultado || "none"}
                          onValueChange={(v) => updateMedicao(i, "resultado", v === "none" ? "" : v)}
                          disabled={isFinalized}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            <SelectItem value="aprovado">✔ Aprovado</SelectItem>
                            <SelectItem value="reprovado">✘ Reprovado</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          {!m.id && !isFinalized && (
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSaveMedicao(i)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!isFinalized && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMedicao(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA 5: Fotos ─────────────────────────────────────────── */}
          <TabsContent value="fotos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Registros Fotográficos</CardTitle>
                {!isFinalized && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingFotos || isNew}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1"
                  >
                    {uploadingFotos
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />}
                    Adicionar Fotos
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isNew && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Salve o laudo antes de adicionar fotos.
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFotoUpload(e.target.files)}
                />
                {fotos.length === 0 && !isNew && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma foto adicionada.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fotos.map((foto, i) => (
                    <div key={i} className="border rounded-lg overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={foto.url}
                          alt={foto.legenda || `Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        {!isFinalized && (
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button
                              onClick={() => moveFoto(i, -1)}
                              disabled={i === 0}
                              className="p-1 bg-black/50 text-white rounded hover:bg-black/70 disabled:opacity-30"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => moveFoto(i, 1)}
                              disabled={i === fotos.length - 1}
                              className="p-1 bg-black/50 text-white rounded hover:bg-black/70 disabled:opacity-30"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveFoto(i)}
                              className="p-1 bg-red-500/80 text-white rounded hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <Input
                          value={foto.legenda}
                          onChange={(e) => handleFotoChange(i, "legenda", e.target.value)}
                          onBlur={() => saveFotoMeta(i)}
                          disabled={isFinalized}
                          placeholder="Legenda da foto"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={foto.comentario}
                          onChange={(e) => handleFotoChange(i, "comentario", e.target.value)}
                          onBlur={() => saveFotoMeta(i)}
                          disabled={isFinalized}
                          placeholder="Comentário técnico (opcional)"
                          className="h-8 text-sm"
                        />
                        <Select
                          value={foto.classificacao || "none"}
                          onValueChange={(v) => {
                            handleFotoChange(i, "classificacao", v === "none" ? "" : v);
                          }}
                          disabled={isFinalized}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Classificação" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sem classificação —</SelectItem>
                            <SelectItem value="conforme">✔ Conforme</SelectItem>
                            <SelectItem value="nao_conforme">✘ Não Conforme</SelectItem>
                            <SelectItem value="atencao">⚠ Requer Atenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ABA 6: Conclusão ─────────────────────────────────────── */}
          <TabsContent value="conclusao">
            <Card>
              <CardHeader><CardTitle className="text-base">Conclusão e Parecer Técnico</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Parecer visual */}
                <div className="space-y-2">
                  <Label>Parecer Final *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { value: "conforme", label: "Conforme", icon: "🟢", border: "border-green-400 bg-green-50 text-green-800" },
                      { value: "parcialmente_conforme", label: "Parcialmente Conforme", icon: "🟡", border: "border-yellow-400 bg-yellow-50 text-yellow-800" },
                      { value: "nao_conforme", label: "Não Conforme", icon: "🔴", border: "border-red-400 bg-red-50 text-red-800" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        disabled={isFinalized}
                        onClick={() => setParecer(opt.value as any)}
                        className={`p-4 rounded-xl border-2 text-center font-semibold text-sm transition-all ${
                          parecer === opt.value
                            ? opt.border + " ring-2 ring-offset-2 ring-current"
                            : "border-border bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="text-2xl mb-1">{opt.icon}</div>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Texto de Conclusão</Label>
                  <Textarea
                    rows={5}
                    value={conclusao}
                    onChange={(e) => setConclusao(e.target.value)}
                    disabled={isFinalized}
                    placeholder="Descreva a conclusão técnica detalhada..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Recomendações</Label>
                  <Textarea
                    rows={4}
                    value={recomendacoes}
                    onChange={(e) => setRecomendacoes(e.target.value)}
                    disabled={isFinalized}
                    placeholder="Descreva as ações recomendadas..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Barra de ações inferior */}
        {!isFinalized && (
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || !titulo}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Rascunho
            </Button>
            {!isNew && (
              <Button
                onClick={() => setFinalizeConfirm(true)}
                disabled={!titulo || !parecer}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="h-4 w-4" />
                Finalizar Laudo
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialog de confirmação de finalização */}
      <AlertDialog open={finalizeConfirm} onOpenChange={setFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar laudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Após finalizado, o laudo não poderá mais ser editado. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                await handleSave();
                finalizeMutation.mutate({ id: laudoId! });
              }}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
