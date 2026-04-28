/**
 * FotoEditor.tsx — Editor avançado de fotos para laudos técnicos
 *
 * Permite ao técnico/admin:
 *  - Desenhar setas, círculos, retângulos e textos sobre a foto (Fabric.js v5)
 *  - Escolher cor das anotações (vermelho, amarelo, verde)
 *  - Desfazer e limpar anotações
 *  - Definir modo de layout no PDF (normal, destaque, zoom, anotada)
 *  - Recortar uma região da foto anotada para gerar um "detalhe ampliado" (Cropper.js)
 *
 * CORREÇÕES (v2):
 *  - Canvas responsivo: mede o container real após o Dialog terminar de animar
 *  - Carregamento de imagem via fetch/blob para evitar erros de CORS do Cloudinary
 *  - Layout mobile: painel de ferramentas horizontal; canvas ocupa a largura toda
 *
 * CORREÇÕES (v3):
 *  - Bug 1a: enterEditing() agora é chamado dentro de requestAnimationFrame, após renderAll()
 *  - Bug 1b: duplo clique sobre texto existente reabre edição (listener mouse:dblclick)
 *  - Bug 2: canvas sempre carrega foto.url como base (nunca urlAnotada) para evitar
 *            duplicar anotações antigas ao reeditar
 *  - Bug 3: modo original_zoom usa dois passos ("anotar" → "recortar") com canvas
 *            sempre montado (oculto via CSS), não desmontado — evita destruir as
 *            anotações ao alternar para o Cropper
 */

import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Undo2,
  Trash2,
  ArrowUpRight,
  Circle,
  Square,
  Type,
  CropIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Dados da foto que será editada */
export interface FotoEditorFoto {
  id: number;
  /** URL original da foto no Cloudinary (sempre usada como base do canvas) */
  url: string;
  /** URL da versão anotada gerada por uma edição anterior (exibida como miniatura no formulário) */
  urlAnotada?: string | null;
  /** JSON das formas Fabric do último save (usado apenas para restaurar — não como base da imagem) */
  anotacoesJson?: string | null;
  modoLayout?: string;
}

/** Resultado retornado ao pai quando o usuário clica em "Salvar alterações" */
export interface FotoEditorResult {
  urlAnotada?: string;
  urlRecorte?: string;
  modoLayout: string;
  anotacoesJson?: string;
}

interface FotoEditorProps {
  open: boolean;
  onClose: () => void;
  foto: FotoEditorFoto;
  /** Chamado com os dados já uploadados para salvar no banco via tRPC */
  onSave: (resultado: FotoEditorResult) => Promise<void>;
}

// ── Constantes ────────────────────────────────────────────────────────────────

/** Modos de layout disponíveis para o PDF */
const MODOS_LAYOUT = [
  { value: "normal",         label: "Normal",       desc: "2 fotos/linha" },
  { value: "destaque",       label: "Destaque",     desc: "Largura total" },
  { value: "destaque_duplo", label: "Duplo",        desc: "Orig + anotada" },
  { value: "original_zoom",  label: "Orig+Zoom",    desc: "Orig + recorte" },
  { value: "anotada",        label: "Anotada",      desc: "Usa anotada" },
];

const CORES = [
  { value: "#ef4444", label: "Vermelho", tw: "bg-red-500" },
  { value: "#eab308", label: "Amarelo",  tw: "bg-yellow-400" },
  { value: "#22c55e", label: "Verde",    tw: "bg-green-500" },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function FotoEditor({ open, onClose, foto, onSave }: FotoEditorProps) {
  const fabricRef          = useRef<fabric.Canvas | null>(null);
  const cropperRef         = useRef<Cropper | null>(null);
  const cropImgRef         = useRef<HTMLImageElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // Dimensões efetivas do canvas (atualizadas após inicialização)
  const canvasDimsRef      = useRef({ w: 600, h: 400 });
  // Histórico de estados JSON das formas para desfazer
  const historyRef         = useRef<string[]>([]);
  // Controla cleanup de polling
  const pollingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda o base64 da imagem anotada gerada antes de ir para o passo de recorte
  const imagemAnotadaParaRecorteRef = useRef<string>("");

  const [modo, setModo]             = useState(foto.modoLayout ?? "normal");
  const [cor, setCor]               = useState(CORES[0].value);
  const [salvando, setSalvando]     = useState(false);
  // Fluxo de dois passos para o modo original_zoom: "anotar" → "recortar"
  const [etapaZoom, setEtapaZoom]   = useState<"anotar" | "recortar">("anotar");
  // URL/base64 da imagem que o Cropper vai usar como fonte (imagem anotada exportada do Fabric)
  const [cropSrc, setCropSrc]       = useState<string>("");

  // O Cropper só aparece quando o modo é original_zoom E o usuário passou para o passo de recorte
  const mostraCropper = modo === "original_zoom" && etapaZoom === "recortar";

  // ── Resetar etapa ao fechar/abrir ─────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setEtapaZoom("anotar");
      setCropSrc("");
      imagemAnotadaParaRecorteRef.current = "";
    }
  }, [open]);

  // ── Carregar imagem via blob para evitar erros CORS do Cloudinary ─────────

  async function carregarImagemNoCanvas(
    canvas: fabric.Canvas,
    largura: number,
    altura: number
  ) {
    // SEMPRE usa foto.url como base — nunca foto.urlAnotada.
    // Se usássemos urlAnotada, as anotações antigas seriam "queimadas" na imagem base
    // e ao salvar novamente, seriam duplicadas por cima delas mesmas.
    const src = foto.url;

    try {
      // Tenta fetch/blob primeiro — evita o problema de CORS com Cloudinary
      const resp = await fetch(src, { mode: "cors" });
      if (!resp.ok) throw new Error("Fetch falhou");
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);

      fabric.Image.fromURL(objectUrl, (img) => {
        if (!img || !img.width) {
          // Se falhou com blob, tenta direto com crossOrigin
          URL.revokeObjectURL(objectUrl);
          carregarImagemDireto(canvas, src, largura, altura);
          return;
        }
        finalizarCarregamento(canvas, img, largura, altura, objectUrl);
      });
    } catch {
      // Fallback: carregar direto sem blob
      carregarImagemDireto(canvas, src, largura, altura);
    }
  }

  function carregarImagemDireto(
    canvas: fabric.Canvas,
    src: string,
    largura: number,
    altura: number
  ) {
    fabric.Image.fromURL(
      src,
      (img) => {
        if (!img) return;
        finalizarCarregamento(canvas, img, largura, altura);
      },
      { crossOrigin: "anonymous" }
    );
  }

  function finalizarCarregamento(
    canvas: fabric.Canvas,
    img: fabric.Image,
    largura: number,
    altura: number,
    objectUrlParaRevogar?: string
  ) {
    // Escala proporcionalmente centralizada no canvas
    const scaleX = largura / (img.width ?? largura);
    const scaleY = altura / (img.height ?? altura);
    const scale  = Math.min(scaleX, scaleY);
    const scaledW = (img.width ?? largura) * scale;
    const scaledH = (img.height ?? altura) * scale;

    img.scale(scale);
    img.set({
      left: (largura - scaledW) / 2,
      top:  (altura  - scaledH) / 2,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
    });
    canvas.add(img);
    canvas.sendToBack(img);

    // Restaura anotações salvas anteriormente (se houver) por cima da imagem original
    if (foto.anotacoesJson) {
      try {
        const formas: object[] = JSON.parse(foto.anotacoesJson);
        formas.forEach((objData: any) => {
          fabric.util.enlivenObjects(
            [objData],
            (objs: fabric.Object[]) => {
              objs.forEach((obj) => canvas.add(obj));
              canvas.renderAll();
            },
            "fabric"
          );
        });
      } catch {
        // JSON inválido — ignora silenciosamente
      }
    }

    salvarHistorico(canvas);
    canvas.renderAll();

    // Libera memória do object URL após o canvas já ter carregado a imagem
    if (objectUrlParaRevogar) {
      setTimeout(() => URL.revokeObjectURL(objectUrlParaRevogar), 5000);
    }
  }

  // ── Inicializar canvas Fabric com polling até container ter dimensões ──────
  // O canvas é montado UMA vez quando open=true e destruído quando open=false.
  // Não depende de mostraCropper para não destruir o canvas ao ir para o passo de recorte.

  useEffect(() => {
    if (!open) return;

    let tentativas = 0;

    function tentarInicializar() {
      tentativas++;
      const container = canvasContainerRef.current;
      const canvasEl  = document.getElementById("foto-editor-canvas") as HTMLCanvasElement | null;

      // Aguarda o container ter largura real (Dialog animação pode atrasar)
      if (!container || !canvasEl || container.clientWidth === 0) {
        if (tentativas < 30) {
          pollingTimerRef.current = setTimeout(tentarInicializar, 100);
        }
        return;
      }

      // Calcula dimensões baseadas no espaço disponível
      // 32px = padding horizontal do container (p-2 em cada lado)
      const largura = Math.min(container.clientWidth - 32, 1000);
      const altura  = Math.round(largura * 0.6);

      canvasDimsRef.current = { w: largura, h: altura };

      // Destrói instância anterior se existir
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }

      const canvas = new fabric.Canvas("foto-editor-canvas", {
        width: largura,
        height: altura,
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;
      historyRef.current = [];

      // Bug 1b: duplo clique sobre um IText existente reabre o modo de edição de texto
      canvas.on("mouse:dblclick", (e: fabric.IEvent) => {
        const target = e.target;
        if (target && (target as any).type === "i-text") {
          canvas.setActiveObject(target);
          (target as fabric.IText).enterEditing();
          canvas.renderAll();
        }
      });

      // Carrega a imagem de forma assíncrona (evita bloqueio)
      carregarImagemNoCanvas(canvas, largura, altura);
    }

    // Duplo requestAnimationFrame + 150ms: garante que o Dialog já terminou
    // de animar e o DOM foi pintado antes de medir o container
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        pollingTimerRef.current = setTimeout(tentarInicializar, 150);
      });
    });

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Inicializar Cropper.js (modo original_zoom, passo recortar) ───────────
  // Usa cropSrc (base64 da imagem anotada exportada do Fabric) como fonte.

  useEffect(() => {
    if (!open || !mostraCropper) return;

    let timer: ReturnType<typeof setTimeout>;

    function tentarCropper() {
      const imgEl = cropImgRef.current;
      if (!imgEl || cropperRef.current) return;
      // Aguarda a imagem ter dimensões naturais
      if (imgEl.naturalWidth === 0) {
        timer = setTimeout(tentarCropper, 100);
        return;
      }
      cropperRef.current = new Cropper(imgEl, {
        aspectRatio: NaN,   // recorte livre
        viewMode: 1,
        guides: true,
        highlight: true,
        autoCropArea: 0.5,
        responsive: true,   // redimensiona ao mudar tamanho da janela
        restore: true,      // restaura área de corte ao redimensionar
      });
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timer = setTimeout(tentarCropper, 150);
      });
    });

    return () => {
      clearTimeout(timer);
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mostraCropper, cropSrc]);

  // ── Fluxo de dois passos para original_zoom ───────────────────────────────

  /**
   * Exporta o canvas com as anotações como base64, guarda na ref e avança para
   * o passo de recorte. O canvas NÃO é desmontado — apenas oculto via CSS para
   * preservar as anotações caso o usuário queira voltar.
   */
  function irParaRecorte() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const base64 = canvas.toDataURL({ format: "jpeg", quality: 0.92 });
    imagemAnotadaParaRecorteRef.current = base64;
    setCropSrc(base64);
    setEtapaZoom("recortar");
  }

  /**
   * Destrói o Cropper e volta para o passo de anotação.
   * O canvas já está montado e com as anotações intactas.
   */
  function voltarParaAnotar() {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
    setEtapaZoom("anotar");
  }

  // ── Helpers de histórico ──────────────────────────────────────────────────

  function salvarHistorico(canvas: fabric.Canvas) {
    const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
    historyRef.current.push(JSON.stringify(formas.map((o) => o.toObject())));
  }

  function desfazer() {
    const canvas = fabricRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const anterior = historyRef.current[historyRef.current.length - 1];

    // Remove formas, mantém apenas a imagem base
    const imgBase = canvas.getObjects().find((o) => o instanceof fabric.Image);
    canvas.clear();
    if (imgBase) canvas.add(imgBase);

    if (anterior) {
      const formas: object[] = JSON.parse(anterior);
      formas.forEach((objData: any) => {
        fabric.util.enlivenObjects(
          [objData],
          (objs: fabric.Object[]) => {
            objs.forEach((obj) => canvas.add(obj));
            canvas.renderAll();
          },
          "fabric"
        );
      });
    }
    canvas.renderAll();
  }

  function limparAnotacoes() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects()
      .filter((o) => !(o instanceof fabric.Image))
      .forEach((o) => canvas.remove(o));
    canvas.renderAll();
    historyRef.current = [];
    salvarHistorico(canvas);
  }

  // ── Ferramentas de anotação ───────────────────────────────────────────────
  // Posição inicial centrada no canvas para que a forma apareça visível

  function posicaoCentral(offsetX = 0, offsetY = 0) {
    const { w, h } = canvasDimsRef.current;
    return { left: w / 2 - 60 + offsetX, top: h / 2 - 40 + offsetY };
  }

  function addSeta() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { w, h } = canvasDimsRef.current;
    const cx = w / 2, cy = h / 2;
    const linha = new fabric.Line([cx - 60, cy - 40, cx + 60, cy + 40], {
      stroke: cor, strokeWidth: 3,
    });
    const ponta = new fabric.Triangle({
      width: 16, height: 16,
      fill: cor,
      left: cx + 60, top: cy + 40,
      angle: 135,
      originX: "center", originY: "center",
    });
    const grupo = new fabric.Group([linha, ponta], { selectable: true });
    canvas.add(grupo);
    canvas.setActiveObject(grupo);
    canvas.renderAll();
    salvarHistorico(canvas);
  }

  function addCirculo() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { left, top } = posicaoCentral();
    const circulo = new fabric.Circle({
      radius: 40, fill: "transparent", stroke: cor, strokeWidth: 3, left, top,
    });
    canvas.add(circulo);
    canvas.setActiveObject(circulo);
    canvas.renderAll();
    salvarHistorico(canvas);
  }

  function addRetangulo() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { left, top } = posicaoCentral(-60, -40);
    const rect = new fabric.Rect({
      width: 120, height: 80, fill: "transparent", stroke: cor, strokeWidth: 3, left, top,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    salvarHistorico(canvas);
  }

  function addTexto() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { left, top } = posicaoCentral(-80, -10);
    const texto = new fabric.IText("Clique para editar", {
      left, top, fontSize: 18, fill: cor, fontFamily: "Arial", fontWeight: "bold",
    });
    canvas.add(texto);
    canvas.setActiveObject(texto);
    // Bug 1a: renderAll() primeiro, enterEditing() em rAF para garantir que o canvas
    // já renderizou o objeto antes de ativar o modo de edição de texto
    canvas.renderAll();
    requestAnimationFrame(() => {
      (texto as fabric.IText).enterEditing();
      canvas.renderAll();
    });
    salvarHistorico(canvas);
  }

  // ── Upload de imagem para o Cloudinary ────────────────────────────────────

  async function uploadBase64(base64: string, prefixo: string): Promise<string> {
    const filename = `${prefixo}-${foto.id}-${Date.now()}.jpg`;
    const resp = await fetch("/api/laudos/upload-anotada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, filename }),
    });
    const data = await resp.json();
    if (!data.success) throw new Error(data.message ?? "Erro no upload");
    return data.url as string;
  }

  // ── Salvar ────────────────────────────────────────────────────────────────

  async function handleSalvar() {
    setSalvando(true);
    try {
      let urlAnotada: string | undefined;
      let urlRecorte: string | undefined;
      let anotacoesJson: string | undefined;

      if (modo === "original_zoom") {
        if (etapaZoom === "recortar" && cropperRef.current) {
          // Passo 2: o usuário definiu o recorte
          // Faz upload da imagem anotada (já exportada ao clicar em "Definir recorte →")
          if (imagemAnotadaParaRecorteRef.current) {
            urlAnotada = await uploadBase64(imagemAnotadaParaRecorteRef.current, "laudo-anotada");
          }
          // Faz upload do recorte selecionado no Cropper
          const cropCanvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1200, maxHeight: 900 });
          if (!cropCanvas) throw new Error("Nenhum recorte definido");
          urlRecorte = await uploadBase64(cropCanvas.toDataURL("image/jpeg", 0.9), "laudo-zoom");
        } else {
          // Passo 1: salvou sem passar pelo recorte — salva só as anotações
          const canvas = fabricRef.current;
          if (!canvas) throw new Error("Canvas não inicializado");
          const base64Img = canvas.toDataURL({ format: "jpeg", quality: 0.9 });
          urlAnotada = await uploadBase64(base64Img, "laudo-anotada");
          const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
          if (formas.length > 0) {
            anotacoesJson = JSON.stringify(formas.map((o) => o.toObject()));
          }
        }
      } else {
        // Todos os outros modos: exporta canvas com anotações
        const canvas = fabricRef.current;
        if (!canvas) throw new Error("Canvas não inicializado");
        const base64Img = canvas.toDataURL({ format: "jpeg", quality: 0.9 });
        urlAnotada = await uploadBase64(base64Img, "laudo-anotada");
        const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
        if (formas.length > 0) {
          anotacoesJson = JSON.stringify(formas.map((o) => o.toObject()));
        }
      }

      await onSave({ urlAnotada, urlRecorte, modoLayout: modo, anotacoesJson });
      toast.success("Foto salva com sucesso");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar foto");
    } finally {
      setSalvando(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !salvando) onClose(); }}>
      {/*
        No mobile ocupa a tela toda (max-w-full h-full).
        No desktop limita em 5xl.
      */}
      <DialogContent
        className="p-0 gap-0 overflow-hidden w-full max-w-full sm:max-w-5xl"
        style={{ maxHeight: "95dvh", height: "95dvh" }}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="text-base">Editar Foto</DialogTitle>
        </DialogHeader>

        {/*
          Layout:
          - Mobile (< lg): coluna — painel de ferramentas no topo em horizontal scroll,
            depois a área do canvas abaixo
          - Desktop (≥ lg): linha — painel 48 à esquerda, canvas à direita
        */}
        <div
          className="flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0"
          style={{ height: "calc(95dvh - 105px)" }}
        >
          {/* ── Painel de ferramentas ──────────────────────────────────── */}
          <div
            className="
              flex-shrink-0
              w-full lg:w-48
              border-b lg:border-b-0 lg:border-r
              p-2 lg:p-3
              overflow-x-auto lg:overflow-y-auto
              bg-muted/30
            "
          >
            {/*
              Mobile: itens em linha horizontal (flex-row + gap)
              Desktop: itens em coluna (flex-col + space-y via children)
            */}
            <div className="flex flex-row lg:flex-col gap-3 lg:gap-0 lg:space-y-4 min-w-max lg:min-w-0">

              {/* Modo de Layout */}
              <div className="space-y-1 lg:space-y-1.5 flex-shrink-0">
                <Label className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  Layout PDF
                </Label>
                {/* Mobile: inline chips; Desktop: lista vertical */}
                <div className="flex flex-row lg:flex-col gap-1">
                  {MODOS_LAYOUT.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setModo(m.value);
                        // Ao trocar de modo, volta para o passo de anotação
                        if (m.value !== "original_zoom") {
                          voltarParaAnotar();
                        }
                      }}
                      className={`
                        px-2 py-1 rounded text-[10px] lg:text-xs transition-colors whitespace-nowrap
                        lg:w-full lg:text-left
                        ${modo === m.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted border border-border"}
                      `}
                    >
                      <span className="font-medium">{m.label}</span>
                      <span className={`hidden lg:block text-[10px] ${modo === m.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ferramentas — visíveis quando o canvas está ativo (não no passo de recorte) */}
              {!mostraCropper && (
                <>
                  <div className="space-y-1 flex-shrink-0">
                    <Label className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                      Anotar
                    </Label>
                    <div className="flex flex-row lg:grid lg:grid-cols-2 gap-1">
                      <Button variant="outline" size="sm" className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs whitespace-nowrap" onClick={addSeta}>
                        <ArrowUpRight className="h-3 w-3" /><span className="hidden sm:inline">Seta</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs whitespace-nowrap" onClick={addCirculo}>
                        <Circle className="h-3 w-3" /><span className="hidden sm:inline">Círculo</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs whitespace-nowrap" onClick={addRetangulo}>
                        <Square className="h-3 w-3" /><span className="hidden sm:inline">Ret.</span>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs whitespace-nowrap" onClick={addTexto}>
                        <Type className="h-3 w-3" /><span className="hidden sm:inline">Texto</span>
                      </Button>
                    </div>
                  </div>

                  {/* Seletor de cor */}
                  <div className="space-y-1 flex-shrink-0">
                    <Label className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                      Cor
                    </Label>
                    <div className="flex gap-1.5">
                      {CORES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => setCor(c.value)}
                          className={`w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 transition-all flex-shrink-0 ${c.tw} ${
                            cor === c.value ? "border-foreground scale-110" : "border-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desfazer / Limpar */}
                  <div className="flex flex-row lg:flex-col gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs lg:w-full whitespace-nowrap" onClick={desfazer}>
                      <Undo2 className="h-3 w-3" /><span className="hidden sm:inline">Desfazer</span>
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs lg:w-full whitespace-nowrap text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={limparAnotacoes}
                    >
                      <Trash2 className="h-3 w-3" /><span className="hidden sm:inline">Limpar</span>
                    </Button>
                  </div>

                  {/* Botão para ir ao passo de recorte — só no modo original_zoom */}
                  {modo === "original_zoom" && (
                    <div className="flex-shrink-0 pt-1 lg:pt-2">
                      <Button
                        size="sm"
                        className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs lg:w-full whitespace-nowrap"
                        onClick={irParaRecorte}
                      >
                        <CropIcon className="h-3 w-3" />
                        <span>Definir recorte</span>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Controles do passo de recorte */}
              {mostraCropper && (
                <div className="space-y-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-7 lg:h-8 text-[10px] lg:text-xs lg:w-full whitespace-nowrap"
                    onClick={voltarParaAnotar}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span>Voltar</span>
                  </Button>
                  <div className="flex items-start gap-1 text-[10px] lg:text-xs text-muted-foreground">
                    <CropIcon className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>Arraste para selecionar o detalhe a ampliar</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Área principal ────────────────────────────────────────────── */}
          <div
            ref={canvasContainerRef}
            className="flex-1 overflow-auto flex items-start justify-center p-2 bg-slate-900 min-h-0"
            style={{ minHeight: 250 }}
          >
            {/*
              O canvas Fabric SEMPRE permanece montado no DOM enquanto o editor estiver aberto.
              Quando o usuário vai para o passo de recorte (mostraCropper=true), ele é apenas
              ocultado via CSS — isso preserva todas as anotações desenhadas.
            */}
            <div
              className="relative"
              style={{ display: mostraCropper ? "none" : "block" }}
            >
              <canvas
                id="foto-editor-canvas"
                style={{ display: "block", border: "1px solid #334155" }}
              />
              <Badge
                variant="secondary"
                className="absolute bottom-2 left-2 text-[9px] px-1.5 py-0.5 hidden sm:flex"
              >
                Clique nos botões para adicionar • Duplo clique para editar texto
              </Badge>
            </div>

            {/* Imagem para o Cropper.js — só aparece no passo de recorte */}
            {mostraCropper && (
              <div className="w-full h-full overflow-hidden">
                {/*
                  A imagem do Cropper usa cropSrc: o base64 exportado do canvas com
                  as anotações já aplicadas. Isso garante que o usuário verá a versão
                  anotada ao selecionar o recorte, e o recorte conterá as anotações.
                */}
                <img
                  ref={cropImgRef}
                  src={cropSrc || foto.url}
                  alt="Foto para recorte"
                  style={{ display: "block", maxWidth: "100%", maxHeight: "100%" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Rodapé com botões ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-background flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvar} disabled={salvando} className="gap-1">
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
