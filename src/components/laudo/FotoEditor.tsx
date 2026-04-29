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
 *
 * CORREÇÕES (v4):
 *  - Bug 1 (revisão): enterEditing() no Fabric v5 precisa de setTimeout(50ms) + foco
 *            no .upper-canvas para funcionar corretamente (rAF insuficiente)
 *  - Bug 2a/2b: canvasModificadoRef rastreia se houve mudanças reais no canvas;
 *            handleSalvar reutiliza URLs existentes e apaga versões antigas do Cloudinary
 *            antes de criar novas (evita acúmulo de imagens órfãs)
 *  - Bug 4: Cropper inicializa via evento onload da imagem (base64 grande demora a
 *            decodificar — polling baseado em naturalWidth era insuficiente)
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fabric } from "fabric";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
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
  /** URL do recorte/zoom gerado no modo original_zoom */
  urlRecorte?: string | null;
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

/**
 * Espaço de mundo fixo para o canvas Fabric.
 *
 * Problema: se o canvas fosse criado com o tamanho do container (varia por dispositivo),
 * as coordenadas das formas salvas em JSON seriam diferentes entre PC e mobile — ao trocar
 * de dispositivo, tudo apareceria deslocado.
 *
 * Solução: canvas SEMPRE opera em WORLD_W × WORLD_H pixels internamente.
 * O viewport transform (`canvas.setViewportTransform`) escala este espaço para o display
 * real de cada dispositivo. Coordenadas do JSON são sempre em "mundo" (1200×800).
 */
const WORLD_W = 1200;
const WORLD_H = 800;

// ── Componente ────────────────────────────────────────────────────────────────

export default function FotoEditor({ open, onClose, foto, onSave }: FotoEditorProps) {
  const fabricRef          = useRef<fabric.Canvas | null>(null);
  const cropperRef         = useRef<Cropper | null>(null);
  const cropImgRef         = useRef<HTMLImageElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  // Dimensões efetivas do canvas (atualizadas após inicialização)
  // Dimensões do espaço de mundo — sempre WORLD_W × WORLD_H (constante acima do componente).
  // Usado em posicaoCentral() para posicionar formas no centro do mundo, não do display.
  const canvasDimsRef      = useRef({ w: WORLD_W, h: WORLD_H });
  // Histórico de estados JSON das formas para desfazer
  const historyRef         = useRef<string[]>([]);
  // Controla cleanup de polling de inicialização do canvas
  const pollingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda o base64 da imagem anotada gerada antes de ir para o passo de recorte
  const imagemAnotadaParaRecorteRef = useRef<string>("");
  // Rastreia se o usuário fez alguma alteração no canvas desde que o editor foi aberto.
  // Quando false, handleSalvar reutiliza as URLs já salvas no banco sem fazer novo upload.
  const canvasModificadoRef = useRef(false);
  // URLs atuais no Cloudinary — atualizadas DENTRO do handleSalvar após cada upload.
  // Usar a prop foto.urlAnotada seria inseguro: ela pode estar desatualizada entre saves.
  const urlAnotadaLocalRef  = useRef<string | null>(null);
  const urlRecorteLocalRef  = useRef<string | null>(null);

  const [modo, setModo]             = useState(foto.modoLayout ?? "normal");
  const [cor, setCor]               = useState(CORES[0].value);
  const [salvando, setSalvando]     = useState(false);
  // Modal para entrada de texto — abre teclado nativo em mobile sem conflito com Fabric.
  // Usa fabric.Text (estático) em vez de IText (inline-edit) para evitar problemas de foco.
  const [textoModal, setTextoModal] = useState<{ visible: boolean; valor: string; obj: fabric.Text | null }>({ visible: false, valor: "", obj: null });
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
      // Sincroniza os refs locais com os valores atuais da prop ao abrir
      urlAnotadaLocalRef.current = foto.urlAnotada ?? null;
      urlRecorteLocalRef.current = foto.urlRecorte ?? null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Canvas acabou de ser carregado com o estado salvo no banco — ainda não foi modificado
    canvasModificadoRef.current = false;
    canvas.renderAll();

    // Libera memória do object URL após o canvas já ter carregado a imagem
    if (objectUrlParaRevogar) {
      setTimeout(() => URL.revokeObjectURL(objectUrlParaRevogar), 5000);
    }
  }

  // ── Fechar com ESC (sem Dialog Radix, precisamos do listener manual) ─────

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !salvando) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, salvando]);

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

      // Tamanho de DISPLAY: adapta ao container, mas nunca ultrapassamos 1000px de largura.
      // O canvas INTERNO opera sempre em WORLD_W × WORLD_H via viewport transform.
      const largura = Math.min(container.clientWidth - 32, 1000);
      const altura  = Math.round(largura * (WORLD_H / WORLD_W));  // mantém proporção 3:2

      // canvasDimsRef aponta para o MUNDO, não o display — posicionar formas no centro
      canvasDimsRef.current = { w: WORLD_W, h: WORLD_H };

      // Destrói instância anterior se existir
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }

      // Canvas HTML tem o tamanho do display; o viewport transform escala para o mundo.
      const canvas = new fabric.Canvas("foto-editor-canvas", {
        width: largura,
        height: altura,
        selection: true,
        preserveObjectStacking: true,
      });

      // Escala o espaço de mundo (WORLD_W × WORLD_H) para o display atual.
      // Com zoom = 0.4 num mobile com 480px, uma forma em (600,400) aparece em (240,160).
      // No PC com zoom = 0.7 e 840px, a mesma forma aparece em (420,280) — mesma posição relativa.
      const zoom = Math.min(largura / WORLD_W, altura / WORLD_H);
      canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);

      fabricRef.current = canvas;
      historyRef.current = [];

      // Detecta duplo clique / duplo toque em texto para abrir o modal de edição.
      // Funciona com fabric.Text (novo) e fabric.IText (textos de sessões antigas).
      canvas.on("mouse:dblclick", (e: any) => {
        const target = e.target;
        if (!target) return;
        if (target.type === "text" || target.type === "i-text") {
          // Se for IText que auto-entrou em edição, sai antes de abrir o modal
          if (target.isEditing) target.exitEditing();
          setTextoModal({ visible: true, valor: target.text ?? "", obj: target as fabric.Text });
        }
      });

      // Carrega a imagem em coordenadas de MUNDO (WORLD_W × WORLD_H)
      carregarImagemNoCanvas(canvas, WORLD_W, WORLD_H);
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
  // Usa cropSrc (base64 exportado do canvas Fabric) como fonte da imagem.
  // Bug 4: cropSrc é um base64 grande — a tag <img> pode demorar para decodificar,
  // então o Cropper deve ser inicializado no evento "load" da imagem, não via polling
  // de naturalWidth (que retorna 0 enquanto o browser ainda decodifica o base64).

  useEffect(() => {
    if (!open || !mostraCropper) return;

    const imgEl = cropImgRef.current;
    if (!imgEl) return;

    function inicializarCropper() {
      if (cropperRef.current || !imgEl) return;
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

    // Se a imagem já está em cache (complete + naturalWidth > 0), inicializa direto.
    // Caso contrário, aguarda o evento "load" — isso cobre o caso do base64 grande.
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      inicializarCropper();
    } else {
      imgEl.addEventListener("load", inicializarCropper, { once: true });
    }

    return () => {
      imgEl.removeEventListener("load", inicializarCropper);
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
    // Exporta em resolução de mundo (WORLD_W × WORLD_H) para o Cropper ter boa qualidade
    const base64 = exportarCanvasBase64();
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
    canvasModificadoRef.current = true;
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
    canvasModificadoRef.current = true;
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
    canvasModificadoRef.current = true;
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
    canvasModificadoRef.current = true;
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
    canvasModificadoRef.current = true;
  }

  function addTexto() {
    // Abre o modal nativo de texto em vez de criar IText diretamente.
    // Vantagem: usa <textarea autoFocus>, que abre o teclado nativo no iOS/Android.
    // Fabric.Text estático é criado só após o usuário confirmar — sem problemas de foco.
    setTextoModal({ visible: true, valor: "", obj: null });
  }

  /**
   * Confirma a entrada de texto do modal e adiciona/atualiza o objeto no canvas.
   * Usa fabric.Text (estático) em vez de fabric.IText (inline-edit).
   */
  function confirmarTexto() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const valor = textoModal.valor.trim() || "Texto";

    if (textoModal.obj) {
      // Editar texto existente (obj pode ser fabric.Text ou fabric.IText legado)
      textoModal.obj.set("text", valor);
      canvas.renderAll();
      salvarHistorico(canvas);
      canvasModificadoRef.current = true;
    } else {
      // Criar novo objeto de texto estático no centro do mundo
      const { left, top } = posicaoCentral(-80, -10);
      const texto = new fabric.Text(valor, {
        left, top,
        fontSize: 20,
        fill: cor,
        fontFamily: "Arial",
        fontWeight: "bold",
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.6)", blur: 4, offsetX: 1, offsetY: 1 }),
      });
      canvas.add(texto);
      canvas.setActiveObject(texto);
      canvas.renderAll();
      salvarHistorico(canvas);
      canvasModificadoRef.current = true;
    }

    setTextoModal({ visible: false, valor: "", obj: null });
  }

  // ── Exportar canvas em resolução de mundo (WORLD_W × WORLD_H) ─────────────
  /**
   * Exporta o conteúdo do canvas como JPEG em resolução de mundo (WORLD_W × WORLD_H).
   *
   * Por que isso é necessário:
   * - O canvas HTML tem o tamanho do display (varia por dispositivo).
   * - `canvas.toDataURL()` sem ajuste exportaria no tamanho do display.
   * - Temporariamente redimensionamos o canvas para o mundo, removemos o viewport
   *   transform (que está escalado para o display) e exportamos em resolução fixa.
   * - Após exportar, restauramos o tamanho e transform originais.
   */
  function exportarCanvasBase64(): string {
    const canvas = fabricRef.current;
    if (!canvas) throw new Error("Canvas não inicializado");

    const vp = canvas.viewportTransform!.slice() as number[];
    const dw = canvas.getWidth(), dh = canvas.getHeight();

    canvas.setWidth(WORLD_W);
    canvas.setHeight(WORLD_H);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    const b64 = canvas.toDataURL({ format: "jpeg", quality: 0.9 });

    // Restaura estado de display
    canvas.setWidth(dw);
    canvas.setHeight(dh);
    canvas.setViewportTransform(vp as [number, number, number, number, number, number]);
    canvas.renderAll();

    return b64;
  }

  // ── Upload / deleção de imagens no Cloudinary ────────────────────────────

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

  /**
   * Sinaliza ao backend para apagar uma imagem do Cloudinary.
   * Falha silenciosamente — não bloqueia o fluxo de salvar.
   */
  async function deletarCloudinaryUrl(url: string): Promise<void> {
    try {
      await fetch("/api/laudos/delete-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {
      // Falha silenciosa
    }
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
          // Passo 2: usuário definiu o recorte.
          // urlAnotadaLocalRef e urlRecorteLocalRef sempre têm a versão mais recente —
          // usar foto.urlAnotada/urlRecorte seria inseguro pois a prop pode estar desatualizada.
          if (urlAnotadaLocalRef.current) await deletarCloudinaryUrl(urlAnotadaLocalRef.current);
          if (urlRecorteLocalRef.current) await deletarCloudinaryUrl(urlRecorteLocalRef.current);

          // Sobe a imagem anotada exportada no passo de anotação
          if (imagemAnotadaParaRecorteRef.current) {
            urlAnotada = await uploadBase64(imagemAnotadaParaRecorteRef.current, "laudo-anotada");
            urlAnotadaLocalRef.current = urlAnotada;
          }
          // Sobe o recorte selecionado no Cropper
          const cropCanvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1200, maxHeight: 900 });
          if (!cropCanvas) throw new Error("Nenhum recorte definido");
          urlRecorte = await uploadBase64(cropCanvas.toDataURL("image/jpeg", 0.9), "laudo-zoom");
          urlRecorteLocalRef.current = urlRecorte;

        } else {
          // Passo 1: salvou sem definir recorte — aplica mesma lógica dos outros modos
          const canvas = fabricRef.current;
          if (!canvas) throw new Error("Canvas não inicializado");

          if (canvasModificadoRef.current) {
            if (urlAnotadaLocalRef.current) await deletarCloudinaryUrl(urlAnotadaLocalRef.current);
            // Exporta em resolução de mundo para consistência entre dispositivos
            const base64Img = exportarCanvasBase64();
            urlAnotada = await uploadBase64(base64Img, "laudo-anotada");
            urlAnotadaLocalRef.current = urlAnotada;
            const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
            if (formas.length > 0) {
              anotacoesJson = JSON.stringify(formas.map((o) => o.toObject()));
            }
          } else {
            urlAnotada = urlAnotadaLocalRef.current ?? undefined;
            anotacoesJson = foto.anotacoesJson ?? undefined;
          }
        }
      } else {
        // Todos os outros modos: exporta canvas com anotações
        const canvas = fabricRef.current;
        if (!canvas) throw new Error("Canvas não inicializado");

        if (canvasModificadoRef.current) {
          // Apaga versão anterior antes de criar nova (usa ref local, não a prop)
          if (urlAnotadaLocalRef.current) await deletarCloudinaryUrl(urlAnotadaLocalRef.current);
          // Exporta em resolução de mundo (WORLD_W × WORLD_H) — independente do display
          const base64Img = exportarCanvasBase64();
          urlAnotada = await uploadBase64(base64Img, "laudo-anotada");
          urlAnotadaLocalRef.current = urlAnotada;  // atualiza para o próximo save
          const formas = canvas.getObjects().filter((o) => !(o instanceof fabric.Image));
          if (formas.length > 0) {
            anotacoesJson = JSON.stringify(formas.map((o) => o.toObject()));
          }
        } else {
          // Canvas não modificado — só modoLayout pode ter mudado
          urlAnotada = urlAnotadaLocalRef.current ?? undefined;
          anotacoesJson = foto.anotacoesJson ?? undefined;
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
  // Usa createPortal em vez de Radix Dialog para evitar o focus trap do Radix,
  // que roubava o foco da textarea oculta do Fabric IText ao ativar edição de texto
  // e causava clipping no Cropper.js por constraints de overflow do Dialog.

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop semitransparente — fechar ao clicar fora */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => { if (!salvando) onClose(); }}
      />
      {/* Painel do editor centralizado */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{ padding: "0 0" }}
      >
        <div
          className="pointer-events-auto relative bg-background flex flex-col p-0 overflow-hidden w-full sm:max-w-5xl rounded-none sm:rounded-lg shadow-2xl"
          style={{ maxHeight: "95dvh", height: "95dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho */}
          <div className="px-4 pt-4 pb-2 border-b flex-shrink-0 flex items-center justify-between">
            <h2 className="text-base font-semibold">Editar Foto</h2>
          </div>

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
          {/*
            overflow-auto quando o canvas está ativo (para rolagem em telas pequenas).
            overflow-visible quando o Cropper está ativo: o Cropper.js posiciona os
            handles do crop box FORA dos limites da imagem — overflow-auto os cortaria.
          */}
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-start justify-center p-2 bg-slate-900 min-h-0"
            style={{ minHeight: 250, overflow: mostraCropper ? "visible" : "auto" }}
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
                Clique nos botões para adicionar • Duplo clique no texto para editar
              </Badge>
            </div>

            {/* Imagem para o Cropper.js — só aparece no passo de recorte */}
            {mostraCropper && (
              /*
                overflow-visible é obrigatório aqui: o Cropper.js adiciona elementos
                (crop box, handles, overlay) que ficam fora dos limites da imagem.
                Com overflow-hidden, esses elementos são cortados e a UI some.
              */
              <div className="w-full" style={{ overflow: "visible" }}>
                <img
                  ref={cropImgRef}
                  src={cropSrc || foto.url}
                  alt="Foto para recorte"
                  style={{ display: "block", maxWidth: "100%", maxHeight: "calc(95dvh - 200px)" }}
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
        </div>
      </div>

      {/* ── Modal de texto — abre teclado nativo em mobile ─────────────────── */}
      {/*
        Render dentro do portal (z-[60], acima do editor z-50).
        Usa <textarea autoFocus> que dispara o teclado nativo corretamente em iOS/Android.
        Duplo clique em texto existente (fabric.Text ou fabric.IText legado) reabre o modal.
      */}
      {textoModal.visible && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setTextoModal({ visible: false, valor: "", obj: null })}
        >
          <div
            className="bg-background rounded-t-2xl sm:rounded-xl shadow-2xl p-4 w-full sm:w-96 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold text-sm">
              {textoModal.obj ? "Editar texto" : "Adicionar texto"}
            </p>
            <textarea
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={textoModal.valor}
              onChange={(e) => setTextoModal((s) => ({ ...s, valor: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmarTexto(); }
                if (e.key === "Escape") setTextoModal({ visible: false, valor: "", obj: null });
              }}
              placeholder="Digite o texto..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setTextoModal({ visible: false, valor: "", obj: null })}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmarTexto}>
                {textoModal.obj ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
