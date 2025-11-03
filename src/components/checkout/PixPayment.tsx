import { useState, useEffect } from "react";
import { Loader2, Copy, CheckCircle2, XCircle, Clock } from "lucide-react";
import { createPixCharge, getPixStatus } from "@/services/pushinpay";
import QRCode from "qrcode";

interface PixPaymentProps {
  orderId: string;
  valueInCents: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function PixPayment({
  orderId,
  valueInCents,
  onSuccess,
  onError,
}: PixPaymentProps) {
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pixId, setPixId] = useState("");
  const [status, setStatus] = useState<"created" | "paid" | "expired" | "canceled">("created");
  const [copied, setCopied] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);

  // Criar cobrança PIX ao montar o componente
  useEffect(() => {
    async function createCharge() {
      try {
        const response = await createPixCharge(orderId, valueInCents);
        
        if (!response.ok || !response.pix) {
          const errorMsg = response.error || "Erro ao criar cobrança PIX. Verifique sua integração em Financeiro.";
          onError(errorMsg);
          setLoading(false);
          return;
        }

        // 🔍 LOGS DE DIAGNÓSTICO
        console.log("✅ PIX Response completa:", response);
        console.log("📦 PIX Data:", response.pix);
        console.log("🖼️ QR Code Base64 length:", response.pix.qr_code_base64?.length || 0);
        console.log("🖼️ QR Code Base64 (primeiros 100 chars):", response.pix.qr_code_base64?.substring(0, 100));
        console.log("📝 QR Code String:", response.pix.qr_code);

        setQrCode(response.pix.qr_code);
        setPixId(response.pix.pix_id);
        setStatus(response.pix.status as any);
        
        // 🔧 FALLBACK: Gerar QR Code localmente se não vier da API
        if (response.pix.qr_code_base64 && response.pix.qr_code_base64.length > 0) {
          console.log("✅ Usando QR Code base64 da API PushinPay");
          setQrCodeBase64(response.pix.qr_code_base64);
        } else {
          console.log("⚠️ QR Code base64 vazio, gerando localmente...");
          try {
            const generatedQR = await QRCode.toDataURL(response.pix.qr_code, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            // Remove o prefixo "data:image/png;base64," que já vem do QRCode.toDataURL
            const base64Only = generatedQR.replace(/^data:image\/png;base64,/, '');
            setQrCodeBase64(base64Only);
            console.log("✅ QR Code gerado localmente com sucesso");
          } catch (qrError) {
            console.error("❌ Erro ao gerar QR Code localmente:", qrError);
            onError("Erro ao gerar QR Code. Tente copiar o código PIX manualmente.");
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("❌ Erro geral ao criar PIX:", error);
        onError(String(error));
      }
    }

    createCharge();
  }, [orderId, valueInCents]);

  // Polling de status
  useEffect(() => {
    if (loading || status === "paid" || status === "expired" || status === "canceled") {
      return;
    }

    // Polling a cada 7 segundos por até 5 minutos (43 tentativas)
    const interval = setInterval(async () => {
      try {
        const response = await getPixStatus(orderId);
        
        if (response.ok && response.status) {
          setStatus(response.status.status);
          
          if (response.status.status === "paid") {
            clearInterval(interval);
            onSuccess();
          } else if (response.status.status === "expired" || response.status.status === "canceled") {
            clearInterval(interval);
            onError("Pagamento expirado ou cancelado");
          }
        }
        
        setPollingCount(prev => prev + 1);
        
        // Parar após 5 minutos (43 tentativas * 7 segundos ≈ 5 minutos)
        if (pollingCount >= 43) {
          clearInterval(interval);
          onError("Tempo limite excedido. Atualize a página para verificar o status.");
        }
      } catch (error) {
        console.error("Erro no polling:", error);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [loading, status, orderId, pollingCount]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Gerando QR Code PIX...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-center gap-2">
        {status === "created" && (
          <>
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Aguardando pagamento</span>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-600">Pagamento confirmado!</span>
          </>
        )}
        {(status === "expired" || status === "canceled") && (
          <>
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">Pagamento expirado</span>
          </>
        )}
      </div>

      {/* QR Code */}
      {qrCodeBase64 && status === "created" && (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-border">
            {qrCodeBase64.length > 0 ? (
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-64 h-64"
                onError={(e) => {
                  console.error("❌ Erro ao carregar imagem QR Code:", {
                    src: e.currentTarget.src?.substring(0, 100),
                    qrCodeBase64Length: qrCodeBase64?.length
                  });
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log("✅ QR Code carregado com sucesso!");
                }}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-muted text-muted-foreground text-sm">
                QR Code indisponível. Use o código PIX abaixo.
              </div>
            )}
          </div>

          <p className="text-sm text-center text-muted-foreground max-w-md">
            Escaneie o QR Code com o app do seu banco ou copie o código PIX abaixo
          </p>

          {/* Código PIX copiável */}
          <div className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={qrCode}
                readOnly
                className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Aviso de polling */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Verificando pagamento automaticamente...</span>
          </div>
        </div>
      )}

      {/* Aviso legal PushinPay */}
      <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
        <p className="text-xs text-muted-foreground text-center">
          A <strong>PUSHIN PAY</strong> atua exclusivamente como processadora de pagamentos e não
          possui qualquer responsabilidade pela entrega, suporte, conteúdo, qualidade ou
          cumprimento das obrigações relacionadas aos produtos ou serviços oferecidos pelo
          vendedor.
        </p>
      </div>

      {/* Informações adicionais */}
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          Valor: <strong>R$ {(valueInCents / 100).toFixed(2)}</strong>
        </p>
        {pixId && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {pixId}
          </p>
        )}
      </div>
    </div>
  );
}
