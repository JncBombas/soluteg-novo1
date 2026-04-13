import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Eraser, Check, PenLine, X } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  initialValue?: string;
  // Mantidos por compatibilidade, não utilizados na versão fullscreen
  width?: number;
  height?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// FullscreenCanvas: overlay fixo em cima de tudo, força landscape no mobile
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

  // Tenta bloquear orientação em landscape e encerrar ao sair do fullscreen
  useEffect(() => {
    const tryLock = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock?.("landscape");
      } catch (_) {
        // API não disponível (desktop, iOS) — o overlay ainda cobre a tela
      }
    };
    tryLock();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onCancel();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen.orientation as any).unlock?.();
      } catch (_) {}
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [onCancel]);

  // Dimensiona o canvas ao container via ResizeObserver (mantém desenho entre resizes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCtx = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#000059";
      ctx.shadowBlur = 0.2;
      ctx.shadowColor = "#000059";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width < 10 || height < 10) continue;

        const dpr = window.devicePixelRatio || 1;
        // Salva conteúdo atual antes de resetar
        const savedContent = hasSignatureRef.current ? canvas.toDataURL() : null;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        setupCtx(ctx, width, height);

        if (savedContent) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, width, height);
          img.src = savedContent;
        }
      }
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    lastPosRef.current = { x, y };
    lineWidthRef.current = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    hasSignatureRef.current = true;
    setHasSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    const dx = x - lastPosRef.current.x;
    const dy = y - lastPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const newWidth = Math.max(1, Math.min(3, 4 - distance / 10));
    const smoothed = lineWidthRef.current + (newWidth - lineWidthRef.current) * 0.3;
    ctx.beginPath();
    ctx.lineWidth = smoothed;
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
    lineWidthRef.current = smoothed;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onConfirm(dataUrl);
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
      <div className="flex-1 relative bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full block touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
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
// SignaturePad: exibe preview/gatilho; ao clicar abre o canvas fullscreen
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
    // Tenta entrar em fullscreen a partir do gesto do usuário
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch (_) {
      // Desktop ou bloqueado — abre o overlay mesmo sem fullscreen
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
        {/* Área de preview / gatilho */}
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

        {/* Botões de ação */}
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
