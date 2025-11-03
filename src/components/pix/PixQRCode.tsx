import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { normalizeDataUrl } from "@/lib/utils/normalizeDataUrl";

interface PixQRCodeProps {
  qrBase64: string;
  qrText: string;
}

export function PixQRCode({ qrBase64, qrText }: PixQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const normalizedQr = normalizeDataUrl(qrBase64);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrText);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  return (
    <div className="space-y-4">
      {/* QR Code */}
      <div className="flex justify-center">
        {!imageError ? (
          <img
            src={normalizedQr}
            alt="QR Code PIX"
            className="w-64 h-64 border border-border rounded-lg"
            onError={() => {
              console.error("❌ Erro ao carregar QR Code, src:", normalizedQr.substring(0, 60));
              setImageError(true);
            }}
          />
        ) : (
          <div className="w-64 h-64 border border-border rounded-lg flex items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground text-center px-4">
              QR Code indisponível.<br/>Use o código PIX abaixo.
            </p>
          </div>
        )}
      </div>

      {/* Botão Copiar */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Código copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copiar código PIX
          </>
        )}
      </button>

      {/* Texto Legal */}
      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <p>
          <strong>Atenção:</strong> A PUSHIN PAY atua exclusivamente como processadora
          de pagamentos e <u>não possui responsabilidade</u> pela entrega, suporte, conteúdo,
          qualidade ou cumprimento das obrigações do vendedor.
        </p>
      </div>
    </div>
  );
}
