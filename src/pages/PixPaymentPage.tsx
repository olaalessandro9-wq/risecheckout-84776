import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Copy, CheckCircle2, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { QRCanvas } from "@/components/pix/QRCanvas";
import { sendUTMifyConversion, formatDateForUTMify } from "@/lib/utmify-helper";

export const PixPaymentPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [pixId, setPixId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"waiting" | "paid" | "expired">("waiting");
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(900); // 15 minutos = 900 segundos
  const [orderData, setOrderData] = useState<any>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const hasShownExpiredToast = useRef(false);
  const expiresAt = useRef<number>(0);

  // Buscar dados do pedido com retry usando Edge Function
  const fetchOrderData = useCallback(async (retryCount = 0) => {
    try {
      console.log(`[PixPaymentPage] Buscando pedido (tentativa ${retryCount + 1}):`, orderId);
      
      const { data, error } = await supabase.functions.invoke("get-order-for-pix", {
        body: { orderId },
      });

      if (error || !data?.order) {
        // Se não encontrou e ainda tem tentativas, aguarda e tenta novamente
        if (retryCount < 3) {
          console.log(`[PixPaymentPage] Pedido não encontrado, tentando novamente em 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchOrderData(retryCount + 1);
        }
        throw new Error(error?.message || "Pedido não encontrado");
      }
      
      console.log("[PixPaymentPage] Pedido encontrado:", data.order);
      setOrderData(data.order);
    } catch (err: any) {
      console.error("[PixPaymentPage] Erro ao buscar pedido:", err);
      toast.error("Erro ao carregar dados do pedido");
    }
  }, [orderId]);

  // Criar cobrança PIX
  const createPixCharge = useCallback(async () => {
    if (!orderId || !orderData) {
      console.log("[PixPaymentPage] Aguardando dados:", { orderId, orderData: !!orderData });
      return;
    }

    setLoading(true);
    setPaymentStatus("waiting");
    hasShownExpiredToast.current = false;

    try {
      console.log("[PixPaymentPage] Criando cobrança PIX:", { 
        orderId, 
        valueInCents: orderData.amount_cents,
        orderData 
      });

      const { data, error } = await supabase.functions.invoke("pushinpay-create-pix", {
        body: { orderId, valueInCents: orderData.amount_cents },
      });

      console.log("[PixPaymentPage] Resposta da Edge Function:", { data, error });

      if (error) {
        console.error("[PixPaymentPage] Erro da Edge Function:", error);
        throw new Error(error.message || "Erro ao criar cobrança PIX");
      }

      if (!data?.ok) {
        console.error("[PixPaymentPage] Resposta não OK:", data);
        throw new Error(data?.error || "Erro ao criar cobrança PIX");
      }

      if (!data?.pix) {
        console.error("[PixPaymentPage] Sem dados do PIX:", data);
        throw new Error("Dados do PIX não retornados");
      }

      const { pix } = data;
      console.log("[PixPaymentPage] PIX criado com sucesso:", pix);
      
      setPixId(pix.id || pix.pix_id || "");
      setQrCode(pix.qr_code || pix.qrcode || pix.emv || "");
      
      // Definir expiração em 15 minutos
      expiresAt.current = Date.now() + 15 * 60 * 1000;
      setTimeRemaining(900); // 15:00
      
      setLoading(false);
      toast.success("QR Code gerado com sucesso!");
    } catch (err: any) {
      console.error("[PixPaymentPage] Erro ao criar PIX:", err);
      toast.error(err.message || "Erro ao gerar QR Code");
      setLoading(false);
    }
  }, [orderId, orderData]);

  // Buscar dados do pedido ao montar
  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  // Criar cobrança quando orderData estiver disponível
  useEffect(() => {
    if (orderData && !qrCode) {
      createPixCharge();
    }
  }, [orderData, qrCode, createPixCharge]);

  // Função para verificar status do pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (!pixId || !orderId) return { paid: false };

    try {
      const { data, error } = await supabase.functions.invoke("pushinpay-get-status", {
        body: { orderId },
      });

      if (error || !data?.ok) return { paid: false };

      if (data?.status?.status === "paid") {
        setPaymentStatus("paid");
        toast.success("Pagamento confirmado!");
        
        // Atualizar status na UTMify para "paid"
        if (orderData) {
          // Transformar product (singular) em products (array)
          const productsArray = orderData.product ? [{
            id: orderData.product.id,
            name: orderData.product.name,
            priceInCents: orderData.amount_cents || 0,
            quantity: 1
          }] : [];
          
          const productId = orderData.product?.id || orderData.product_id || null;
          
          console.log("[UTMify] Enviando conversão com productId:", productId, "products:", productsArray);
          
          sendUTMifyConversion(
            orderData.vendor_id,
            {
              orderId: orderId!,
              paymentMethod: "pix",
              status: "paid",
              createdAt: formatDateForUTMify(orderData.created_at || new Date()),
              approvedDate: formatDateForUTMify(new Date()),
              refundedAt: null,
              customer: {
                name: orderData.customer_name || "",
                email: orderData.customer_email || "",
                phone: orderData.customer_phone || null,
                document: orderData.customer_document || null,
                country: "BR",
                ip: "0.0.0.0"
              },
              products: productsArray,
              trackingParameters: orderData.tracking_parameters || {},
              totalPriceInCents: orderData.amount_cents || 0,
              commission: {
                totalPriceInCents: orderData.amount_cents || 0,
                gatewayFeeInCents: 0,
                userCommissionInCents: orderData.amount_cents || 0,
                currency: "BRL"
              },
              isTest: false
            },
            "purchase_approved",
            productId
          ).catch(err => {
            console.error("[UTMify] Não foi possível atualizar status:", err);
          });
        }
        
        // Redirecionar para página de sucesso após 2 segundos
        setTimeout(() => {
          navigate(`/success/${orderId}`);
        }, 2000);
        
        return { paid: true };
      } else if (data?.status?.status === "expired" || data?.status?.status === "canceled") {
        setPaymentStatus("expired");
        setTimeRemaining(0);
        return { paid: false };
      }
      
      return { paid: false };
    } catch (err) {
      console.error("[PixPaymentPage] Erro ao verificar status:", err);
      return { paid: false };
    }
  }, [pixId, orderId, orderData, navigate]);

  // Polling automático do status do pagamento a cada 10 segundos
  useEffect(() => {
    if (!pixId || paymentStatus !== "waiting" || timeRemaining <= 0) return;

    const poll = async () => {
      await checkPaymentStatus();
    };

    // Verificação automática a cada 10 segundos
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [pixId, paymentStatus, timeRemaining, checkPaymentStatus]);

  // Countdown: 15min -> 8min (sempre), abaixo de 8min (só quando na página)
  useEffect(() => {
    if (timeRemaining <= 0 || paymentStatus !== "waiting") return;

    const THRESHOLD = 480; // 8 minutos em segundos

    // Referência para o intervalo
    let intervalRef: { current: NodeJS.Timeout | null } = { current: null };

    // Função para iniciar/retomar contagem
    const startCountdown = () => {
      if (intervalRef.current) return; // Já está rodando
      
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          if (newTime <= 0) {
            setPaymentStatus("expired");
            if (!hasShownExpiredToast.current) {
              toast.error("QR Code expirado!");
              hasShownExpiredToast.current = true;
            }
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    };

    // Função para pausar contagem
    const pauseCountdown = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Função para verificar se a página está visível
    const handleVisibilityChange = () => {
      // Só pausa se estiver ABAIXO de 8 minutos
      if (timeRemaining <= THRESHOLD) {
        if (document.hidden) {
          // Página ficou oculta, pausar contador
          pauseCountdown();
        } else {
          // Página ficou visível, retomar contador
          if (timeRemaining > 0 && paymentStatus === "waiting") {
            startCountdown();
          }
        }
      }
    };

    // Iniciar contador
    // Se acima de 8min: sempre conta
    // Se abaixo de 8min: só conta se página visível
    if (timeRemaining > THRESHOLD) {
      startCountdown();
    } else {
      if (!document.hidden) {
        startCountdown();
      }
    }

    // Adicionar listener para mudanças de visibilidade
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      pauseCountdown();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timeRemaining, paymentStatus]);

  // Copiar código PIX
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar código");
    }
  };

  // Formatar tempo MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular porcentagem da barra de progresso
  const progressPercentage = (timeRemaining / 900) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white">Gerando código PIX...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Botão Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white hover:text-gray-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar e editar o pedido</span>
        </button>

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {paymentStatus === "paid" ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Pagamento confirmado!</h2>
              <p className="text-gray-600">Redirecionando...</p>
            </div>
          ) : paymentStatus === "expired" ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">QR Code expirado</h2>
              <p className="text-gray-600">O tempo limite de 15 minutos foi atingido.</p>
              <Button onClick={createPixCharge} size="lg">
                Gerar novo QR Code
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Aqui está o PIX copia e cola
              </h1>

              <p className="text-gray-700 mb-6 text-center">
                Copie o código ou use a câmera para ler o QR Code e realize o pagamento no app do seu banco.
              </p>

              {/* Código PIX com botão Copiar */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrCode}
                    readOnly
                    className="flex-1 rounded-md border border-gray-300 bg-green-50 px-4 py-3 text-sm font-mono text-gray-900"
                  />
                  <Button
                    onClick={copyToClipboard}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white px-6"
                    size="lg"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Botão Confirmar pagamento */}
              <Button
                onClick={async () => {
                  setCheckingPayment(true);
                  const result = await checkPaymentStatus();
                  setCheckingPayment(false);
                  
                  if (!result.paid) {
                    toast.error(
                      "Pagamento ainda não confirmado. Se você já pagou, aguarde até 30 segundos e clique novamente.",
                      { duration: 5000 }
                    );
                  }
                }}
                disabled={checkingPayment}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white mb-6 disabled:opacity-50"
                size="lg"
              >
                {checkingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirmar pagamento
                  </>
                )}
              </Button>

              {/* Barra de progresso com texto */}
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  Faltam <strong>{formatTime(timeRemaining)}</strong> minutos para o pagamento expirar...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gray-900 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* QR Code em card separado */}
              <div className="flex justify-center mb-8">
                <div className="p-6 bg-white border-2 border-gray-200 rounded-lg shadow-md">
                  <QRCanvas value={qrCode} size={280} />
                </div>
              </div>

              {/* Instruções */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Para realizar o pagamento:</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </span>
                    <span>Abra o aplicativo do seu banco.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </span>
                    <span>
                      Escolha a opção PIX e cole o código ou use a câmera do celular para pagar com QR Code.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </span>
                    <span>Confirme as informações e finalize o pagamento.</span>
                  </li>
                </ol>
              </div>
            </>
          )}
        </div>


      </div>
    </div>
  );
};

export default PixPaymentPage;
