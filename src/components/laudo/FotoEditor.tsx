/**
 * FotoEditor.tsx — Editor avançado de fotos para laudos técnicos
 *
 * Permite ao técnico/admin:
 *  - Desenhar setas, círculos, retângulos e textos sobre a foto (Fabric.js v5)
 *  - Escolher cor das anotações (vermelho, amarelo, verde)
 *  - Desfazer e limpar anotações
 *  - Definir modo de layout no PDF (normal, destaque, zoom, anotada)
 *  - Recortar uma região da foto para gerar um "detalhe ampliado" (Cropper.js)
 *
 * O resultado (imagem anotada + recorte + JSON das formas) é enviado via callback
 * onSave para o componente pai, que faz o upload e salva no banco.
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
} from "lucide-react";
import { toast } from "sonner";

// ── Tipos ─────────────────────────────────────────────────────────────────────

/** Dados da foto que será editada */
export interface FotoEditorFoto {
  id: number;
  url: string;
  urlAnotada?: string | null;
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

/** Largura fixa do canvas de edição (em pixels) */
const CANVAS_W = 780;
/** Altura fixa do canvas de edição */
const CANVAS_H = 480;

/** Modos de layout disponíveis para o PDF */
const MODOS_LAYOUT = [
  { value: "normal",        label: "Normal",         desc: "2 fotos por linha" },
  { value: "destaque",      label: "Destaque",       desc: "Largura total" },
  { value: "destaque_duplo",label: "Duplo",          desc: "Original + anotada" },
  { value: "original_zoom", label: "Orig + Zoom",    desc: "Original + recorte" },
  { value: "anotada",       label: "Anotada",        desc: "Usa imagem anotada" },
];

const CORES = [
  { value: "#ef4444", label: "Vermelho", tw: "bg-red-500" },
  { value: "#eab308", label: "Amarelo",  tw: "bg-yellow-400" },
  { value: "#22c55e", label: "Verde",    tw: "bg-green-500" },
];

// ── Componente ────────────────────────────────────────────────────────────────

export default function FotoEditor({ open, onClose, foto, onSave }: FotoEditorProps) {
  const fabricRef   = useRef<fabric.Canvas | null>(null);
  const cropperRef  = useRef<Cropper | null>(null);
  const cropImgRef  = useRef<HTMLImageElement | null>(null);
  // Histórico de estados JSON do canvas para desfazer
  const historyRef  = useRef<string[]>([]);

  const [modo, setModo]       = useState(foto.modoLayout ?? "normal");
  const [cor, setCor]         = useState(CORES[0].value);
  const [salvando, setSalvando] = useState(false);
  // Quando modo é original_zoom, mostramos o Cropper em vez do Fabric canvas
  const mostraCropper = modo === "original_zoom";

  // ── Inicializar / destruir canvas Fabric ──────────────────────────────────

  useEffect(() => {
    if (!open || mostraCropper) return;

    // Aguarda o DOM renderizar o <canvas> antes de inicializar o Fabric
    const timer = setTimeout(() => {
      const canvasEl = document.getElementById("foto-editor-canvas") as HTMLCanvasElement | null;
      if (!canvasEl) return;

      // Evita double-init se o componente re-renderizar
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }

      const canvas = new fabric.Canvas("foto-editor-canvas", {
        width: CANVAS_W,
        height: CANVAS_H,
        selection: true,
      });
      fabricRef.current = canvas;
      historyRef.current = [];

      // Carrega a imagem base (prefere a anotada se existir)
      const srcImg = foto.urlAnotada || foto.url;
      fabric.Image.fromURL(
        srcImg,
        (img) => {
          if (!img) return;
          // Escala proporcionalmente para caber no canvas
          const scaleX = CANVAS_W / (img.width ?? CANVAS_W);
          const scaleY = CANVAS_H / (img.height ?? CANVAS_H);
          const scale = Math.min(scaleX, scaleY);
          img.scale(scale);
          img.set({ left: 0, top: 0, selectable: false, evented: false });
          canvas.add(img);
          canvas.sendToBack(img);

          // Restaura anotações salvas anteriormente
          if (foto.anotacoesJson) {
            try {
              const formas: object[] = JSON.parse(foto.anotacoesJson);
              // Cada forma é recriada individualmente para evitar problemas de tipo
              formas.forEach((objData: any) => {
                fabric.util.enlivenObjects([objData], (objs: fabric.Object[]) => {
                  objs.forEach((obj) => canvas.add(obj));
                  canvas.renderAll();
                }, "fabric");
              });
            } catch {
              // JSON inválido — ignora silenciosamente
            }
          }

          // Salva estado inicial no histórico
          salvarHistorico(canvas);
          canvas.renderAll();
        },
        // Crossorigin para imagens do Cloudinary
        { crossOrigin: "anonymous" }
      );
    }, 80);

    return () => {
      clearTimeout(timer);
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [open, mostraCropper]);

  // ── Inicializar / destruir Cropper ────────────────────────────────────────

  useEffect(() => {
    if (!open || !mostraCropper) return;

    const timer = setTimeout(() => {
      const imgEl = cropImgRef.current;
      if (!imgEl || cropperRef.current) return;

      cropperRef.current = new Cropper(imgEl, {
        aspectRatio: NaN,    // recorte livre
        viewMode: 1,
        guides: true,
        highlight: true,
        autoCropArea: 0.5,
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [open, mostraCropper]);

  // ── Helpers de histórico ──────────────────────────────────────────────────

  function salvarHistorico(canvas: fabric.Canvas) {
    // Serializa apenas as formas (sem a imagem base)
    const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
    historyRef.current.push(JSON.stringify(formas.map((o) => o.toObject())));
  }

  function desfazer() {
    const canvas = fabricRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    historyRef.current.pop(); // Remove estado atual
    const anterior = historyRef.current[historyRef.current.length - 1];

    // Remove todas as formas (mantém apenas a imagem base)
    const imgBase = canvas.getObjects().find((o) => o instanceof fabric.Image);
    canvas.clear();
    if (imgBase) canvas.add(imgBase);

    // Restaura estado anterior
    if (anterior) {
      const formas: object[] = JSON.parse(anterior);
      formas.forEach((objData: any) => {
        fabric.util.enlivenObjects([objData], (objs: fabric.Object[]) => {
          objs.forEach((obj) => canvas.add(obj));
          canvas.renderAll();
        }, "fabric");
      });
    }
    canvas.renderAll();
  }

  function limparAnotacoes() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
    formas.forEach((o) => canvas.remove(o));
    canvas.renderAll();
    historyRef.current = [];
    salvarHistorico(canvas);
  }

  // ── Ferramentas de anotação ───────────────────────────────────────────────

  function addSeta() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Linha da seta
    const linha = new fabric.Line([60, 60, 200, 200], {
      stroke: cor,
      strokeWidth: 3,
    });
    // Ponta da seta (triângulo)
    const ponta = new fabric.Triangle({
      width: 16,
      height: 16,
      fill: cor,
      left: 200,
      top: 200,
      angle: 135,
      originX: "center",
      originY: "center",
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

    const circulo = new fabric.Circle({
      radius: 40,
      fill: "transparent",
      stroke: cor,
      strokeWidth: 3,
      left: 100,
      top: 100,
    });
    canvas.add(circulo);
    canvas.setActiveObject(circulo);
    canvas.renderAll();
    salvarHistorico(canvas);
  }

  function addRetangulo() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const rect = new fabric.Rect({
      width: 120,
      height: 80,
      fill: "transparent",
      stroke: cor,
      strokeWidth: 3,
      left: 100,
      top: 100,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    salvarHistorico(canvas);
  }

  function addTexto() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const texto = new fabric.IText("Clique para editar", {
      left: 100,
      top: 100,
      fontSize: 18,
      fill: cor,
      fontFamily: "Arial",
      fontWeight: "bold",
    });
    canvas.add(texto);
    canvas.setActiveObject(texto);
    (texto as fabric.IText).enterEditing();
    canvas.renderAll();
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

      if (mostraCropper) {
        // Modo original_zoom: exporta apenas o recorte
        const canvas = cropperRef.current?.getCroppedCanvas({
          maxWidth: 1200,
          maxHeight: 900,
        });
        if (!canvas) throw new Error("Nenhum recorte definido");
        const base64Recorte = canvas.toDataURL("image/jpeg", 0.9);
        urlRecorte = await uploadBase64(base64Recorte, "laudo-zoom");
      } else {
        // Modos com canvas Fabric
        const canvas = fabricRef.current;
        if (!canvas) throw new Error("Canvas não inicializado");

        // Exporta imagem com anotações sobrepostas
        const base64Img = canvas.toDataURL({ format: "jpeg", quality: 0.9 });
        urlAnotada = await uploadBase64(base64Img, "laudo-anotada");

        // Serializa só as formas (sem a imagem base) para reedição futura
        const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
        if (formas.length > 0) {
          anotacoesJson = JSON.stringify(formas.map((o) => o.toObject()));
        }
      }

      await onSave({
        urlAnotada,
        urlRecorte,
        modoLayout: modo,
        anotacoesJson,
      });

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
      <DialogContent
        className="max-w-5xl w-full p-0 gap-0 overflow-hidden"
        style={{ maxHeight: "95vh" }}
      >
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-base">Editar Foto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row overflow-hidden" style={{ maxHeight: "calc(95vh - 100px)" }}>
          {/* ── Painel lateral de ferramentas ────────────────────────────── */}
          <div className="flex-shrink-0 w-full sm:w-48 border-b sm:border-b-0 sm:border-r p-3 space-y-4 overflow-y-auto bg-muted/30">

            {/* Modo de Layout */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Modo Layout (PDF)
              </Label>
              {MODOS_LAYOUT.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModo(m.value)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    modo === m.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className={`text-[10px] ${modo === m.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Ferramentas de anotação — só visível quando não é modo de recorte */}
            {!mostraCropper && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Anotações
                  </Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={addSeta}>
                      <ArrowUpRight className="h-3.5 w-3.5" /> Seta
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={addCirculo}>
                      <Circle className="h-3.5 w-3.5" /> Círculo
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={addRetangulo}>
                      <Square className="h-3.5 w-3.5" /> Retângulo
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={addTexto}>
                      <Type className="h-3.5 w-3.5" /> Texto
                    </Button>
                  </div>
                </div>

                {/* Seletor de cor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cor
                  </Label>
                  <div className="flex gap-2">
                    {CORES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setCor(c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${c.tw} ${
                          cor === c.value ? "border-foreground scale-110" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Desfazer / Limpar */}
                <div className="space-y-1">
                  <Button variant="outline" size="sm" className="w-full gap-1 h-8 text-xs" onClick={desfazer}>
                    <Undo2 className="h-3.5 w-3.5" /> Desfazer
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-1 h-8 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={limparAnotacoes}>
                    <Trash2 className="h-3.5 w-3.5" /> Limpar tudo
                  </Button>
                </div>
              </>
            )}

            {/* Dica para o modo de recorte */}
            {mostraCropper && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorte / Zoom
                </Label>
                <p className="text-xs text-muted-foreground">
                  Arraste a área de seleção para definir a região de detalhe ampliado.
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CropIcon className="h-3 w-3" />
                  <span>No PDF: original à esquerda + recorte à direita</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Área principal — Canvas ou Cropper ───────────────────────── */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-900 min-h-0">
            {/* Canvas Fabric.js — anotações */}
            {!mostraCropper && (
              <div className="relative">
                <canvas
                  id="foto-editor-canvas"
                  style={{ display: "block", border: "1px solid #334155" }}
                />
                <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">
                  Clique em Seta/Círculo... para adicionar • Arraste para mover
                </Badge>
              </div>
            )}

            {/* Imagem para o Cropper.js — modo original_zoom */}
            {mostraCropper && (
              <div className="max-w-full max-h-full overflow-hidden" style={{ maxWidth: CANVAS_W, maxHeight: CANVAS_H }}>
                <img
                  ref={cropImgRef}
                  src={foto.url}
                  alt="Foto para recorte"
                  crossOrigin="anonymous"
                  style={{ display: "block", maxWidth: "100%", maxHeight: CANVAS_H }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Rodapé com botões ─────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-background">
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
