import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine, X } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  initialValue?: string;
  width?: number;
  height?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// FullscreenCanvas
// ────────────────────────────────────────────────────────────────────────────
function FullscreenCanvas({
  onConfirm,
  onCancel,
}: {
  onConfirm: (sig: string) => void;
  onCancel: () => void;
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef    = useRef(false);
  const lastPosRef      = useRef({ x: 0, y: 0 });
  const lineWidthRef    = useRef(2);
  const hasSignatureRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // ── Função utilitária: (re)dimensiona o buffer do canvas ──────────────────
  const resizeCanvas = (w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas || w < 10 || h < 10) return;
    // Evita reset desnecessário quando o tamanho não muda
    if (canvas.width === w && canvas.height === h) return;

    const saved = hasSignatureRef.current ? canvas.toDataURL() : null;
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = saved;
    }
  };

  // ── useLayoutEffect: dimensiona o canvas antes do primeiro paint ──────────
  // Isso garante que canvas.width/height == CSS width/height ANTES do usuário
  // poder tocar — evita o bug onde coordenadas CSS (ex: 400px) excedem o buffer
  // padrão (300×150) e nada é desenhado.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    resizeCanvas(container.clientWidth, container.clientHeight);
  });  // sem deps: re-executa em cada render (é barato — o check de igualdade evita reset)

  // ── ResizeObserver: lida com rotação de tela após orientation lock ─────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        resizeCanvas(
          Math.round(entry.contentRect.width),
          Math.round(entry.contentRect.height),
        );
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Orientation lock + listener de saída de fullscreen ───────────────────
  useEffect(() => {
    const tryLock = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock?.("landscape");
      } catch (_) {}
    };
    tryLock();

    const onFsChange = () => {
      if (!document.fullscreenElement) onCancel();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (screen.orientation as any).unlock?.(); } catch (_) {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onCancel]);

  // ── Native touch listeners ({ passive: false }) ───────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (touch: Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    };

    const applyStyle = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = "#000059";
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    };

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e.touches[0]);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      applyStyle(ctx);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPosRef.current  = { x, y };
      lineWidthRef.current = 2;
      isDrawingRef.current    = true;
      hasSignatureRef.current = true;
      setHasSignature(true);
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const { x, y } = getPos(e.touches[0]);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dx   = x - lastPosRef.current.x;
      const dy   = y - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nw   = Math.max(1, Math.min(3, 4 - dist / 10));
      const sw   = lineWidthRef.current + (nw - lineWidthRef.current) * 0.3;
      applyStyle(ctx);
      ctx.lineWidth = sw;
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPosRef.current   = { x, y };
      lineWidthRef.current = sw;
    };

    const onEnd = () => { isDrawingRef.current = false; };

    canvas.addEventListener("touchstart",  onStart, { passive: false });
    canvas.addEventListener("touchmove",   onMove,  { passive: false });
    canvas.addEventListener("touchend",    onEnd);
    canvas.addEventListener("touchcancel", onEnd);
    return () => {
      canvas.removeEventListener("touchstart",  onStart);
      canvas.removeEventListener("touchmove",   onMove);
      canvas.removeEventListener("touchend",    onEnd);
      canvas.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  // ── Mouse (desktop) ──────────────────────────────────────────────────────
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = getMousePos(e);
    ctx.strokeStyle = "#000059";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    lastPosRef.current   = { x, y };
    lineWidthRef.current = 2;
    isDrawingRef.current    = true;
    hasSignatureRef.current = true;
    setHasSignature(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = getMousePos(e);
    const dx   = x - lastPosRef.current.x;
    const dy   = y - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nw   = Math.max(1, Math.min(3, 4 - dist / 10));
    const sw   = lineWidthRef.current + (nw - lineWidthRef.current) * 0.3;
    ctx.strokeStyle = "#000059";
    ctx.lineWidth   = sw;
    ctx.lineCap     = "round";
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current   = { x, y };
    lineWidthRef.current = sw;
  };

  const onMouseUp = () => { isDrawingRef.current = false; };

  // ── Ações ────────────────────────────────────────────────────────────────
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onConfirm(canvas.toDataURL("image/jpeg", 0.8));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col select-none">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white shrink-0">
        <span className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
          <PenLine className="w-4 h-4" />
          Assinatura
        </span>
        <button
          onClick={onCancel}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área do canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-white overflow-hidden"
        style={{ minHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-crosshair"
          style={{ width: "100%", height: "100%" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-2xl font-light tracking-widest">
              Assine aqui
            </p>
          </div>
        )}
        {/* Linha-guia */}
        <div className="absolute bottom-10 left-10 right-10 h-px bg-slate-200 pointer-events-none" />
      </div>

      {/* Rodapé */}
      <div className="flex gap-3 px-4 py-3 bg-slate-50 border-t shrink-0">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={clear}
          disabled={!hasSignature}
        >
          <Eraser className="w-4 h-4" />
          Limpar
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={confirm}
          disabled={!hasSignature}
        >
          <Check className="w-4 h-4" />
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SignaturePad: preview/gatilho → abre canvas fullscreen ao clicar
// ────────────────────────────────────────────────────────────────────────────
export default function SignaturePad({
  onSave,
  onClear,
  disabled = false,
  initialValue,
}: SignaturePadProps) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [captured,  setCaptured]  = useState<string | null>(initialValue ?? null);

  const handleOpen = async () => {
    if (disabled) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch (_) {}
    setIsOpen(true);
  };

  const handleConfirm = (sig: string) => {
    setCaptured(sig);
    onSave(sig);
    setIsOpen(false);
  };

  const handleClear = () => {
    setCaptured(null);
    onClear?.();
  };

  return (
    <>
      <div className="space-y-2">
        {/* Preview / gatilho */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleOpen}
          onKeyDown={(e) => e.key === "Enter" && handleOpen()}
          className={[
            "border-2 border-dashed rounded-xl overflow-hidden bg-white transition-colors",
            disabled
              ? "opacity-50 cursor-not-allowed border-slate-200"
              : "cursor-pointer hover:border-slate-400 hover:bg-slate-50 border-slate-300",
          ].join(" ")}
        >
          {captured ? (
            <img
              src={captured}
              alt="Assinatura capturada"
              className="w-full object-contain max-h-28"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-7 gap-2 text-slate-400">
              <PenLine className="w-7 h-7" />
              <span className="text-sm font-medium">Toque aqui para assinar</span>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={captured ? "outline" : "default"}
            size="sm"
            onClick={handleOpen}
            disabled={disabled}
            className="gap-1.5"
          >
            <PenLine className="h-3.5 w-3.5" />
            {captured ? "Reassinar" : "Assinar"}
          </Button>
          {captured && (
            <>
              <span className="text-xs text-green-600 font-medium">✓ Capturada</span>
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
              >
                Limpar
              </button>
            </>
          )}
        </div>
      </div>

      {isOpen &&
        createPortal(
          <FullscreenCanvas
            onConfirm={handleConfirm}
            onCancel={() => setIsOpen(false)}
          />,
          document.body
        )}
    </>
  );
}
