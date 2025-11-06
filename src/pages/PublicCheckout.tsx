import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Wallet, Mail, Phone, FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import { parseJsonSafely } from "@/lib/utils";
import { loadPublicCheckoutData } from "@/hooks/usePublicCheckoutConfig";
import CheckoutComponentRenderer from "@/components/checkout/CheckoutComponentRenderer";
import PixPayment from "@/components/checkout/PixPayment";
import { ImageIcon } from "@/components/icons/ImageIcon";
import { LockIcon } from "@/components/icons/LockIcon";
import { PixIcon } from "@/components/icons/PixIcon";
import { CreditCardIcon } from "@/components/icons/CreditCardIcon";
import { CheckCircleFilledIcon } from "@/components/icons/CheckCircleFilledIcon";
import { normalizeDesign } from "@/lib/checkout/normalizeDesign";
import type { ThemePreset } from "@/lib/checkout/themePresets";

interface CheckoutData {
  id: string;
  name: string;
  slug: string;
  visits_count: number;
  seller_name?: string;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    support_name?: string;
    required_fields?: {
      name: boolean;
      email: boolean;
      phone: boolean;
      cpf: boolean;
    };
    default_payment_method?: 'pix' | 'credit_card';
  };
  font?: string;
  background_color?: string;
  text_color?: string;
  primary_color?: string;
  button_color?: string;
  button_text_color?: string;
  components?: any[];
  top_components?: any[];
  bottom_components?: any[];
  design?: any;
  theme?: string;
}

const PublicCheckout = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [design, setDesign] = useState<ThemePreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'pix' | 'credit_card'>('pix');
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
  });

  useEffect(() => {
    if (slug) {
      console.log("[PublicCheckout] v2.7 montado - slug:", slug);
      loadCheckout();
      trackVisit();
    }
  }, [slug]);

  // Aplicar tema dark/light no documento
  useEffect(() => {
    if (!checkout) return;

    const theme = checkout.theme || checkout.design?.theme || 'light';
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Cleanup ao desmontar
    return () => {
      root.classList.remove('dark');
    };
  }, [checkout]);

  // Forçar background do body e remover espaços para eliminar faixas azuis
  useEffect(() => {
    if (!design) return;
    
    // Salvar valores originais
    const originalBodyBackground = document.body.style.background;
    const originalBodyMargin = document.body.style.margin;
    const originalBodyPadding = document.body.style.padding;
    const originalHtmlMargin = document.documentElement.style.margin;
    const originalHtmlPadding = document.documentElement.style.padding;
    
    // Aplicar background do checkout e remover espaços
    document.body.style.background = design.colors.background;
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    
    // Restaurar ao desmontar
    return () => {
      document.body.style.background = originalBodyBackground;
      document.body.style.margin = originalBodyMargin;
      document.body.style.padding = originalBodyPadding;
      document.documentElement.style.margin = originalHtmlMargin;
      document.documentElement.style.padding = originalHtmlPadding;
    };
  }, [design]);

  const loadCheckout = async () => {
    try {
      setLoading(true);
      
      const { checkout: checkoutData, product, requirePhone, requireCpf, defaultMethod } = await loadPublicCheckoutData(slug!);

      const fullCheckoutData = {
        id: checkoutData.id,
        name: checkoutData.name,
        slug: checkoutData.slug,
        visits_count: checkoutData.visits_count,
        seller_name: checkoutData.seller_name,
        product: {
          ...product,
          required_fields: {
            name: true,
            email: true,
            phone: requirePhone,
            cpf: requireCpf,
          },
          default_payment_method: defaultMethod,
        },
        font: checkoutData.font,
        background_color: checkoutData.background_color,
        text_color: checkoutData.text_color,
        primary_color: checkoutData.primary_color,
        button_color: checkoutData.button_color,
        button_text_color: checkoutData.button_text_color,
        components: parseJsonSafely(checkoutData.components, []),
        top_components: parseJsonSafely(checkoutData.top_components, []),
        bottom_components: parseJsonSafely(checkoutData.bottom_components, []),
        design: parseJsonSafely(checkoutData.design, {}),
        theme: checkoutData.theme,
      };
      
      setCheckout(fullCheckoutData);
      
      // Normalizar o design para garantir todas as propriedades
      const normalizedDesign = normalizeDesign(fullCheckoutData);
      setDesign(normalizedDesign);
      
      // Define método de pagamento padrão baseado na configuração
      setSelectedPayment(defaultMethod);
    } catch (error) {
      console.error("Error:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const trackVisit = async () => {
    try {
      console.log('[trackVisit] v3.0 - Usando RPC para mapear slug:', slug);
      
      const utmParams = {
        utm_source: searchParams.get("utm_source"),
        utm_medium: searchParams.get("utm_medium"),
        utm_campaign: searchParams.get("utm_campaign"),
        utm_content: searchParams.get("utm_content"),
        utm_term: searchParams.get("utm_term"),
      };

      // Usar RPC para mapear slug → checkout_id
      const { data: mapData, error: mapError } = await supabase.rpc('get_checkout_by_payment_slug', { 
        p_slug: slug 
      });

      let checkoutId: string | null = null;

      if (!mapError && mapData && mapData.length > 0 && mapData[0]?.checkout_id) {
        checkoutId = mapData[0].checkout_id;
        console.log('[trackVisit] RPC sucesso - checkout_id:', checkoutId);
      } else {
        // Fallback: tentar buscar checkout diretamente por slug (compatibilidade)
        console.warn('[trackVisit] RPC falhou, tentando fallback...');
        const { data: checkoutData } = await supabase
          .from("checkouts")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        
        checkoutId = checkoutData?.id || null;
      }

      if (!checkoutId) {
        console.warn('[trackVisit] Não foi possível mapear slug para checkout_id');
        return;
      }

      // Inserir visita
      const { error: visitError } = await supabase
        .from("checkout_visits")
        .insert({
          checkout_id: checkoutId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          ...utmParams,
        });

      if (visitError) {
        console.error("[trackVisit] Erro ao inserir visita:", visitError);
      }

      // Incrementar contador
      await supabase.rpc("increment_checkout_visits", {
        checkout_id: checkoutId,
      });

      console.log('[trackVisit] ✅ Visita registrada com sucesso');
    } catch (error) {
      console.error("[trackVisit] Erro geral:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const errors = {
      name: "",
      email: "",
      phone: "",
      document: "",
    };

    let hasError = false;
    let firstErrorField = "";

    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
      hasError = true;
      if (!firstErrorField) firstErrorField = "name";
    }

    if (!formData.email.trim()) {
      errors.email = "E-mail é obrigatório";
      hasError = true;
      if (!firstErrorField) firstErrorField = "email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "E-mail inválido";
      hasError = true;
      if (!firstErrorField) firstErrorField = "email";
    }

    if (checkout?.product.required_fields?.phone && !formData.phone.trim()) {
      errors.phone = "Telefone é obrigatório";
      hasError = true;
      if (!firstErrorField) firstErrorField = "phone";
    }

    if (checkout?.product.required_fields?.cpf && !formData.document.trim()) {
      errors.document = "CPF é obrigatório";
      hasError = true;
      if (!firstErrorField) firstErrorField = "document";
    }

    setFormErrors(errors);

    if (hasError) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      // Scroll até o primeiro campo com erro
      setTimeout(() => {
        const firstErrorElement = document.getElementById(`field-${firstErrorField}`);
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    setProcessingPayment(true);

    try {
      // 1. Obter vendor_id (dono do produto)
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("user_id")
        .eq("id", checkout!.product.id)
        .maybeSingle();

      if (productError) {
        console.error("Erro ao buscar produto:", productError);
        throw new Error("Erro ao buscar informações do produto");
      }

      if (!productData) {
        console.error("Produto não encontrado:", checkout!.product.id);
        throw new Error("Produto não encontrado");
      }

      // 2. Calcular valor total (produto + taxa)
      // IMPORTANTE: checkout!.product.price já está em centavos!
      const productPrice = checkout!.product.price; // já é em centavos
      const serviceFee = 99; // R$ 0,99 em centavos
      const totalCents = productPrice + serviceFee;

      // 3. Criar pedido via Edge Function (seguro - bypassa RLS)
      const { data: orderResponse, error: orderError } = await supabase.functions.invoke(
        "create-order",
        {
          body: {
            vendor_id: productData.user_id,
            product_id: checkout!.product.id,
            customer_email: formData.email,
            customer_name: formData.name,
            amount_cents: totalCents,
            currency: "BRL",
            payment_method: selectedPayment,
            gateway: "pushinpay",
            status: "PENDING",
          },
        }
      );

      if (orderError || !orderResponse?.ok || !orderResponse?.order_id) {
        throw new Error(
          "Erro ao criar pedido: " + (orderError?.message || orderResponse?.error || "Erro desconhecido")
        );
      }

      // 4. Exibir componente PixPayment
      setOrderId(orderResponse.order_id);
      setShowPixPayment(true);
      toast.success("Gerando PIX...");

    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: design?.colors.background || '#FFFFFF' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: design?.colors.active || '#10B981' }} />
      </div>
    );
  }

  if (!checkout || !design) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>Checkout não encontrado</h1>
          <p style={{ color: '#6B7280' }}>O link que você acessou não existe ou foi desativado.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: design.colors.background,
      minHeight: '100vh',
      margin: 0,
      padding: 0
    }}>
      {checkout.top_components && Array.isArray(checkout.top_components) && checkout.top_components.length > 0 && (
        <div style={{ 
          width: '100%', 
          fontFamily: 'Inter, system-ui, sans-serif', 
          backgroundColor: design.colors.background 
        }}>
          {checkout.top_components.map((component: any, index: number) => (
            <CheckoutComponentRenderer key={index} component={component} design={design} />
          ))}
        </div>
      )}

      <div 
        style={{ 
          minHeight: '100vh',
          fontFamily: checkout.font || 'Inter, system-ui, sans-serif',
          backgroundColor: design.colors.background,
          color: design.colors.primaryText
        }}
      >
        <div className="max-w-4xl mx-auto px-4 lg:px-6 pt-2 pb-4 lg:pt-2 lg:pb-8">
          <div className="mx-auto">
            {/* Coluna Principal - Formulário (Esquerda no Desktop) */}
            <div className="space-y-1 min-w-0">
              {/* Header do Produto */}
              <div 
                className="rounded-xl shadow-sm p-5 mb-1" 
                style={{
                  backgroundColor: design.colors.formBackground
                }}
              >
                {/* Cabeçalho do Produto */}
                <div className="flex items-center gap-3 mb-5">
                  {checkout.product?.image_url ? (
                    <img 
                      src={checkout.product.image_url} 
                      alt={checkout.product?.name || 'Produto'}
                      className="w-16 h-16 object-cover rounded-lg border"
                      style={{ borderColor: design.colors.border }}
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center border"
                      style={{ 
                        backgroundColor: design.colors.placeholder,
                        borderColor: design.colors.border
                      }}
                    >
                      <ImageIcon 
                        className="w-6 h-6" 
                        color={design.colors.secondaryText} 
                      />
                    </div>
                  )}
                  <div>
                    <h1 
                      className="text-xl font-bold leading-tight tracking-tight"
                      style={{ color: design.colors.primaryText }}
                    >
                      {checkout.product?.name}
                    </h1>
                    <p 
                      className="text-lg font-semibold mt-1"
                      style={{ color: design.colors.primaryText }}
                    >
                      R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')} 
                      <span 
                        className="text-sm font-normal"
                        style={{ color: design.colors.secondaryText }}
                      >
                        à vista
                      </span>
                    </p>
                  </div>
                </div>

                {/* Linha separadora sutil */}
                <div className="border-t border-gray-200 my-5"></div>

                {/* Formulário de Dados */}
                <h2 
                  className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight"
                  style={{ color: design.colors.primaryText }}
                >
                  <User className="w-5 h-5" />
                  Dados necessários para envio do seu acesso:
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div id="field-name">
                    <label 
                      className="block text-sm mb-1"
                      style={{ color: design.colors.secondaryText }}
                    >
                      Nome completo
                    </label>
                    <div className="relative">
                      <User 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: design.colors.secondaryText }}
                      />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({...formData, name: e.target.value});
                          if (formErrors.name) setFormErrors({...formErrors, name: ""});
                        }}
                        placeholder="Digite seu nome completo"
                        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        style={{ 
                          borderColor: formErrors.name ? '#ef4444' : design.colors.border,
                          backgroundColor: design.colors.inputBackground || design.colors.formBackground,
                          color: design.colors.primaryText
                        }}
                        required
                      />
                    </div>
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  <div id="field-email">
                    <label 
                      className="block text-sm mb-1"
                      style={{ color: design.colors.secondaryText }}
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: design.colors.secondaryText }}
                      />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({...formData, email: e.target.value});
                          if (formErrors.email) setFormErrors({...formErrors, email: ""});
                        }}
                        placeholder="Digite seu e-mail"
                        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        style={{ 
                          borderColor: formErrors.email ? '#ef4444' : design.colors.border,
                          backgroundColor: design.colors.inputBackground || design.colors.formBackground,
                          color: design.colors.primaryText
                        }}
                        required
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                    )}
                  </div>

                  {checkout?.product.required_fields?.cpf && (
                    <div id="field-document">
                      <label 
                        className="block text-sm mb-1"
                        style={{ color: design.colors.secondaryText }}
                      >
                        CPF/CNPJ
                      </label>
                      <div className="relative">
                        <FileText 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                          style={{ color: design.colors.secondaryText }}
                        />
                        <input
                          type="text"
                          value={formData.document}
                          onChange={(e) => {
                            setFormData({...formData, document: e.target.value});
                            if (formErrors.document) setFormErrors({...formErrors, document: ""});
                          }}
                          placeholder="Digite seu CPF"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          style={{ 
                            borderColor: formErrors.document ? '#ef4444' : design.colors.border,
                            backgroundColor: design.colors.inputBackground || design.colors.formBackground,
                            color: design.colors.primaryText
                          }}
                          required
                        />
                      </div>
                      {formErrors.document && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.document}</p>
                      )}
                    </div>
                  )}

                  {checkout?.product.required_fields?.phone && (
                    <div id="field-phone">
                      <label 
                        className="block text-sm mb-1"
                        style={{ color: design.colors.secondaryText }}
                      >
                        Celular
                      </label>
                      <div className="relative">
                        <Phone 
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                          style={{ color: design.colors.secondaryText }}
                        />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({...formData, phone: e.target.value});
                            if (formErrors.phone) setFormErrors({...formErrors, phone: ""});
                          }}
                          placeholder="Digite seu telefone"
                          className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          style={{ 
                            borderColor: formErrors.phone ? '#ef4444' : design.colors.border,
                            backgroundColor: design.colors.inputBackground || design.colors.formBackground,
                            color: design.colors.primaryText
                          }}
                          required
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Métodos de Pagamento */}
              <div 
                className="rounded-xl shadow-sm p-5"
                style={{ backgroundColor: design.colors.formBackground }}
              >
                <h2 
                  className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight"
                  style={{ color: design.colors.primaryText }}
                >
                  <Wallet className="w-5 h-5" />
                  Pagamento
                </h2>
                
                <div className="space-y-2.5 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPayment('pix')}
                    onFocus={(e) => e.currentTarget.style.outline = 'none'}
                    onBlur={(e) => e.currentTarget.style.outline = 'none'}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left"
                    style={{
                      backgroundColor: design.colors.formBackground,
                      borderColor: selectedPayment === 'pix'
                        ? design.colors.active
                        : design.colors.border,
                      color: design.colors.primaryText,
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <PixIcon 
                        className="w-5 h-5" 
                        color={design.colors.primaryText}
                      />
                      <span className="font-semibold text-sm">PIX</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayment('credit_card')}
                    onFocus={(e) => e.currentTarget.style.outline = 'none'}
                    onBlur={(e) => e.currentTarget.style.outline = 'none'}
                    className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left"
                    style={{
                      backgroundColor: design.colors.formBackground,
                      borderColor: selectedPayment === 'credit_card'
                        ? design.colors.active
                        : design.colors.border,
                      color: design.colors.primaryText,
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCardIcon 
                        className="w-5 h-5" 
                        color={design.colors.primaryText}
                      />
                      <span className="font-semibold text-sm">Cartão de Crédito</span>
                    </div>
                  </button>
                </div>

                {selectedPayment === 'pix' && (
                  <>
                    <div 
                      className="border rounded-lg p-3 space-y-2 mb-4"
                      style={{ 
                        backgroundColor: design.colors.infoBox?.background || 'rgba(16, 185, 129, 0.05)',
                        borderColor: design.colors.infoBox?.border || design.colors.active
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircleFilledIcon 
                          size={18} 
                          color={design.colors.active} 
                          className="flex-shrink-0 mt-0.5" 
                        />
                        <span 
                          className="text-xs leading-relaxed font-medium"
                          style={{ color: design.colors.infoBox?.text || design.colors.primaryText }}
                        >
                          Liberação imediata
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <CheckCircleFilledIcon 
                          size={18} 
                          color={design.colors.active} 
                          className="flex-shrink-0 mt-0.5" 
                        />
                        <span 
                          className="text-xs leading-relaxed font-medium"
                          style={{ color: design.colors.infoBox?.text || design.colors.primaryText }}
                        >
                          É simples, só usar o aplicativo de seu banco para pagar Pix
                        </span>
                      </div>
                    </div>

                    {/* Resumo do Pedido - PIX */}
                    <div 
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: design.colors.orderSummary?.background || '#F9FAFB',
                        borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      <h4 
                        className="font-semibold mb-3 text-sm tracking-tight"
                        style={{ color: design.colors.orderSummary?.titleText || '#000000' }}
                      >
                        Resumo do pedido
                      </h4>
                      
                      <div className="flex items-start gap-3 mb-3">
                        {checkout.product?.image_url ? (
                          <img 
                            src={checkout.product.image_url} 
                            alt={checkout.product?.name || 'Produto'}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                        ) : (
                          <div 
                            className="w-14 h-14 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: design.colors.placeholder || 'rgba(0,0,0,0.05)' }}
                          >
                            <ImageIcon 
                              className="w-5 h-5" 
                              color={design.colors.secondaryText || '#9CA3AF'} 
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h5 
                            className="text-sm font-medium leading-tight"
                            style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                          >
                            {checkout.product?.name}
                          </h5>
                          <p 
                            className="text-base font-bold mt-0.5"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>

                      <div 
                        className="space-y-1.5 text-sm pt-2.5"
                        style={{ 
                          borderTopWidth: '1px',
                          borderTopStyle: 'solid',
                          borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB'
                        }}
                      >
                        <div className="flex justify-between">
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Produto
                          </span>
                          <span 
                            className="font-medium"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Taxa de serviço
                          </span>
                          <span 
                            className="font-medium"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ 0,99
                          </span>
                        </div>
                        <div 
                          className="flex justify-between text-sm font-bold pt-1.5"
                          style={{
                            borderTopWidth: '1px',
                            borderTopStyle: 'solid',
                            borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB'
                          }}
                        >
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Total
                          </span>
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            R$ {((checkout.product?.price / 100 || 0) + 0.99).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedPayment === 'credit_card' && (
                  <>
                    {/* Resumo do Pedido - Cartão de Crédito */}
                    <div 
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: design.colors.orderSummary?.background || '#F9FAFB',
                        borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      <h4 
                        className="font-semibold mb-3 text-sm tracking-tight"
                        style={{ color: design.colors.orderSummary?.titleText || '#000000' }}
                      >
                        Resumo do pedido
                      </h4>
                      
                      <div className="flex items-start gap-3 mb-3">
                        {checkout.product?.image_url ? (
                          <img 
                            src={checkout.product.image_url} 
                            alt={checkout.product?.name || 'Produto'}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                        ) : (
                          <div 
                            className="w-14 h-14 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: design.colors.placeholder || 'rgba(0,0,0,0.05)' }}
                          >
                            <ImageIcon 
                              className="w-5 h-5" 
                              color={design.colors.secondaryText || '#9CA3AF'} 
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h5 
                            className="text-sm font-medium leading-tight"
                            style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                          >
                            {checkout.product?.name}
                          </h5>
                          <p 
                            className="text-base font-bold mt-0.5"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>

                      <div 
                        className="space-y-1.5 text-sm pt-2.5"
                        style={{ 
                          borderTopWidth: '1px',
                          borderTopStyle: 'solid',
                          borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB'
                        }}
                      >
                        <div className="flex justify-between">
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Produto
                          </span>
                          <span 
                            className="font-medium"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Taxa de serviço
                          </span>
                          <span 
                            className="font-medium"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ 0,99
                          </span>
                        </div>
                        <div 
                          className="flex justify-between text-sm font-bold pt-1.5"
                          style={{
                            borderTopWidth: '1px',
                            borderTopStyle: 'solid',
                            borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB'
                          }}
                        >
                          <span style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}>
                            Total
                          </span>
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            R$ {((checkout.product?.price / 100 || 0) + 0.99).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>

                      <p 
                        className="text-xs mt-2"
                        style={{ color: design.colors.orderSummary?.labelText || '#6B7280' }}
                      >
                        à vista no Cartão de Crédito
                      </p>
                    </div>
                  </>
                )}

                {/* Componente PixPayment - renderizado condicionalmente */}
                {selectedPayment === 'pix' && showPixPayment && orderId && (
                  <div className="mt-6">
                    <PixPayment
                      orderId={orderId}
                      valueInCents={checkout.product.price + 99}
                      onSuccess={() => {
                        toast.success("Pagamento confirmado!");
                        // Redirecionar para página de sucesso ou obrigado
                      }}
                      onError={(error) => {
                        toast.error(error);
                        setShowPixPayment(false);
                        setProcessingPayment(false);
                      }}
                    />
                  </div>
                )}

                {/* Botão de submissão */}
                {!showPixPayment && (
                  <button
                    onClick={handleSubmit}
                    disabled={processingPayment}
                    className="w-full mt-5 py-3.5 rounded-lg font-bold text-base transition-all duration-200 shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: design.colors.button?.background || design.colors.active || '#10B981',
                      color: design.colors.button?.text || '#FFFFFF'
                    }}
                  >
                    {processingPayment ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </div>
                    ) : (
                      selectedPayment === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão de Crédito'
                    )}
                  </button>
                )}

                {/* Mini Footer - Security and Copyright */}
                <div className="mt-8 space-y-4">
                  {/* Security badge */}
                  <div className="flex items-center justify-center gap-2 py-3">
                    <Lock className="w-4 h-4" style={{ color: design.colors.active || '#10b981' }} />
                    <span className="text-sm font-medium" style={{ color: design.colors.secondaryText }}>
                      Transação Segura e Criptografada
                    </span>
                  </div>
                  
                  {/* Copyright */}
                  <div className="border-t pt-4" style={{ borderColor: design.colors.border }}>
                    <p className="text-xs text-center" style={{ color: design.colors.secondaryText, opacity: 0.7 }}>
                      © 2025 ggCheckout LTDA. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {checkout.bottom_components && Array.isArray(checkout.bottom_components) && checkout.bottom_components.length > 0 && (
        <div className="w-full" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: design.colors.background }}>
          {checkout.bottom_components.map((component: any, index: number) => (
            <CheckoutComponentRenderer key={index} component={component} design={design} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicCheckout;

