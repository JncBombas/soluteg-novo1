import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
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
import { APP_LOGO } from "@/const";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Download,
  ArrowLeft,
  Loader2,
  Upload,
  X,
  AlertTriangle,
  LogOut,
  BookOpen,
  Search,
  FileInput,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LAUDO_TEMPLATES } from "@/lib/laudoTemplates";
import FotoEditor, { type FotoEditorFoto } from "@/components/laudo/FotoEditor";

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
  // Campos do editor avançado (Etapa 3)
  urlAnotada?: string | null;
  urlRecorte?: string | null;
  modoLayout?: string;
  anotacoesJson?: string | null;
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

export default function TecnicoLaudoForm() {
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
  const _tpl = isNew ? LAUDO_TEMPLATES["instalacao_eletrica"] : null;
  const [objeto, setObjeto] = useState("");
  const [metodologia, setMetodologia] = useState(_tpl?.metodologia ?? "");
  const [equipamentos, setEquipamentos] = useState(_tpl?.equipamentos ?? "");
  const [condicoes, setCondicoes] = useState("");

  // ── Aba 3: Constatações
  const [constatacoes, setConstatacoes] = useState<Constatacao[]>(_tpl?.constatacoes ?? []);

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Template
  const [confirmTemplate, setConfirmTemplate] = useState<{ show: boolean; tipo: string }>({ show: false, tipo: "" });

  // ── Biblioteca de normas
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const [bibliotecaSearch, setBibliotecaSearch] = useState("");
  const [bibliotecaSelecionadas, setBibliotecaSelecionadas] = useState<Set<string>>(new Set());

  // ── Importar de OS
  const [showImportOS, setShowImportOS] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState<string>("none");
  const [osPreview, setOsPreview] = useState<any>(null);

  // ── Carregar laudo existente
  const { data: laudoData, isLoading: loadingLaudo } = (trpc as any).laudos.getByIdTecnico.useQuery(
    { id: laudoId! },
    { enabled: !isNew && laudoId !== null }
  );

  // ── Dados de suporte
  const { data: normasBibliotecaData = [] } = (trpc as any).laudos.listNormasBibliotecaTecnico.useQuery(
    {},
    { staleTime: 300_000 }
  );
  const { data: workOrdersData } = (trpc as any).workOrders.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: showImportOS, staleTime: 60_000 }
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
        urlAnotada: f.urlAnotada ?? null,
        urlRecorte: f.urlRecorte ?? null,
        modoLayout: f.modoLayout ?? "normal",
        anotacoesJson: f.anotacoesJson ?? null,
      }))
    );
    setParecer((laudoData.conclusaoParecer as any) ?? "");
    setConclusao(laudoData.conclusaoTexto ?? "");
    setRecomendacoes(laudoData.recomendacoes ?? "");
    setLaudoStatus(laudoData.status);
  }, [laudoData]);

  // Para novo laudo: preenche normas da biblioteca assim que carregam
  const normasIniciais = useRef(false);
  useEffect(() => {
    if (!isNew || normasIniciais.current) return;
    if (!(normasBibliotecaData as any[]).length) return;
    normasIniciais.current = true;
    const normasFiltradas = (normasBibliotecaData as any[]).filter((n: any) => {
      try { return JSON.parse(n.tiposLaudo).includes("instalacao_eletrica"); }
      catch { return false; }
    });
    setNormas(normasFiltradas.map((n: any) => ({ codigo: n.codigo, titulo: n.titulo })));
  }, [(normasBibliotecaData as any[]).length]);

  // ── Mutations
  const createMutation = (trpc as any).laudos.createTecnico.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Laudo ${data.numero} criado!`);
      navigate(`/technician/laudos/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = (trpc as any).laudos.updateTecnico.useMutation({
    onSuccess: () => toast.success("Laudo salvo"),
    onError: (e: any) => toast.error(e.message),
  });

  const addFotoMutation = (trpc as any).laudos.addFotoTecnico.useMutation();
  const removeFotoMutation = (trpc as any).laudos.removeFoto.useMutation();
  const updateFotoMutation = (trpc as any).laudos.updateFotoTecnico.useMutation();

  // ── Editor avançado de fotos ─────────────────────────────────────────────
  const [fotoEditando, setFotoEditando] = useState<Foto | null>(null);
  const addMedicaoMutation = (trpc as any).laudos.addMedicao.useMutation();
  const removeMedicaoMutation = (trpc as any).laudos.removeMedicao.useMutation();

  const generatePdfMutation = (trpc as any).laudos.generatePdf.useMutation({
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
        await createMutation.mutateAsync({
          tipo: tipo as any,
          titulo,
          clienteId: clienteId ?? undefined,
          normasReferencia: normas as any,
        });
        return;
      }

      await updateMutation.mutateAsync({
        id: laudoId!,
        tipo: tipo as any,
        titulo,
        clienteId,
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

  async function saveFotoMetaWithValue(index: number, overrides?: Partial<Foto>) {
    const foto = { ...fotos[index], ...overrides };
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

  /** Chamado pelo FotoEditor ao salvar — salva no banco e atualiza state local */
  async function handleSalvarEditor(resultado: {
    urlAnotada?: string;
    urlRecorte?: string;
    modoLayout: string;
    anotacoesJson?: string;
  }) {
    if (!fotoEditando?.id) return;
    await updateFotoMutation.mutateAsync({
      id: fotoEditando.id,
      urlAnotada: resultado.urlAnotada,
      urlRecorte: resultado.urlRecorte,
      modoLayout: resultado.modoLayout,
      anotacoesJson: resultado.anotacoesJson,
    });
    setFotos((prev) =>
      prev.map((f) =>
        f.id === fotoEditando.id
          ? {
              ...f,
              urlAnotada: resultado.urlAnotada ?? f.urlAnotada,
              urlRecorte: resultado.urlRecorte ?? f.urlRecorte,
              modoLayout: resultado.modoLayout,
              anotacoesJson: resultado.anotacoesJson ?? f.anotacoesJson,
            }
          : f
      )
    );
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
    if (m.id) return;
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

  function handleLogout() {
    fetch("/api/technician-logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("technicianId");
    localStorage.removeItem("technicianName");
    localStorage.removeItem("technicianToken");
    window.location.href = "/technician/login";
  }

  // ── Template ─────────────────────────────────────────────────────────────

  function aplicarTemplate(tipoLaudo: string) {
    const template = LAUDO_TEMPLATES[tipoLaudo];
    if (!template) return;
    setMetodologia(template.metodologia);
    setEquipamentos(template.equipamentos);
    setConstatacoes(template.constatacoes);
    const normasFiltradas = (normasBibliotecaData as any[]).filter((n: any) => {
      try {
        const tipos: string[] = JSON.parse(n.tiposLaudo);
        return tipos.includes(tipoLaudo);
      } catch { return false; }
    });
    setNormas(normasFiltradas.map((n: any) => ({ codigo: n.codigo, titulo: n.titulo })));
  }

  function handleTipoChange(novoTipo: string) {
    setTipo(novoTipo);
    if (!isNew) return;
    const camposVazios = !objeto && !metodologia && constatacoes.length === 0;
    if (camposVazios) {
      aplicarTemplate(novoTipo);
    } else {
      setConfirmTemplate({ show: true, tipo: novoTipo });
    }
  }

  // ── Biblioteca de normas ─────────────────────────────────────────────────

  function toggleBibliotecaNorma(codigo: string) {
    setBibliotecaSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }

  function adicionarNormasBiblioteca() {
    const jaAdicionadas = new Set(normas.map((n) => n.codigo));
    const paraAdicionar = (normasBibliotecaData as any[])
      .filter((n: any) => bibliotecaSelecionadas.has(n.codigo) && !jaAdicionadas.has(n.codigo))
      .map((n: any) => ({ codigo: n.codigo, titulo: n.titulo }));
    setNormas((prev) => [...prev, ...paraAdicionar]);
    setBibliotecaSelecionadas(new Set());
    setShowBiblioteca(false);
  }

  // ── Importar de OS ───────────────────────────────────────────────────────

  async function handleImportarOS() {
    if (!osPreview) return;
    setOsId(osPreview.id);
    if (osPreview.tasks && osPreview.tasks.length > 0) {
      const novasConstatacoes = (osPreview.tasks as any[]).map((t: any) => ({
        item: t.title ?? t.description ?? "Tarefa",
        descricao: t.description ?? "",
        status: t.completed ? "conforme" : "atencao",
        referenciaNormativa: "",
      }));
      setConstatacoes(novasConstatacoes);
    }
    setShowImportOS(false);
    setOsSelecionada("none");
    setOsPreview(null);
    toast.success("Dados da OS importados");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isNew && loadingLaudo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/technician/laudos")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={APP_LOGO} alt="JNC Logo" className="h-8" />
            <div>
              <p className="text-xs text-muted-foreground">Portal do Técnico</p>
              <p className="font-semibold text-sm">
                {isNew ? "Novo Laudo" : (laudoData?.numero ?? "Laudo")}
              </p>
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
                {pdfLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  : <Download className="h-3.5 w-3.5 mr-1" />}
                PDF
              </Button>
            )}
            {isFinalized && (
              <Badge className="bg-blue-600 text-white">Finalizado</Badge>
            )}
            <Button size="sm" variant="outline" onClick={handleLogout} className="gap-1">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5 max-w-4xl">
        {/* Banner laudo finalizado */}
        {isFinalized && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Este laudo está finalizado e não pode ser editado.
          </div>
        )}

        {/* Abas */}
        <Tabs defaultValue="identificacao">
          <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-6 flex-nowrap sm:flex-wrap">
            <TabsTrigger value="identificacao" className="shrink-0 sm:shrink">Identificação</TabsTrigger>
            <TabsTrigger value="contexto" className="shrink-0 sm:shrink">Contexto</TabsTrigger>
            <TabsTrigger value="constatacoes" className="shrink-0 sm:shrink">Constatações</TabsTrigger>
            <TabsTrigger value="medicoes" className="shrink-0 sm:shrink">Medições</TabsTrigger>
            <TabsTrigger value="fotos" className="shrink-0 sm:shrink">Fotos</TabsTrigger>
            <TabsTrigger value="conclusao" className="shrink-0 sm:shrink">Conclusão</TabsTrigger>
          </TabsList>

          {/* ── ABA 1: Identificação ─────────────────────────────────── */}
          <TabsContent value="identificacao">
            <Card>
              <CardHeader><CardTitle className="text-base">Identificação do Laudo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo do Laudo *</Label>
                    <Select value={tipo} onValueChange={handleTipoChange} disabled={isFinalized}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Título *</Label>
                    <Input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      disabled={isFinalized}
                      placeholder="Ex: Vistoria elétrica do condomínio X"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Data da Inspeção</Label>
                    <Input
                      type="date"
                      value={dataInspecao}
                      onChange={(e) => setDataInspecao(e.target.value)}
                      disabled={isFinalized}
                    />
                  </div>
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

                {!isFinalized && (
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setShowImportOS(true)}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <FileInput className="h-3.5 w-3.5" />
                      Importar dados de uma OS →
                    </button>
                  </div>
                )}

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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setBibliotecaSelecionadas(new Set()); setShowBiblioteca(true); }}
                        className="gap-1 whitespace-nowrap"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Da biblioteca
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
                        {/* Exibe a imagem anotada se existir, caso contrário a original */}
                        <img
                          src={foto.urlAnotada || foto.url}
                          alt={foto.legenda || `Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        {/* Badge indicando o modo de layout no PDF */}
                        {foto.modoLayout && foto.modoLayout !== "normal" && (
                          <div className="absolute top-2 left-2">
                            <Badge
                              className={`text-[10px] px-1.5 py-0.5 ${
                                foto.modoLayout === "destaque" ? "bg-blue-600 text-white" :
                                foto.modoLayout === "destaque_duplo" ? "bg-indigo-600 text-white" :
                                foto.modoLayout === "original_zoom" ? "bg-purple-600 text-white" :
                                "bg-orange-500 text-white"
                              }`}
                            >
                              {foto.modoLayout === "destaque" ? "Destaque" :
                               foto.modoLayout === "destaque_duplo" ? "Duplo" :
                               foto.modoLayout === "original_zoom" ? "Zoom" : "Anotada"}
                            </Badge>
                          </div>
                        )}
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
                        {/* Botão para abrir o editor avançado */}
                        {!isFinalized && foto.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1"
                            onClick={() => setFotoEditando(foto)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar / Anotar
                          </Button>
                        )}
                        <Input
                          value={foto.legenda}
                          onChange={(e) => handleFotoChange(i, "legenda", e.target.value)}
                          onBlur={() => saveFotoMetaWithValue(i)}
                          disabled={isFinalized}
                          placeholder="Legenda da foto"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={foto.comentario}
                          onChange={(e) => handleFotoChange(i, "comentario", e.target.value)}
                          onBlur={() => saveFotoMetaWithValue(i)}
                          disabled={isFinalized}
                          placeholder="Comentário técnico (opcional)"
                          className="h-8 text-sm"
                        />
                        <Select
                          value={foto.classificacao || "none"}
                          onValueChange={(v) => {
                            const val = v === "none" ? "" : v;
                            handleFotoChange(i, "classificacao", val);
                            saveFotoMetaWithValue(i, { classificacao: val as any });
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
                <div className="space-y-2">
                  <Label>Parecer Final</Label>
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

        {/* Barra de ações inferior — técnico não finaliza */}
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
          </div>
        )}
      </main>

      {/* ── Dialog: confirmar aplicação de template ── */}
      <AlertDialog
        open={confirmTemplate.show}
        onOpenChange={(open) => !open && setConfirmTemplate({ show: false, tipo: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá substituir a metodologia, equipamentos, constatações e normas pelo
              template padrão para o tipo selecionado. As informações atuais serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Manter atual</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                aplicarTemplate(confirmTemplate.tipo);
                setConfirmTemplate({ show: false, tipo: "" });
              }}
            >
              Aplicar template
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: biblioteca de normas ── */}
      <Dialog open={showBiblioteca} onOpenChange={setShowBiblioteca}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Biblioteca de Normas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar norma..."
                value={bibliotecaSearch}
                onChange={(e) => setBibliotecaSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
              {(normasBibliotecaData as any[])
                .filter((n: any) =>
                  !bibliotecaSearch ||
                  n.codigo.toLowerCase().includes(bibliotecaSearch.toLowerCase()) ||
                  n.titulo.toLowerCase().includes(bibliotecaSearch.toLowerCase())
                )
                .map((n: any) => (
                  <label
                    key={n.codigo}
                    className="flex items-start gap-2 p-2 rounded hover:bg-secondary cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={bibliotecaSelecionadas.has(n.codigo)}
                      onChange={() => toggleBibliotecaNorma(n.codigo)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-mono font-medium">{n.codigo}</p>
                      <p className="text-xs text-muted-foreground">{n.titulo}</p>
                    </div>
                  </label>
                ))}
              {(normasBibliotecaData as any[]).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma norma na biblioteca.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBiblioteca(false)}>Cancelar</Button>
              <Button onClick={adicionarNormasBiblioteca} disabled={bibliotecaSelecionadas.size === 0}>
                Adicionar selecionadas ({bibliotecaSelecionadas.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: importar de OS ── */}
      <Dialog open={showImportOS} onOpenChange={setShowImportOS}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar dados de uma OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Selecionar Ordem de Serviço</Label>
              <Select
                value={osSelecionada}
                onValueChange={(v) => {
                  setOsSelecionada(v);
                  if (v && v !== "none") {
                    const os = ((workOrdersData as any)?.workOrders ?? []).find(
                      (o: any) => String(o.id) === v
                    );
                    setOsPreview(os ?? null);
                  } else {
                    setOsPreview(null);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma OS..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Selecione —</SelectItem>
                  {((workOrdersData as any)?.workOrders ?? []).map((os: any) => (
                    <SelectItem key={os.id} value={String(os.id)}>
                      {os.orderNumber ?? `OS #${os.id}`} — {os.clientName ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {osPreview && (
              <div className="border rounded-md p-3 text-sm space-y-1 bg-secondary/30">
                <p><span className="font-medium">OS:</span> {osPreview.orderNumber}</p>
                {osPreview.clientName && <p><span className="font-medium">Cliente:</span> {osPreview.clientName}</p>}
                {osPreview.description && (
                  <p><span className="font-medium">Descrição:</span> {osPreview.description}</p>
                )}
                {osPreview.tasks && osPreview.tasks.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {osPreview.tasks.length} tarefa(s) serão importadas como constatações.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowImportOS(false); setOsSelecionada("none"); setOsPreview(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleImportarOS} disabled={!osPreview}>
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Editor avançado de fotos ─────────────────────────────────────── */}
      {fotoEditando && (
        <FotoEditor
          open={!!fotoEditando}
          onClose={() => setFotoEditando(null)}
          foto={fotoEditando as FotoEditorFoto}
          onSave={async (resultado) => {
            await handleSalvarEditor(resultado);
          }}
        />
      )}
    </div>
  );
}
