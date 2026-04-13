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

// ─────────────────────────────────────────────────────────────────────────────
// FullscreenCanvas
// Estratégia: canvas cobre 100% da viewport (fixed inset-0).
// Header e rodapé ficam sobrepostos (position:absolute, z-index alto).
// Isso elimina toda complexidade de medir containers via refs.
// ─────────────────────────────────────────────────────────────────────────────
function FullscreenCanvas({
  onConfirm,
  onCancel,
}: {
  onConfirm: (sig: string) => void;
  onCancel: () => void;
}) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const isDrawingRef    = useRef(false);
  const lastPosRef      = useRef({ x: 0, y: 0 });
  const lineWidthRef    = useRef(2);
  const hasSignatureRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Dimensiona o canvas para cobrir toda a viewport.
  // useLayoutEffect (sem deps) roda após cada render, antes do paint.
  // O check de igualdade evita reset desnecessário.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width === w && canvas.height === h) return;
    const saved = hasSignatureRef.current ? canvas.toDataURL() : null;
    canvas.width        = w;
    canvas.height       = h;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = saved;
    }
  });

  // Orientation lock, saída de fullscreen e resize (ex: após entrar em fullscreen)
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

    // window resize captura tanto orientationchange quanto mudança de viewport
    const onResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width === w && canvas.height === h) return;
      const saved = hasSignatureRef.current ? canvas.toDataURL() : null;
      canvas.width        = w;
      canvas.height       = h;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, w, h);
        img.src = saved;
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("resize", onResize);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (screen.orientation as any).unlock?.(); } catch (_) {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onCancel]);

  // Native touch listeners com { passive: false }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (touch: Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    };

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e.touches[0]);
      ctx.strokeStyle = "#000059";
      ctx.lineWidth   = 2;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPosRef.current      = { x, y };
      lineWidthRef.current    = 2;
      isDrawingRef.current    = true;
      hasSignatureRef.current = true;
      setHasSignature(true);
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e.touches[0]);
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

  // Mouse (desktop)
  const mousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = mousePos(e);
    ctx.strokeStyle = "#000059"; ctx.lineWidth = 2;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x, y);
    lastPosRef.current = { x, y }; lineWidthRef.current = 2;
    isDrawingRef.current = true; hasSignatureRef.current = true;
    setHasSignature(true);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = mousePos(e);
    const dx = x - lastPosRef.current.x; const dy = y - lastPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nw = Math.max(1, Math.min(3, 4 - dist / 10));
    const sw = lineWidthRef.current + (nw - lineWidthRef.current) * 0.3;
    ctx.strokeStyle = "#000059"; ctx.lineWidth = sw; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y); ctx.stroke();
    lastPosRef.current = { x, y }; lineWidthRef.current = sw;
  };
  const onMouseUp = () => { isDrawingRef.current = false; };

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
    <div
      className="fixed inset-0 z-[9999] select-none overflow-hidden"
      style={{ pointerEvents: "auto" }}
    >
      {/* Canvas: cobre toda a viewport, sem restrição de tamanho via CSS */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 touch-none"
        style={{ pointerEvents: "auto", cursor: "crosshair" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />

      {/* Placeholder */}
      {!hasSignature && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: "none", zIndex: 1 }}
        >
          <p className="text-slate-300 text-2xl font-light tracking-widest">
            Assine aqui
          </p>
        </div>
      )}

      {/* Linha-guia */}
      <div
        className="absolute left-10 right-10 h-px bg-slate-200"
        style={{ bottom: 74, zIndex: 1, pointerEvents: "none" }}
      />

      {/* Cabeçalho (sobreposto, z=10) */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-slate-800 text-white"
        style={{ zIndex: 10 }}
      >
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

      {/* Rodapé (sobreposto, z=10) */}
      <div
        className="absolute bottom-0 left-0 right-0 flex gap-3 px-4 py-3 bg-slate-50 border-t"
        style={{ zIndex: 10 }}
      >
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

// ─────────────────────────────────────────────────────────────────────────────
// SignaturePad: preview/gatilho → abre canvas fullscreen
// ─────────────────────────────────────────────────────────────────────────────
export default function SignaturePad({
  onSave,
  onClear,
  disabled = false,
  initialValue,
}: SignaturePadProps) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [captured, setCaptured] = useState<string | null>(initialValue ?? null);

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
