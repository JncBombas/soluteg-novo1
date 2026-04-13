import { useRef, useEffect, useState } from "react";
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
// FullscreenCanvas: overlay fullscreen com canvas landscape
// ────────────────────────────────────────────────────────────────────────────
function FullscreenCanvas({
  onConfirm,
  onCancel,
}: {
  onConfirm: (sig: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasSignatureRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lineWidthRef = useRef(2);
  const [hasSignature, setHasSignature] = useState(false);

  // Trava orientação em landscape e fecha ao sair do fullscreen
  useEffect(() => {
    const tryLock = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock?.("landscape");
      } catch (_) {}
    };
    tryLock();

    const handleFsChange = () => {
      if (!document.fullscreenElement) onCancel();
    };
    document.addEventListener("fullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen.orientation as any).unlock?.();
      } catch (_) {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onCancel]);

  // Dimensiona o canvas via ResizeObserver (sem DPR para máxima compatibilidade)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const applyCtxStyles = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = "#000059";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.shadowBlur = 0.2;
      ctx.shadowColor = "#000059";
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w < 10 || h < 10) continue;

        const savedContent = hasSignatureRef.current ? canvas.toDataURL() : null;

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        applyCtxStyles(ctx);

        if (savedContent) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, w, h);
          };
          img.src = savedContent;
        }
      }
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Touch: native listeners com { passive: false } para garantir desenho no mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (touch: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e.touches[0]);
      lastPosRef.current = { x, y };
      lineWidthRef.current = 2;
      ctx.strokeStyle = "#000059";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 0.2;
      ctx.shadowColor = "#000059";
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawingRef.current = true;
      hasSignatureRef.current = true;
      setHasSignature(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e.touches[0]);
      const dx = x - lastPosRef.current.x;
      const dy = y - lastPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newW = Math.max(1, Math.min(3, 4 - dist / 10));
      const smooth = lineWidthRef.current + (newW - lineWidthRef.current) * 0.3;
      ctx.beginPath();
      ctx.lineWidth = smooth;
      ctx.strokeStyle = "#000059";
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPosRef.current = { x, y };
      lineWidthRef.current = smooth;
    };

    const onTouchEnd = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Mouse (desktop)
  const startMouseDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastPosRef.current = { x, y };
    lineWidthRef.current = 2;
    ctx.strokeStyle = "#000059";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    hasSignatureRef.current = true;
    setHasSignature(true);
  };

  const continueMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - lastPosRef.current.x;
    const dy = y - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newW = Math.max(1, Math.min(3, 4 - dist / 10));
    const smooth = lineWidthRef.current + (newW - lineWidthRef.current) * 0.3;
    ctx.beginPath();
    ctx.lineWidth = smooth;
    ctx.strokeStyle = "#000059";
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
    lineWidthRef.current = smooth;
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

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
      <div className="flex-1 relative bg-white" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none cursor-crosshair"
          style={{ width: "100%", height: "100%" }}
          onMouseDown={startMouseDraw}
          onMouseMove={continueMouse}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
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
  const [isOpen, setIsOpen] = useState(false);
  const [captured, setCaptured] = useState<string | null>(initialValue ?? null);

  const handleOpen = async () => {
    if (disabled) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch (_) {
      // Desktop ou bloqueado — abre o overlay mesmo sem fullscreen nativo
    }
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
