import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  initialValue?: string;
}

export default function SignaturePad({
  onSave,
  onClear,
  width = 400,
  height = 150,
  disabled = false,
  initialValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [currentLineWidth, setCurrentLineWidth] = useState(2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar canvas
    ctx.imageSmoothingEnabled = true; // Ativa o suavizamento de imagem genérico
    ctx.imageSmoothingQuality = "high"; // Define a qualidade do suavizamento como alta
    ctx.strokeStyle = "#000059"; // Cor da linha
    ctx.shadowBlur = 0.2; 
    ctx.shadowColor = "#000059";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fundo branco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Carregar assinatura inicial se existir
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    // Precisamos registrar onde o pincel encostou no papel
    setLastPos({ x, y });
    // Opcional: resetar a espessura inicial para o valor médio
    setCurrentLineWidth(2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    // Lógica da Pena (Velocidade)
    // Calcula a distância entre o ponto atual e o último
    const dx = x - lastPos.x;
    const dy = y - lastPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Define a espessura: quanto mais rápido (maior distância), mais fino o traço
    // Ajuste o '4' e o '1' para mudar o quão grossa/fina a pena é
    const newLineWidth = Math.max(1, Math.min(3, 4 - distance / 10));
    
    // Suaviza a transição da espessura para não dar "pulos"
    const smoothedWidth = currentLineWidth + (newLineWidth - currentLineWidth) * 0.3;

    ctx.beginPath();
    ctx.lineWidth = smoothedWidth; // Aplica a espessura dinâmica
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Atualiza estados para o próximo frame
    setLastPos({ x, y });
    setCurrentLineWidth(smoothedWidth);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Converter para JPEG com qualidade reduzida para economizar espaço
    // PNG pode ser muito grande para assinaturas
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    console.log("[SignaturePad] Assinatura salva, tamanho:", dataUrl.length, "bytes");
    onSave(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div
        className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white"
        style={{ width: "100%", maxWidth: width }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full touch-none cursor-crosshair"
          style={{ height: "auto", aspectRatio: `${width}/${height}` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={disabled || !hasSignature}
        >
          <Check className="h-4 w-4 mr-1" />
          Confirmar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Desenhe sua assinatura no campo acima
      </p>
    </div>
  );
}
