import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Wallet, Mail, Phone, FileText, Lock, Zap, CheckCircle } from "lucide-react";
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
import { FacebookPixel, FacebookPixelEvents } from "@/components/FacebookPixel";
import { useFacebookPixelIntegration } from "@/hooks/useVendorIntegrations";
import { trackViewContent, trackInitiateCheckout, trackAddToCart, trackPurchase } from "@/lib/facebook-pixel-helpers";
import { sendPurchaseToFacebookConversionsAPI } from "@/lib/facebook-conversions-api";

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
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [design, setDesign] = useState<ThemePreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'pix' | 'credit_card'>('pix');
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderBumps, setOrderBumps] = useState<any[]>([]);
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [viewContentTracked, setViewContentTracked] = useState(false);
  const [initiateCheckoutTracked, setInitiateCheckoutTracked] = useState(false);

  // Carregar integração do Facebook Pixel
  const { pixelId, isActive: pixelActive } = useFacebookPixelIntegration(vendorId || undefined);

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
      
      const { checkout: checkoutData, product, requirePhone, requireCpf, defaultMethod, vendorId: loadedVendorId } = await loadPublicCheckoutData(slug!);

      // Armazenar vendor_id para carregar integrações
      if (loadedVendorId) {
        setVendorId(loadedVendorId);
      }

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
      
      // Carregar order bumps
      await loadOrderBumps(checkoutData.id);
      
      // Disparar evento PageView do Facebook Pixel
      setTimeout(() => {
        FacebookPixelEvents.pageView();
      }, 500);
    } catch (error) {
      console.error("Error:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderBumps = async (checkoutId: string) => {
    try {
      const { data, error } = await supabase
        .from("order_bumps")
        .select(`
          id,
          call_to_action,
          custom_title,
          custom_description,
          discount_enabled,
          discount_price,
          show_image,
          product_id,
          offer_id
        `)
        .eq("checkout_id", checkoutId)
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) throw error;

      // Buscar dados dos produtos e ofertas
      const bumpsWithDetails = await Promise.all(
        (data || []).map(async (bump: any) => {
          let product = null;
          let offer = null;
          let price = 0;
          let originalPrice = null;

          if (bump.product_id) {
            const { data: productData } = await supabase
              .from("products")
              .select("id, name, description, price, image_url")
              .eq("id", bump.product_id)
              .maybeSingle();
            product = productData;
          }

          if (bump.offer_id) {
            const { data: offerData } = await supabase
              .from("offers")
              .select("id, name, price")
              .eq("id", bump.offer_id)
              .maybeSingle();
            offer = offerData;
            price = offer?.price || 0;
          } else if (product) {
            price = product.price || 0;
          }

          // Se tem desconto habilitado, usar o preço de desconto
          if (bump.discount_enabled && bump.discount_price) {
            originalPrice = price;
            price = bump.discount_price;
          }

          // Priorizar custom_title e custom_description quando preenchidos
          return {
            id: bump.id,
            name: bump.custom_title || product?.name || offer?.name || "Produto",
            description: bump.custom_description || product?.description || "",
            price: price,
            original_price: originalPrice,
            image_url: bump.show_image ? product?.image_url : null,
            call_to_action: bump.call_to_action,
            product: product,
            offer: offer,
          };
        })
      );

      setOrderBumps(bumpsWithDetails);
    } catch (error) {
      console.error("[OrderBumps] Erro ao carregar:", error);
    }
  };

  const toggleBump = (bumpId: string) => {
    setSelectedBumps(prev => {
      const newSet = new Set(prev);
      const isAdding = !newSet.has(bumpId);
      
      if (newSet.has(bumpId)) {
        newSet.delete(bumpId);
      } else {
        newSet.add(bumpId);
        
        // Disparar evento AddToCart quando bump é adicionado
        const bump = orderBumps.find(b => b.id === bumpId);
        if (bump) {
          trackAddToCart(bump);
        }
      }
      return newSet;
    });
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

    // Disparar evento InitiateCheckout
    trackInitiateCheckout(checkout, selectedBumps, orderBumps, initiateCheckoutTracked, setInitiateCheckoutTracked);

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

      // 2. Calcular valor total (produto + order bumps)
      // IMPORTANTE: checkout!.product.price já está em centavos!
      const productPrice = checkout!.product.price; // já é em centavos
      
      const selectedBumpsTotal = Array.from(selectedBumps).reduce((total, bumpId) => {
        const bump = orderBumps.find(b => b.id === bumpId);
        return total + (bump ? Number(bump.price) : 0);
      }, 0);
      
      const totalCents = productPrice + selectedBumpsTotal;

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
            order_bumps: Array.from(selectedBumps).map(bumpId => {
              const bump = orderBumps.find(b => b.id === bumpId);
              return {
                order_bump_id: bumpId,
                product_id: bump?.product?.id,
                offer_id: bump?.offer?.id,
                price: bump?.price
              };
            })
          },
        }
      );

      if (orderError || !orderResponse?.ok || !orderResponse?.order_id) {
        throw new Error(
          "Erro ao criar pedido: " + (orderError?.message || orderResponse?.error || "Erro desconhecido")
        );
      }

      // 4. Disparar evento Purchase (client-side)
      trackPurchase(checkout, orderResponse.order_id, totalCents);

      // 5. Enviar evento Purchase para Conversions API (server-side)
      sendPurchaseToFacebookConversionsAPI({
        vendor_id: productData.user_id,
        order_id: orderResponse.order_id,
        customer_email: formData.email,
        customer_name: formData.name,
        customer_phone: formData.phone,
        amount_cents: totalCents,
        currency: "BRL",
        product_id: checkout!.product.id,
        product_name: checkout!.product.name,
      }).catch(err => {
        console.error("[Conversions API] Não foi possível enviar evento:", err);
      });

      // 6. Redirecionar para página dedicada do PIX
      setOrderId(orderResponse.order_id);
      toast.success("Gerando PIX...");
      
      // Redirecionar para página dedicada após 1500ms (aguardar commit do banco)
      setTimeout(() => {
        navigate(`/pay/pix/${orderResponse.order_id}`);
      }, 1500);

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

  // useEffect para disparar evento ViewContent quando checkout carregar
  useEffect(() => {
    if (checkout && !viewContentTracked) {
      // Aguardar um pouco para garantir que o pixel foi inicializado
      setTimeout(() => {
        trackViewContent(checkout, viewContentTracked, setViewContentTracked);
      }, 1000);
    }
  }, [checkout, viewContentTracked]);

  return (
    <>
      {/* Injetar Facebook Pixel se configurado */}
      {pixelId && pixelActive && (
        <FacebookPixel pixelId={pixelId} enabled={true} />
      )}
      
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
                    </p>
                    <p 
                      className="text-xs mt-0.5"
                      style={{ color: design.colors.secondaryText }}
                    >
                      à vista
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

                {/* Mensagem PIX - aparece ANTES dos order bumps */}
                {selectedPayment === 'pix' && (
                  <div 
                    className="rounded-lg p-4 space-y-2 mt-4"
                    style={{
                      backgroundColor: design.colors.active + '15',
                      borderLeft: `4px solid ${design.colors.active}`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" style={{ color: design.colors.active }} />
                      <span className="font-semibold" style={{ color: design.colors.primaryText }}>
                        Liberação imediata
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: design.colors.secondaryText }}>
                      É simples, só usar o aplicativo de seu banco para pagar Pix
                    </p>
                  </div>
                )}

                {/* NOVA SEÇÃO: Ofertas limitadas */}
                {orderBumps.length > 0 && (
                  <div className="mt-12 mb-6 md:mb-8">
                    <h3 
                      className="text-lg font-bold mb-3 flex items-center gap-2"
                      style={{ color: design.colors.primaryText }}
                    >
                      <Zap 
                        className="w-5 h-5"
                        style={{ color: design.colors.active }}
                      />
                      Ofertas limitadas
                    </h3>
                    
                    <div className="space-y-4">
                      {orderBumps.map((bump) => (
                        <div
                          key={bump.id}
                          className="rounded-xl overflow-hidden"
                          style={{
                            border: selectedBumps.has(bump.id)
                              ? `2px solid ${design.colors.active}`
                              : 'none',
                            transition: 'none',
                          }}
                        >
                          {/* Cabeçalho - Call to Action */}
                          {bump.call_to_action && (
                            <div 
                              className="px-3 py-2 flex items-center gap-2"
                              style={{ 
                                backgroundColor: selectedBumps.has(bump.id) 
                                  ? design.colors.active + "25" 
                                  : design.colors.orderBump?.headerBackground || 'rgba(255,255,255,0.15)',
                                transition: 'none'
                              }}
                            >
                              <h5 
                                className="text-xs md:text-sm font-bold uppercase tracking-wide"
                                style={{ color: design.colors.orderBump?.headerText || design.colors.active }}
                              >
                                {bump.call_to_action}
                              </h5>
                              <div className="ml-auto">
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ 
                                    backgroundColor: selectedBumps.has(bump.id) 
                                      ? design.colors.active 
                                      : "rgba(0,0,0,0.2)"
                                  }}
                                >
                                  <svg 
                                    className="w-4 h-4" 
                                    fill="none" 
                                    stroke="white" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Conteúdo Principal */}
                          <div 
                            className="px-4 py-4 cursor-pointer"
                            style={{ backgroundColor: design.colors.orderBump?.contentBackground || design.colors.formBackground }}
                            onClick={() => toggleBump(bump.id)}
                          >
                            <div className="flex items-start gap-3">
                              {/* Imagem (condicional) */}
                              {bump.image_url && (
                                <img
                                  src={bump.image_url}
                                  alt={bump.name}
                                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                />
                              )}
                              
                              <div className="flex-1 min-w-0">
                                {/* Título */}
                                <h5
                                  className="font-bold text-sm md:text-base mb-1.5 leading-tight"
                                  style={{ color: design.colors.orderBump?.titleText || design.colors.primaryText }}
                                >
                                  {bump.name}
                                </h5>
                                
                                {/* Descrição - sempre visível */}
                                {bump.description && (
                                  <p
                                    className="text-xs md:text-sm mb-2.5 leading-relaxed"
                                    style={{ color: design.colors.orderBump?.descriptionText || design.colors.secondaryText }}
                                  >
                                    {bump.description}
                                  </p>
                                )}
                                
                                {/* Preço */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {bump.original_price ? (
                                    <>
                                      <span 
                                        className="text-xs md:text-sm line-through" 
                                        style={{ color: design.colors.secondaryText }}
                                      >
                                        R$ {(bump.original_price / 100).toFixed(2).replace('.', ',')}
                                      </span>
                                      <span 
                                        className="text-lg md:text-xl font-bold" 
                                        style={{ color: design.colors.orderBump?.priceText || design.colors.active }}
                                      >
                                        R$ {(bump.price / 100).toFixed(2).replace('.', ',')}
                                      </span>
                                    </>
                                  ) : (
                                    <span 
                                      className="text-lg md:text-xl font-bold" 
                                      style={{ color: design.colors.orderBump?.priceText || design.colors.active }}
                                    >
                                      R$ {(bump.price / 100).toFixed(2).replace('.', ',')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Rodapé - Adicionar Produto */}
                          <div 
                            className="px-3 py-2 flex items-center gap-3 cursor-pointer"
                            style={{ 
                              backgroundColor: selectedBumps.has(bump.id) 
                                ? design.colors.active + "25" 
                                : design.colors.orderBump?.footerBackground || 'rgba(255,255,255,0.15)',
                              transition: 'none'
                            }}
                            onClick={() => toggleBump(bump.id)}
                          >
                            <div 
                              className="w-5 h-5 rounded border-2 cursor-pointer flex-shrink-0 flex items-center justify-center"
                              style={{ 
                                backgroundColor: selectedBumps.has(bump.id) ? design.colors.active : 'transparent',
                                borderColor: selectedBumps.has(bump.id) ? design.colors.active : design.colors.border
                              }}
                            >
                              {selectedBumps.has(bump.id) && (
                                <svg 
                                  className="w-3 h-3" 
                                  fill="none" 
                                  stroke="white" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span 
                              className="text-sm md:text-base font-semibold"
                              style={{ color: design.colors.orderBump?.footerText || design.colors.primaryText }}
                            >
                              Adicionar Produto
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPayment === 'pix' && (
                  <>
                    {/* Resumo do Pedido - PIX - DINÂMICO */}
                    <h4 
                      className="font-semibold mb-3 text-base tracking-tight mt-16"
                      style={{ color: design.colors.orderSummary?.titleText || '#000000' }}
                    >
                      Resumo do pedido
                    </h4>
                    <div 
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: design.colors.orderSummary?.background || '#F9FAFB',
                        borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      
                      {/* Produto Principal */}
                      <div className="flex items-start gap-3 mb-3 pb-3 border-b" style={{ borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}>
                        {checkout.product?.image_url ? (
                          <img 
                            src={checkout.product.image_url} 
                            alt={checkout.product?.name || 'Produto'}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: design.colors.placeholder || 'rgba(0,0,0,0.05)' }}
                          >
                            <ImageIcon 
                              className="w-6 h-6" 
                              color={design.colors.secondaryText || '#9CA3AF'} 
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                          <h5 
                            className="text-sm font-medium leading-tight"
                            style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                          >
                            {checkout.product?.name}
                          </h5>
                          <p 
                            className="text-sm font-bold whitespace-nowrap"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>

                      {/* Order Bumps Selecionados */}
                      {selectedBumps.size > 0 && (
                        <div className="space-y-2 mb-3 pb-3 border-b" style={{ borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}>
                          {Array.from(selectedBumps).map(bumpId => {
                            const bump = orderBumps.find(b => b.id === bumpId);
                            if (!bump) return null;
                            
                            return (
                              <div key={bumpId} className="flex items-start gap-3">
                                {bump.image_url && (
                                  <img
                                    src={bump.image_url}
                                    alt={bump.name}
                                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                  <p 
                                    className="text-sm font-medium leading-tight line-clamp-1"
                                    style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                                  >
                                    {bump.name}
                                  </p>
                                  <p 
                                    className="text-sm font-bold whitespace-nowrap"
                                    style={{ color: design.colors.active }}
                                  >
                                    R$ {(bump.price / 100).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Totais */}
                      <div className="space-y-1.5 text-sm">
                        <div 
                          className="flex justify-between text-base font-bold pt-2 border-t"
                          style={{ borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}
                        >
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            Total
                          </span>
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            R$ {((checkout.product?.price / 100 || 0) + (Array.from(selectedBumps).reduce((total, bumpId) => {
                              const bump = orderBumps.find(b => b.id === bumpId);
                              return total + (bump ? Number(bump.price) / 100 : 0);
                            }, 0))).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedPayment === 'credit_card' && (
                  <>
                    {/* Resumo do Pedido - Cartão - DINÂMICO */}
                    <h4 
                      className="font-semibold mb-3 text-base tracking-tight mt-16"
                      style={{ color: design.colors.orderSummary?.titleText || '#000000' }}
                    >
                      Resumo do pedido
                    </h4>
                    <div 
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: design.colors.orderSummary?.background || '#F9FAFB',
                        borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      
                      {/* Produto Principal */}
                      <div className="flex items-start gap-3 mb-3 pb-3 border-b" style={{ borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}>
                        {checkout.product?.image_url ? (
                          <img 
                            src={checkout.product.image_url} 
                            alt={checkout.product?.name || 'Produto'}
                            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: design.colors.placeholder || 'rgba(0,0,0,0.05)' }}
                          >
                            <ImageIcon 
                              className="w-5 h-5" 
                              color={design.colors.secondaryText || '#9CA3AF'} 
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                          <h5 
                            className="text-sm font-medium leading-tight"
                            style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                          >
                            {checkout.product?.name}
                          </h5>
                          <p 
                            className="text-sm font-bold whitespace-nowrap"
                            style={{ color: design.colors.orderSummary?.priceText || '#000000' }}
                          >
                            R$ {(checkout.product?.price / 100)?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      </div>

                      {/* Order Bumps Selecionados */}
                      {selectedBumps.size > 0 && (
                        <div className="space-y-2 mb-3 pb-3 border-b" style={{ borderColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}>
                          {Array.from(selectedBumps).map(bumpId => {
                            const bump = orderBumps.find(b => b.id === bumpId);
                            if (!bump) return null;
                            
                            return (
                              <div key={bumpId} className="flex items-start gap-3">
                                {bump.image_url && (
                                  <img
                                    src={bump.image_url}
                                    alt={bump.name}
                                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                                  <p 
                                    className="text-sm font-medium leading-tight line-clamp-1"
                                    style={{ color: design.colors.orderSummary?.productName || '#000000' }}
                                  >
                                    {bump.name}
                                  </p>
                                  <p 
                                    className="text-sm font-bold whitespace-nowrap"
                                    style={{ color: design.colors.active }}
                                  >
                                    R$ {(bump.price / 100).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Totais */}
                      <div className="space-y-1.5 text-sm">
                        <div 
                          className="flex justify-between text-base font-bold pt-2 border-t"
                          style={{ borderTopColor: design.colors.orderSummary?.borderColor || '#D1D5DB' }}
                        >
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            Total
                          </span>
                          <span style={{ color: design.colors.orderSummary?.priceText || '#000000' }}>
                            R$ {((checkout.product?.price / 100 || 0) + (Array.from(selectedBumps).reduce((total, bumpId) => {
                              const bump = orderBumps.find(b => b.id === bumpId);
                              return total + (bump ? Number(bump.price) / 100 : 0);
                            }, 0))).toFixed(2).replace('.', ',')}
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
                      valueInCents={checkout.product.price + Array.from(selectedBumps).reduce((total, bumpId) => {
                        const bump = orderBumps.find(b => b.id === bumpId);
                        return total + (bump ? Number(bump.price) : 0);
                      }, 0)}
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

                {/* Security Badge Compacto */}
                <div className="mt-5 space-y-1">
                  {/* Security badge */}
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" style={{ color: design.colors.active || '#10b981' }} />
                    <span className="text-sm font-medium" style={{ color: design.colors.secondaryText }}>
                      Transação Segura e Criptografada
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p className="text-xs text-center" style={{ color: design.colors.secondaryText, opacity: 0.8 }}>
                    Pagamento processado com segurança pela plataforma RiseCheckout
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

              </div>

              {/* Rodapé Separado - Fora do container principal */}
      <footer 
        className="w-full mt-16 py-8 border-t-2"
        style={{ 
          backgroundColor: design.colors.footer?.background || '#F9FAFB',
          borderTopColor: design.colors.footer?.border || '#E5E7EB'
        }}
      >
                <div className="max-w-4xl mx-auto px-4 space-y-6">
                  {/* Badges de Segurança */}
                  <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: design.colors.active || '#10B981' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span style={{ color: design.colors.footer?.secondaryText || '#9CA3AF' }}>
                        Pagamento 100% seguro
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" style={{ color: design.colors.active || '#10B981' }} />
                      <span style={{ color: design.colors.footer?.secondaryText || '#9CA3AF' }}>
                        Site protegido
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: design.colors.active || '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span style={{ color: design.colors.footer?.secondaryText || '#9CA3AF' }}>
                        Diversas formas de pagamento
                      </span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p 
                    className="text-xs text-center leading-relaxed max-w-2xl mx-auto"
                    style={{ color: design.colors.footer?.secondaryText || '#9CA3AF' }}
                  >
                    Você está em uma página de checkout segura, criada com a tecnologia RiseCheckout. 
                    A responsabilidade pela oferta é do vendedor.
                  </p>

                  {/* Copyright */}
                  <div className="border-t pt-4" style={{ borderTopColor: design.colors.footer?.border || '#E5E7EB' }}>
                    <p 
                      className="text-xs text-center"
                      style={{ color: design.colors.footer?.secondaryText || '#9CA3AF', opacity: 0.7 }}
                    >
                      © 2025 RiseCheckout LTDA. Todos os direitos reservados.
                    </p>
                  </div>
                </div>
              </footer>

              {checkout.bottom_components && Array.isArray(checkout.bottom_components) && checkout.bottom_components.length > 0 && (
        <div className="w-full" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: design.colors.background }}>
          {checkout.bottom_components.map((component: any, index: number) => (
            <CheckoutComponentRenderer key={index} component={component} design={design} />
          ))}
        </div>
      )}
      </div>
    </>
  );
};
export default PublicCheckout;

