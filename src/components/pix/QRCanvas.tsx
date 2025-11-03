import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface QRCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCanvas = ({ value, size = 256, className = "" }: QRCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) {
      setError(true);
      return;
    }

    console.log("[QRCanvas] Gerando QR Code:", {
      valueLength: value.length,
      valuePreview: value.substring(0, 50),
    });

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2,
        errorCorrectionLevel: "M",
      },
      (err) => {
        if (err) {
          console.error("[QRCanvas] Erro ao gerar QR:", err);
          setError(true);
        } else {
          console.log("[QRCanvas] ✅ QR gerado com sucesso");
          setError(false);
        }
      }
    );
  }, [value, size]);

  if (error || !value) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted text-muted-foreground rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center p-4">
          <p className="text-sm">QR Code indisponível</p>
          <p className="text-xs mt-1">Use o código PIX abaixo</p>
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
