import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, CheckCircle2, Clock, XCircle, RefreshCw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PushinPayLegal } from "../pix/PushinPayLegal";
import { QRCanvas } from "../pix/QRCanvas";

interface PixPaymentProps {
  orderId: string;
  valueInCents: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const PixPayment = ({ orderId, valueInCents, onSuccess, onError }: PixPaymentProps) => {
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [pixId, setPixId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "paid" | "expired" | "error">("waiting");
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Criar cobrança PIX
  const createPixCharge = useCallback(async () => {
    setLoading(true);
    setPaymentStatus("waiting");
    setIsExpired(false);

    try {
      console.log("[PixPayment] Criando cobrança PIX:", { orderId, valueInCents });

      const { data, error } = await supabase.functions.invoke("pushinpay-create-pix", {
        body: { orderId, valueInCents },
      });

      if (error) {
        console.error("[PixPayment] Erro ao criar cobrança:", error);
        setPaymentStatus("error");
        onError?.(`Erro ao criar cobrança PIX: ${error.message}`);
        toast.error("Erro ao criar cobrança PIX");
        return;
      }

      if (!data?.ok || !data?.pix) {
        console.error("[PixPayment] Resposta inválida:", data);
        setPaymentStatus("error");
        onError?.("Erro ao processar resposta do pagamento");
        toast.error("Erro ao processar pagamento");
        return;
      }

      const { pix } = data;
      console.log("[PixPayment] PIX criado:", {
        id: pix.id || pix.pix_id,
        hasQrCode: !!pix.qr_code,
      });

      setPixId(pix.id || pix.pix_id);
      setQrCode(pix.qr_code || "");
      
      // Definir expiração em 15 minutos
      const expirationTime = Date.now() + 15 * 60 * 1000;
      setExpiresAt(expirationTime);
      
      // Inicializar countdown imediatamente
      const remaining = Math.floor((expirationTime - Date.now()) / 1000);
      setTimeRemaining(remaining);
      console.log("[PixPayment] v2.7 - QR criado, expira em 15:00");

      setLoading(false);
      toast.success("QR Code gerado com sucesso!");
    } catch (err) {
      console.error("[PixPayment] Erro inesperado:", err);
      setPaymentStatus("error");
      onError?.("Erro inesperado ao criar cobrança PIX");
      toast.error("Erro inesperado ao criar PIX");
      setLoading(false);
    }
  }, [orderId, valueInCents, onError]);

  // Criar cobrança ao montar
  useEffect(() => {
    createPixCharge();
  }, [createPixCharge]);

  // Log de versão ao montar componente
  useEffect(() => {
    console.log("[PixPayment] v2.7 montado");
  }, []);

  // Polling do status do pagamento (a cada 5s, conforme recomendação PushinPay)
  useEffect(() => {
    if (!pixId || paymentStatus !== "waiting" || isExpired) {
      console.log("[PixPayment] Polling não iniciado:", { pixId, paymentStatus, isExpired });
      return;
    }

    console.log("[PixPayment] ✅ Iniciando polling a cada 5s (documentação PushinPay)");
    let attemptCount = 0;
    const maxAttempts = 30; // 30 tentativas × 5s = 2.5 minutos
    let currentInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
      attemptCount++;
      console.log(`[PixPayment] 🔍 Polling tentativa ${attemptCount}/${maxAttempts}`);

      if (attemptCount > maxAttempts) {
        console.warn("[PixPayment] ⚠️ Limite de tentativas atingido, parando polling");
        if (currentInterval) {
          clearInterval(currentInterval);
          currentInterval = null;
        }
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("pushinpay-get-status", {
          body: { orderId },
        });

        if (error) {
          console.error("[PixPayment] ❌ Erro ao verificar status:", error);
          setFailedAttempts(prev => prev + 1);
          return;
        }

        if (data?.ok === false) {
          console.warn("[PixPayment] ⚠️ Status desconhecido retornado");
          setFailedAttempts(prev => prev + 1);
          return;
        }

        // Resetar tentativas em caso de sucesso
        setFailedAttempts(0);

        console.log("[PixPayment] 📊 Status recebido:", data?.status?.status);

        if (data?.status?.status === "paid") {
          console.log("[PixPayment] ✅ Pagamento confirmado!");
          setPaymentStatus("paid");
          if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
          }
          toast.success("Pagamento confirmado!");
          onSuccess?.();
        } else if (data?.status?.status === "expired" || data?.status?.status === "canceled") {
          console.log("[PixPayment] ⏰ Pagamento expirado/cancelado");
          setPaymentStatus("expired");
          setIsExpired(true);
          if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
          }
        }
      } catch (err) {
        console.error("[PixPayment] ❌ Erro no polling:", err);
        setFailedAttempts(prev => prev + 1);
      }
    };

    // Executar primeira verificação imediatamente
    poll();

    // Depois continuar verificando a cada 5 segundos (conforme documentação PushinPay)
    currentInterval = setInterval(poll, 5000);
    setPollingInterval(currentInterval);

    return () => {
      console.log("[PixPayment] 🛑 Limpando polling interval");
      if (currentInterval) clearInterval(currentInterval);
    };
  }, [pixId, paymentStatus, isExpired, orderId, onSuccess]);


  // Verificar expiração local e atualizar countdown
  // Gerenciar countdown de expiração (15 minutos)
  useEffect(() => {
    if (!expiresAt) {
      console.log("[PixPayment] ⏱️ Countdown não iniciado: expiresAt não definido");
      return;
    }

    console.log("[PixPayment] ⏱️ Iniciando countdown de 15 minutos");
    
    const checkExpiration = setInterval(() => {
      const remaining = Math.floor((expiresAt - Date.now()) / 1000);
      
      if (remaining <= 0) {
        console.log("[PixPayment] ⏰ Expirado localmente após 15min");
        setTimeRemaining(0);
        setPaymentStatus("expired");
        setIsExpired(true);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        toast.error("QR Code expirado após 15 minutos");
      } else {
        setTimeRemaining(remaining);
        console.log(`[PixPayment] ⏱️ Tempo restante: ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => {
      console.log("[PixPayment] 🛑 Limpando countdown interval");
      clearInterval(checkExpiration);
    };
  }, [expiresAt, pollingInterval]);

  // Copiar código PIX
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[PixPayment] Erro ao copiar:", err);
      toast.error("Erro ao copiar código");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Gerando código PIX...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Status do Pagamento com Countdown Inline */}
      <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-muted">
        {paymentStatus === "waiting" && !isExpired && (
          <>
            <Timer className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="text-sm font-medium">
              Aguardando pagamento — expira em {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </>
        )}
        {paymentStatus === "paid" && (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium">Pagamento confirmado!</span>
          </>
        )}
        {(paymentStatus === "expired" || isExpired) && (
          <>
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium">Cobrança expirada</span>
          </>
        )}
      </div>

      {/* QR Code via Canvas */}
      {qrCode && paymentStatus === "waiting" && !isExpired && (
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-lg shadow-lg">
            <QRCanvas value={qrCode} size={256} />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Escaneie o QR Code com o app do seu banco
          </p>
        </div>
      )}

      {/* Botão Gerar Novo QR (quando expirado) */}
      {isExpired && paymentStatus === "expired" && (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            O QR Code expirou após 15 minutos.
          </p>
          <Button 
            onClick={createPixCharge}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Gerar novo QR Code
          </Button>
        </div>
      )}

      {/* Código PIX - Copiar e Colar */}
      {qrCode && paymentStatus === "waiting" && !isExpired && (
        <div className="flex flex-col items-center space-y-2">
          <p className="text-xs text-muted-foreground">Ou copie o código PIX:</p>
          <div className="w-full max-w-md flex gap-2">
            <input
              type="text"
              value={qrCode}
              readOnly
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Aviso Legal PushinPay */}
      <PushinPayLegal />

      {/* Informações adicionais */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
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
};

export default PixPayment;
