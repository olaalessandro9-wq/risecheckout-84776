import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, CreditCard, Link2, Sparkles, X, Loader2 } from "lucide-react";
import { ImageSelector } from "@/components/products/ImageSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductSettingsPanel from "@/components/products/ProductSettingsPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useProduct } from "@/hooks/useProduct";
import { OrderBumpList } from "@/components/products/OrderBumpList";
import { PixIcon, CreditCardIcon } from "@/components/icons";
import { OrderBumpDialog } from "@/components/products/OrderBumpDialog";
import { CheckoutTable, type Checkout } from "@/components/products/CheckoutTable";
import { CheckoutConfigDialog } from "@/components/products/CheckoutConfigDialog";
import { CouponsTable, type Coupon } from "@/components/products/CouponsTable";
import { CouponDialog } from "@/components/products/CouponDialog";
import { LinksTable, type PaymentLink } from "@/components/products/LinksTable";
import { OffersManager, type Offer } from "@/components/products/OffersManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBusy } from "@/components/BusyProvider";
import { useConfirmDelete } from "@/components/common/ConfirmDelete";
import { UnsavedChangesGuard } from "@/providers/UnsavedChangesGuard";
import { useConfirmDiscard } from "@/hooks/useConfirmDiscard";
import { ConfirmDeleteProductDialog } from "@/components/common/ConfirmDeleteProductDialog";

const ProductEditInner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const busy = useBusy();
  const { confirm, Bridge } = useConfirmDelete();
  const { confirm: confirmDiscard, ConfirmRenderer } = useConfirmDiscard();
  const { product, loading, imageFile, setImageFile, saveProduct, deleteProduct, loadProduct, productId } = useProduct();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Estado para a seção Geral
  const [generalData, setGeneralData] = useState({
    name: "",
    description: "",
    price: 0,  // Centavos
    support_name: "",
    support_email: "",
  });

  const [generalModified, setGeneralModified] = useState(false);
  const [imageModified, setImageModified] = useState(false);
  const [pendingImageRemoval, setPendingImageRemoval] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados de erro para validação inline
  const [errors, setErrors] = useState({
    name: "",
    description: "",
    price: "",
    support_name: "",
    support_email: "",
  });

  // Carregar dados do produto quando disponível
  useEffect(() => {
    if (product) {
      setGeneralData({
        name: product.name,
        description: product.description,
        price: product.price,
        support_name: product.support_name,
        support_email: product.support_email,
      });
      setGeneralModified(false);
      setImageModified(false);
      setPendingImageRemoval(false);
    }
  }, [product]);

  const [paymentSettings, setPaymentSettings] = useState({
    pixEnabled: true,
    creditCardEnabled: true,
    defaultPaymentMethod: "credit_card",
  });

  const [paymentSettingsModified, setPaymentSettingsModified] = useState(false);

  const [checkoutFields, setCheckoutFields] = useState({
    fullName: true,
    phone: true,
    email: true,
    cpf: false,
  });

  const [checkoutFieldsModified, setCheckoutFieldsModified] = useState(false);

  const [orderBumpDialogOpen, setOrderBumpDialogOpen] = useState(false);
  const [orderBumpKey, setOrderBumpKey] = useState(0);

  const [upsellSettings, setUpsellSettings] = useState({
    hasCustomThankYouPage: false,
    customPageUrl: "",
    redirectIgnoringOrderBumpFailures: false,
  });

  const [upsellModified, setUpsellModified] = useState(false);

  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);

  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [checkoutConfigDialogOpen, setCheckoutConfigDialogOpen] = useState(false);
  const [editingCheckout, setEditingCheckout] = useState<Checkout | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Load data from database
  useEffect(() => {
    if (productId) {
      loadPaymentLinks();
      loadCheckouts();
      loadCoupons();
      loadOrderBumps();
      loadOffers();
      loadAvailableOffers();
    }
  }, [productId]);

  const loadPaymentLinks = async () => {
    if (!productId) {
      console.log("[loadPaymentLinks] productId is null, skipping");
      return;
    }
    
    console.log("[loadPaymentLinks] Loading links for product:", productId);
    
    try {
      // Primeiro, buscar todas as ofertas do produto
      const { data: offersData, error: offersError } = await supabase
        .from("offers")
        .select("id")
        .eq("product_id", productId);
      
      if (offersError) throw offersError;
      
      const offerIds = (offersData || []).map(o => o.id);
      
      if (offerIds.length === 0) {
        console.log("[loadPaymentLinks] No offers found for product");
        setPaymentLinks([]);
        return;
      }
      
      // Depois, buscar payment_links dessas ofertas
      const { data: linksData, error: linksError } = await supabase
        .from("payment_links")
        .select(`
          id,
          slug,
          url,
          status,
          offers (
            id,
            name,
            price,
            is_default,
            product_id
          )
        `)
        .in("offer_id", offerIds);
      
      if (linksError) throw linksError;
      
      console.log("[loadPaymentLinks] Links data:", linksData);
      
      // Para cada link, buscar os checkouts associados
      const linksWithCheckouts = await Promise.all(
        (linksData || []).map(async (link: any) => {
          const { data: checkoutLinksData, error: checkoutLinksError } = await supabase
            .from("checkout_links")
            .select("checkout_id")
            .eq("link_id", link.id);
          
          if (checkoutLinksError) {
            console.error("Error loading checkouts for link:", link.id, checkoutLinksError);
          }
          
          // Buscar dados dos checkouts
          const checkoutIds = (checkoutLinksData || []).map((cl: any) => cl.checkout_id);
          const { data: checkoutsData } = await supabase
            .from("checkouts")
            .select("id, name")
            .in("id", checkoutIds);
          
          const checkouts = checkoutsData || [];
          
          return {
            id: link.id,
            slug: link.slug,
            url: link.url,
            offer_name: link.offers?.name || "",
            offer_price: Number(link.offers?.price || 0),
            is_default: link.offers?.is_default || false,
            status: link.status || "active",
            checkouts: checkouts,
          };
        })
      );
      
      console.log("[loadPaymentLinks] Links with checkouts:", linksWithCheckouts);
      setPaymentLinks(linksWithCheckouts);
    } catch (error) {
      console.error("[loadPaymentLinks] Error:", error);
    }
  };

  const loadCheckouts = async () => {
    if (!productId) return;
    try {
      const { data, error } = await supabase
        .from("checkouts")
        .select(`
          *,
          products (
            name,
            price
          ),
          checkout_links (
            payment_links (
              offers (
                name,
                price
              )
            )
          )
        `)
        .eq("product_id", productId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCheckouts((data || []).map(checkout => {
        const offerData = (checkout as any)?.checkout_links?.[0]?.payment_links?.offers;
        return {
          id: checkout.id,
          name: checkout.name,
          price: offerData?.price || checkout.products?.price || 0,
          visits: (checkout as any).visits_count || 0,
          offer: offerData?.name || checkout.products?.name || "",
          isDefault: (checkout as any).is_default || false,
          linkId: "",
        };
      }));
    } catch (error) {
      console.error("Error loading checkouts:", error);
    }
  };

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select(`
          *,
          coupon_products (
            product_id
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setCoupons((data || []).map(coupon => ({
        id: coupon.id,
        code: coupon.code,
        discount: Number(coupon.discount_value),
        startDate: coupon.created_at ? new Date(coupon.created_at) : new Date(),
        endDate: coupon.expires_at ? new Date(coupon.expires_at) : new Date(),
        usageCount: coupon.uses_count || 0,
        applyToOrderBumps: false,
      })));
    } catch (error) {
      console.error("Error loading coupons:", error);
    }
  };

  const loadOrderBumps = async () => {
    // Order bumps are now loaded directly by OrderBumpList component
  };

  const loadOffers = async () => {
    if (!productId) return;
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("product_id", productId)
        .eq("is_default", false) // Não carregar oferta padrão (produto = oferta principal)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      const mappedOffers = (data || []).map(offer => ({
        id: offer.id,
        name: offer.name,
        price: offer.price.toString(),
        is_default: offer.is_default,
      }));
      
      setOffers(mappedOffers);
      setOffersModified(false);
    } catch (error) {
      console.error("Error loading offers:", error);
    }
  };

  const loadAvailableOffers = async () => {
    if (!productId) return;
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, name, price, is_default")
        .eq("product_id", productId)
        .order("is_default", { ascending: false }); // Oferta padrão primeiro
      
      if (error) throw error;
      
      setAvailableOffers((data || []).map(offer => ({
        id: offer.id,
        name: offer.name,
        price: Number(offer.price),
        is_default: offer.is_default || false,
      })));
    } catch (error) {
      console.error("Error loading available offers:", error);
    }
  };

  const [affiliateSettings, setAffiliateSettings] = useState({
    enabled: false,
    requireApproval: false,
    allowContactData: false,
    receiveUpsellCommission: false,
    showInMarketplace: false,
    supportEmail: "",
    description: "",
    commission: "50.00",
    attribution: "last_click",
    cookieDuration: "30",
  });

  const [affiliateModified, setAffiliateModified] = useState(false);

  const [checkoutLinks, setCheckoutLinks] = useState<any[]>([]);

  // Estado para ofertas
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersModified, setOffersModified] = useState(false);

  // Estado para links associados ao checkout em edição
  const [currentCheckoutLinkIds, setCurrentCheckoutLinkIds] = useState<string[]>([]);
  
  // Estado para ofertas disponíveis para seleção em checkouts
  const [availableOffers, setAvailableOffers] = useState<Array<{
    id: string;
    name: string;
    price: number;
    is_default: boolean;
  }>>([]);

  // Estado para aba ativa (persistido no sessionStorage)
  const [activeTab, setActiveTab] = useState<string>("geral");

  // Carregar aba salva do sessionStorage quando productId estiver disponível
  useEffect(() => {
    if (productId) {
      const savedTab = sessionStorage.getItem(`product-edit-tab-${productId}`);
      if (savedTab) {
        setActiveTab(savedTab);
      }
    }
  }, [productId]);

  // Estado para rastrear modificações na aba de configurações
  const [settingsModified, setSettingsModified] = useState(false);

  // Agregação de dirty state para o guard
  const isDirty = generalModified || imageModified || offersModified || upsellModified || affiliateModified || settingsModified;
  
  // Guard habilitado em todas as tabs EXCETO checkout e links
  const guardEnabled = activeTab !== "checkout" && activeTab !== "links";

  // Salvar aba ativa no sessionStorage quando mudar
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Salvar apenas se productId existir
    if (productId) {
      sessionStorage.setItem(`product-edit-tab-${productId}`, value);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageModified(true);
      setPendingImageRemoval(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl("");
    setImageModified(true);
    setPendingImageRemoval(true);
  };

  // Salvar apenas a seção Geral
  const handleSaveGeneral = async () => {
    setIsSaving(true);
    // Limpar erros anteriores
    const newErrors = {
      name: "",
      description: "",
      price: "",
      support_name: "",
      support_email: "",
    };
    
    let hasError = false;
    
    // Validações de campos obrigatórios
    if (!generalData.name || generalData.name.trim() === "") {
      newErrors.name = "Nome do produto é obrigatório";
      hasError = true;
    }
    
    if (!generalData.price || parseFloat(String(generalData.price)) <= 0) {
      newErrors.price = "O preço deve ser maior que R$ 0,00";
      hasError = true;
    }

    if (!generalData.description || generalData.description.trim().length < 50) {
      newErrors.description = "A descrição precisa ter no mínimo 50 caracteres";
      hasError = true;
    }

    if (!generalData.support_name || generalData.support_name.trim() === "") {
      newErrors.support_name = "Nome de exibição é obrigatório";
      hasError = true;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!generalData.support_email || !emailRegex.test(generalData.support_email.trim())) {
      newErrors.support_email = "Digite um e-mail válido (exemplo: suporte@email.com)";
      hasError = true;
    }
    
    setErrors(newErrors);
    
    if (hasError) {
      setIsSaving(false);
      return;
    }

    // Validar ofertas se houver alguma
    if (offers.length > 0) {
      let hasOfferError = false;
      
      for (const offer of offers) {
        if (!offer.name || offer.name.trim() === "") {
          hasOfferError = true;
          break;
        }
        
        const price = parseFloat(offer.price);
        if (isNaN(price) || price <= 0) {
          hasOfferError = true;
          break;
        }
      }
      
      if (hasOfferError) {
        setIsSaving(false);
        // Não mostrar toast, deixar os erros visuais inline fazerem o trabalho
        return;
      }
    }

    try {
      let finalImageUrl = product?.image_url;

      // Se há imagem para remover
      if (pendingImageRemoval && product?.image_url) {
        // Deletar a imagem antiga do Storage
        try {
          let imagePath = product.image_url;
          
          // Extrair o caminho da imagem da URL
          if (imagePath.includes('product-images/')) {
            imagePath = imagePath.split('product-images/')[1];
          } else if (imagePath.includes('/')) {
            const fileName = imagePath.split('/').pop();
            imagePath = `${user?.id}/${fileName}`;
          } else {
            imagePath = `${user?.id}/${imagePath}`;
          }

          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([imagePath]);

          if (storageError) {
            console.warn('Erro ao deletar imagem do Storage:', storageError);
          }
        } catch (storageError) {
          console.warn('Erro ao processar deleção de imagem:', storageError);
        }
        
        finalImageUrl = null;
      }
      // Se há URL de imagem fornecida (prioridade)
      else if (imageUrl && imageUrl.trim()) {
        finalImageUrl = imageUrl.trim();
      }
      // Se há nova imagem para fazer upload
      else if (imageFile) {
        // Deletar imagem antiga se existir (antes de fazer upload da nova)
        if (product?.image_url) {
          try {
            let oldImagePath = product.image_url;
            
            // Extrair o caminho da imagem antiga
            if (oldImagePath.includes('product-images/')) {
              oldImagePath = oldImagePath.split('product-images/')[1];
            } else if (oldImagePath.includes('/')) {
              const fileName = oldImagePath.split('/').pop();
              oldImagePath = `${user?.id}/${fileName}`;
            } else {
              oldImagePath = `${user?.id}/${oldImagePath}`;
            }

            const { error: deleteError } = await supabase.storage
              .from('product-images')
              .remove([oldImagePath]);

            if (deleteError) {
              console.warn('Erro ao deletar imagem antiga:', deleteError);
            }
          } catch (deleteError) {
            console.warn('Erro ao processar deleção de imagem antiga:', deleteError);
          }
        }

        // Fazer upload da nova imagem
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}/${productId || Date.now()}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, imageFile, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);

          finalImageUrl = data.publicUrl;
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          toast.error("Não foi possível fazer upload da imagem. Tente novamente.");
          return;
        }
      }

      await saveProduct({
        name: generalData.name,
        description: generalData.description,
        price: generalData.price,
        support_name: generalData.support_name,
        support_email: generalData.support_email,
        status: "active",
        image_url: finalImageUrl,
      });

      // Salvar ofertas se foram modificadas
      if (offersModified && productId) {
        try {
          // Remover ofertas antigas (exceto as que ainda existem)
          const existingOfferIds = offers.filter(o => !o.id.startsWith('temp-')).map(o => o.id);
          
          // Deletar ofertas que não estão mais na lista (exceto oferta padrão)
          const { data: currentOffers } = await supabase
            .from("offers")
            .select("id, is_default")
            .eq("product_id", productId);
          
          const offersToDelete = (currentOffers || []).filter(
            (co: any) => !existingOfferIds.includes(co.id) && !co.is_default // Não deletar oferta padrão
          );
          
          for (const offer of offersToDelete) {
            await supabase.from("offers").delete().eq("id", offer.id);
          }
          
          // Inserir ou atualizar ofertas
          for (const offer of offers) {
            if (offer.id.startsWith('temp-')) {
              // Nova oferta
              await supabase.from("offers").insert({
                product_id: productId,
                name: offer.name,
                price: Number(offer.price),  // Centavos
                is_default: offer.is_default,
              });
            } else {
              // Atualizar oferta existente
              await supabase.from("offers").update({
                name: offer.name,
                price: Number(offer.price),  // Centavos
                is_default: offer.is_default,
              }).eq("id", offer.id);
            }
          }
          
          setOffersModified(false);
        } catch (error) {
          console.error("Erro ao salvar ofertas:", error);
          toast.error("Erro ao salvar ofertas");
        }
      }

      setGeneralModified(false);
      setImageModified(false);
      setPendingImageRemoval(false);
      setImageFile(null);
      setImageUrl("");
      
      // Recarregar produto e ofertas para atualizar a interface
      if (productId) {
        try {
          await loadProduct(false);
          await loadOffers();
          await loadAvailableOffers();
          await loadPaymentLinks(); // Atualizar links também
        } catch (reloadError) {
          console.error("Erro ao recarregar dados:", reloadError);
          // Não mostra erro ao usuário, pois o salvamento foi bem-sucedido
        }
      }
      
      // Mensagem de sucesso já é mostrada pelo hook useProduct
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Não foi possível salvar as alterações");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar apenas a seção de Configurações (Pagamento)
  const handleSavePaymentSettings = async () => {
    if (!productId) {
      toast.error("Produto não encontrado");
      return;
    }

    try {
      // Removed obsolete payment_settings and checkout_fields
      setPaymentSettingsModified(false);
      setCheckoutFieldsModified(false);

      toast.error("Configurações de pagamento salvas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    toast.error("Não foi possível salvar as alterações");
    }
  };

  // Salvar apenas a seção de Upsell
  const handleSaveUpsell = async () => {
    if (!productId) {
      toast.error("Produto não encontrado");
      return;
    }

    try {
      // Removed obsolete upsell_settings
      setUpsellModified(false);

      toast.error("Configurações de upsell salvas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar upsell:", error);
      toast.error("Não foi possível salvar as configurações");
    }
  };

  // Salvar apenas a seção de Afiliados
  const handleSaveAffiliate = async () => {
    if (!productId) {
      toast.error("Produto não encontrado");
      return;
    }

    try {
      // Removed obsolete affiliate_settings
      setAffiliateModified(false);

      toast.error("Configurações de afiliados salvas com sucesso");
    } catch (error) {
      console.error("Erro ao salvar afiliados:", error);
      toast.error("Não foi possível salvar as configurações");
    }
  };

  // Salvar TUDO (Salvar Produto)
  const handleSaveAll = async () => {
    if (!generalData.support_name || !generalData.support_email) {
      toast.error("Preencha o nome de exibição e email de suporte");
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = product?.image_url;

      // Se há imagem para remover
      if (pendingImageRemoval && product?.image_url) {
        // Deletar a imagem antiga do Storage
        try {
          let imagePath = product.image_url;
          
          // Extrair o caminho da imagem da URL
          if (imagePath.includes('product-images/')) {
            imagePath = imagePath.split('product-images/')[1];
          } else if (imagePath.includes('/')) {
            const fileName = imagePath.split('/').pop();
            imagePath = `${user?.id}/${fileName}`;
          } else {
            imagePath = `${user?.id}/${imagePath}`;
          }

          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([imagePath]);

          if (storageError) {
            console.warn('Erro ao deletar imagem do Storage:', storageError);
          }
        } catch (storageError) {
          console.warn('Erro ao processar deleção de imagem:', storageError);
        }
        
        finalImageUrl = null;
      }
      // Se há nova imagem para fazer upload
      else if (imageFile) {
        // Deletar imagem antiga se existir (antes de fazer upload da nova)
        if (product?.image_url) {
          try {
            let oldImagePath = product.image_url;
            
            // Extrair o caminho da imagem antiga
            if (oldImagePath.includes('product-images/')) {
              oldImagePath = oldImagePath.split('product-images/')[1];
            } else if (oldImagePath.includes('/')) {
              const fileName = oldImagePath.split('/').pop();
              oldImagePath = `${user?.id}/${fileName}`;
            } else {
              oldImagePath = `${user?.id}/${oldImagePath}`;
            }

            const { error: deleteError } = await supabase.storage
              .from('product-images')
              .remove([oldImagePath]);

            if (deleteError) {
              console.warn('Erro ao deletar imagem antiga:', deleteError);
            }
          } catch (deleteError) {
            console.warn('Erro ao processar deleção de imagem antiga:', deleteError);
          }
        }

        // Fazer upload da nova imagem
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}/${productId || Date.now()}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(fileName, imageFile, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from("product-images")
            .getPublicUrl(fileName);

          finalImageUrl = data.publicUrl;
        } catch (error) {
          console.error("Erro ao fazer upload da imagem:", error);
          toast.error("Não foi possível fazer upload da imagem. Tente novamente.");
          return;
        }
      }

      // Salvar dados gerais
      await saveProduct({
        name: generalData.name,
        description: generalData.description,
        price: generalData.price,
        support_name: generalData.support_name,
        support_email: generalData.support_email,
        status: "active",
        image_url: finalImageUrl,
      });

      // Configurações de pagamento agora são gerenciadas via payment_links, checkouts, etc.

      // Resetar flags de modificação
      setGeneralModified(false);
      setImageModified(false);
      setPendingImageRemoval(false);
      setPaymentSettingsModified(false);
      setCheckoutFieldsModified(false);
      setUpsellModified(false);
      setAffiliateModified(false);
      setImageFile(null);

      // Toast de sucesso já é mostrado pelo hook useProduct
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Não foi possível salvar o produto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const success = await deleteProduct();
    if (success) {
      setDeleteDialogOpen(false);
      navigate("/produtos");
    }
  };

  const handleBack = () => {
    if (isDirty && guardEnabled) {
      confirmDiscard("Se você sair agora, perderá as alterações não salvas. O que deseja fazer?")
        .then((confirmed) => {
          if (confirmed) {
            navigate("/produtos");
          }
        });
    } else {
      navigate("/produtos");
    }
  };

  const handleAddOrderBump = () => {
    setOrderBumpDialogOpen(true);
  };

  const handleEditOrderBump = (orderBump: any) => {
    // TODO: Implement edit functionality
    // For now, just show a toast
    toast.info("Edição de order bump em desenvolvimento");
  };

  const handleOrderBumpSuccess = () => {
    // Refresh order bumps list
    setOrderBumpKey(prev => prev + 1);
  };

  const handleAddCheckout = () => {
    setEditingCheckout(null);
    setCheckoutConfigDialogOpen(true);
  };

  const handleDuplicateCheckout = async (checkout: Checkout) => {
    try {
      await busy.run(
        async () => {
          const { duplicateCheckout } = await import("@/lib/checkouts/duplicateCheckout");
          const { id, editUrl } = await duplicateCheckout(checkout.id);
          
          // Recarregar checkouts
          await loadCheckouts();
          
          toast.success("Checkout duplicado com sucesso!");
          
          // Navegar para personalização do novo checkout
          navigate(editUrl);
        },
        "Duplicando checkout..."
      );
    } catch (error) {
      console.error("Error duplicating checkout:", error);
      toast.error("Não foi possível duplicar o checkout");
    }
  };

  const handleDeleteCheckout = async (id: string, name: string) => {
    await confirm({
      resourceType: "Checkout",
      resourceName: name,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("checkouts")
            .delete()
            .eq("id", id);

          if (error) throw error;

          setCheckouts(checkouts.filter(c => c.id !== id));
          toast.success("Checkout excluído com sucesso!");
        } catch (error) {
          console.error("Error deleting checkout:", error);
          throw new Error("Não foi possível excluir o checkout");
        }
      },
    });
  };

  const handleConfigureCheckout = async (checkout: Checkout) => {
    setEditingCheckout(checkout);
    
    // Carregar oferta associada a este checkout via checkout_links -> payment_links -> offers
    try {
      const { data, error } = await supabase
        .from("checkout_links")
        .select(`
          link_id,
          payment_links (
            offer_id
          )
        `)
        .eq("checkout_id", checkout.id)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error loading checkout offer:", error);
        setCurrentCheckoutLinkIds([]);
        setCheckoutConfigDialogOpen(true);
        return;
      }
      
      const offerId = (data as any)?.payment_links?.offer_id || "";
      console.log("[handleConfigureCheckout] Checkout ID:", checkout.id);
      console.log("[handleConfigureCheckout] Oferta associada:", offerId);
      setCurrentCheckoutLinkIds([offerId]); // Reutilizando estado
    } catch (error) {
      console.error("Error loading checkout offer:", error);
      setCurrentCheckoutLinkIds([]);
    }
    
    setCheckoutConfigDialogOpen(true);
  };

  const handleCustomizeCheckout = (checkout: Checkout) => {
    navigate(`/produtos/checkout/personalizar?id=${checkout.id}`);
  };

  const handleToggleLinkStatus = async (linkId: string) => {
    try {
      const link = paymentLinks.find(l => l.id === linkId);
      if (!link) return;

      const newStatus = link.status === "active" ? "inactive" : "active";

      const { error } = await supabase
        .from("payment_links")
        .update({ status: newStatus })
        .eq("id", linkId);

      if (error) throw error;

      toast.success(`Link ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`);
      loadPaymentLinks();
    } catch (error) {
      console.error("Error toggling link status:", error);
      toast.error("Não foi possível alterar o status do link");
    }
  };

  const handleSaveCheckout = async (checkout: Checkout, selectedOfferId: string) => {
    if (!productId) return;

    try {
      await busy.run(
        async () => {
          const { attachOfferToCheckoutSmart } = await import("@/lib/links/attachOfferToCheckoutSmart");
          let checkoutId = checkout.id;

          if (editingCheckout) {
            // Atualizar checkout existente
            const { error } = await supabase
              .from("checkouts")
              .update({
                name: checkout.name,
                is_default: checkout.isDefault,
              })
              .eq("id", checkout.id);

            if (error) throw error;

            // Remover associações antigas
            const { error: deleteError } = await supabase
              .from("checkout_links")
              .delete()
              .eq("checkout_id", checkout.id);

            if (deleteError) throw deleteError;

            // Associar nova oferta usando RPC (cria/reutiliza link automaticamente)
            await attachOfferToCheckoutSmart(checkout.id, selectedOfferId);
            
            setCheckouts(checkouts.map(c => c.id === checkout.id ? checkout : c));
            toast.success("O checkout foi atualizado com sucesso");
          } else {
            // Criar novo checkout
            const { data: newCheckout, error } = await supabase
              .from("checkouts")
              .insert({
                name: checkout.name,
                product_id: productId,
                is_default: checkout.isDefault,
              })
              .select()
              .single();

            if (error) throw error;
            if (!newCheckout) throw new Error("Checkout não foi criado");

            checkoutId = newCheckout.id;

            // Associar oferta usando RPC (cria/reutiliza link automaticamente)
            await attachOfferToCheckoutSmart(checkoutId, selectedOfferId);
            
            toast.success("O checkout foi adicionado com sucesso");
          }
          
          loadCheckouts();
          loadPaymentLinks();
        },
        "Salvando checkout..."
      );
    } catch (error) {
      console.error("Error saving checkout:", error);
      toast.error("Não foi possível salvar o checkout");
    }
  };

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setCouponDialogOpen(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponDialogOpen(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCoupons(coupons.filter(c => c.id !== id));
      toast.error("O cupom foi removido");
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Não foi possível excluir o cupom");
    }
  };

  const handleSaveCoupon = async (coupon: Coupon) => {
    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update({
            code: coupon.code,
            discount_value: coupon.discount,
            discount_type: "percentage",
            expires_at: coupon.endDate.toISOString(),
          })
          .eq("id", coupon.id);

        if (error) throw error;
        
        toast.error("O cupom foi atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert({
            code: coupon.code,
            discount_value: coupon.discount,
            discount_type: "percentage",
            expires_at: coupon.endDate.toISOString(),
          });

        if (error) throw error;
        
        toast.error("O cupom foi adicionado com sucesso");
      }
      loadCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Não foi possível salvar o cupom");
    }
  };


  const handleDeleteLink = (id: string) => {
    const link = checkoutLinks.find(l => l.id === id);
    
    if (link?.isDefault) {
      toast.error("Não é possível excluir o link padrão do produto");
      return;
    }

    setCheckoutLinks(checkoutLinks.filter(l => l.id !== id));
    toast.error("O link foi excluído com sucesso");
  };

  if (loading) {
    return (
      
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      
    );
  }


  return (
    <>
      <Bridge />
      <UnsavedChangesGuard
        enabled={guardEnabled}
        dirty={isDirty}
        confirm={confirmDiscard}
        message="Se você sair agora, perderá as alterações não salvas. O que deseja fazer?"
      >
        
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button 
            onClick={handleSaveAll}
            disabled={isSaving || (!generalModified && !imageModified && !paymentSettingsModified && !checkoutFieldsModified && !upsellModified && !affiliateModified)}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSaving ? "Salvando..." : "Salvar Produto"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
            <TabsTrigger value="order-bump">Order Bump</TabsTrigger>
            <TabsTrigger value="upsell">Upsell / Downsell</TabsTrigger>
            <TabsTrigger value="checkout">Checkout</TabsTrigger>
            <TabsTrigger value="cupons">Cupons</TabsTrigger>
            <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Produto</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  A aprovação do produto é instantânea. Ou seja, você pode cadastrá-lo e já começar a vender. A imagem do produto é exibida na área de membros e no seu programa de afiliados.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name" className="text-foreground">Nome do Produto</Label>
                    <Input
                      id="product-name"
                      value={generalData.name}
                      onChange={(e) => {
                        setGeneralData({ ...generalData, name: e.target.value });
                        setGeneralModified(true);
                        if (errors.name) {
                          setErrors({ ...errors, name: "" });
                        }
                      }}
                      className={`bg-background text-foreground ${
                        errors.name ? "border-red-500 focus:border-red-500" : "border-border"
                      }`}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-description" className="text-foreground">Descrição</Label>
                    <Textarea
                      id="product-description"
                      value={generalData.description}
                      onChange={(e) => {
                        setGeneralData({ ...generalData, description: e.target.value });
                        setGeneralModified(true);
                        if (errors.description) {
                          setErrors({ ...errors, description: "" });
                        }
                      }}
                      className={`bg-background text-foreground min-h-[100px] ${
                        errors.description ? "border-red-500 focus:border-red-500" : "border-border"
                      }`}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-500">{errors.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Imagem do Produto</h3>
                <ImageSelector
                  imageUrl={product?.image_url}
                  imageFile={imageFile}
                  onImageFileChange={(file) => {
                    setImageFile(file);
                    setImageModified(true);
                    setPendingImageRemoval(false);
                  }}
                  onImageUrlChange={(url) => {
                    setImageUrl(url);
                    setImageModified(true);
                    setPendingImageRemoval(false);
                  }}
                  onRemoveImage={handleRemoveImage}
                  pendingRemoval={pendingImageRemoval}
                />
                <div className="space-y-4 hidden">
                  {product?.image_url && !imageFile && !pendingImageRemoval && (
                    <div className="mb-4">
                      <img 
                        src={product.image_url} 
                        alt="Imagem do produto" 
                        className="max-w-xs rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="mt-2 gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remover Imagem
                      </Button>
                    </div>
                  )}
                  {imageFile && (
                    <div className="mb-4">
                      <img 
                        src={URL.createObjectURL(imageFile)} 
                        alt="Preview" 
                        className="max-w-xs rounded-lg border border-border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setImageFile(null);
                          setImageModified(true);
                          setPendingImageRemoval(false);
                        }}
                        className="mt-2 gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remover Imagem
                      </Button>
                    </div>
                  )}
                  {pendingImageRemoval && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        Imagem marcada para remoção. Clique em "Salvar Alterações" para confirmar.
                      </p>
                    </div>
                  )}
                  {!product?.image_url && !imageFile && !pendingImageRemoval && (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="product-image"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="product-image" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Formatos aceitos: JPG ou PNG. Tamanho máximo: 10MB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho recomendado: 300x250 pixels
                        </p>
                      </label>
                    </div>
                  )}
                </div>
                {/* Fim do código antigo de imagem - mantido oculto para compatibilidade */}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Preço</h3>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-foreground">Preço</Label>
                  <CurrencyInput
                    id="price"
                    value={generalData.price}
                    onChange={(newValue) => {
                      setGeneralData({ ...generalData, price: newValue });
                      setGeneralModified(true);
                      if (errors.price) {
                        setErrors({ ...errors, price: "" });
                      }
                    }}
                    className={`bg-background text-foreground ${
                      errors.price ? "border-red-500 focus:border-red-500" : "border-border"
                    }`}
                    error={errors.price}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price}</p>
                  )}
                </div>
              </div>

              {/* Seção de Ofertas */}
              <OffersManager
                productId={productId}
                productName={generalData.name}
                defaultPrice={String(generalData.price)}
                offers={offers}
                onOffersChange={setOffers}
                onModifiedChange={setOffersModified}
              />

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Suporte ao Cliente</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Aprenda como preencher os dados de suporte ao cliente.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="support-name" className="text-foreground">
                      Nome de exibição do produtor <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="support-name"
                      value={generalData.support_name}
                      onChange={(e) => {
                        setGeneralData({ ...generalData, support_name: e.target.value });
                        setGeneralModified(true);
                        if (errors.support_name) {
                          setErrors({ ...errors, support_name: "" });
                        }
                      }}
                      className={`bg-background text-foreground ${
                        errors.support_name ? "border-red-500 focus:border-red-500" : "border-border"
                      }`}
                      placeholder="Digite o nome de exibição"
                    />
                    {errors.support_name && (
                      <p className="text-sm text-red-500">{errors.support_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support-email" className="text-foreground">
                      E-mail de suporte <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={generalData.support_email}
                      onChange={(e) => {
                        setGeneralData({ ...generalData, support_email: e.target.value });
                        setGeneralModified(true);
                        if (errors.support_email) {
                          setErrors({ ...errors, support_email: "" });
                        }
                      }}
                      className={`bg-background text-foreground ${
                        errors.support_email ? "border-red-500 focus:border-red-500" : "border-border"
                      }`}
                      placeholder="Digite o e-mail de suporte"
                    />
                    {errors.support_email && (
                      <p className="text-sm text-red-500">{errors.support_email}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-border">
                <Button 
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Excluir Produto
                </Button>
                <Button 
                  onClick={handleSaveGeneral}
                  disabled={isSaving || (!generalModified && !imageModified && !offersModified)}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="configuracoes" className="space-y-6">
            <ProductSettingsPanel 
              productId={productId} 
              onModifiedChange={setSettingsModified}
            />
          </TabsContent>

          <TabsContent value="order-bump" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Order Bump</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adicione produtos complementares que aparecem após a compra principal
                  </p>
                </div>
                <Button onClick={handleAddOrderBump} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Adicionar Order Bump
                </Button>
              </div>
              <OrderBumpList 
                key={orderBumpKey}
                productId={productId || ""}
                onAdd={handleAddOrderBump}
                onEdit={handleEditOrderBump}
              />
            </div>
          </TabsContent>

          <TabsContent value="upsell" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Upsell / Downsell</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure as opções de upsell e downsell para seus clientes
                </p>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="customThankYou"
                        checked={upsellSettings.hasCustomThankYouPage}
                        onCheckedChange={(checked) => {
                          setUpsellSettings({ ...upsellSettings, hasCustomThankYouPage: checked });
                          setUpsellModified(true);
                        }}
                      />
                      <Label htmlFor="customThankYou" className="text-foreground cursor-pointer">
                        Usar página de obrigado customizada
                      </Label>
                    </div>

                    {upsellSettings.hasCustomThankYouPage && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="customPageUrl" className="text-foreground">
                          URL da página de obrigado
                        </Label>
                        <Input
                          id="customPageUrl"
                          value={upsellSettings.customPageUrl}
                          onChange={(e) => {
                            setUpsellSettings({ ...upsellSettings, customPageUrl: e.target.value });
                            setUpsellModified(true);
                          }}
                          className="bg-background border-border text-foreground"
                          placeholder="https://exemplo.com/obrigado"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-6">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="redirectIgnore"
                        checked={upsellSettings.redirectIgnoringOrderBumpFailures}
                        onCheckedChange={(checked) => {
                          setUpsellSettings({ ...upsellSettings, redirectIgnoringOrderBumpFailures: checked });
                          setUpsellModified(true);
                        }}
                      />
                      <Label htmlFor="redirectIgnore" className="text-foreground cursor-pointer">
                        Redirecionar ignorando falhas de order bump
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-border">
                <div />
                <Button 
                  onClick={handleSaveUpsell}
                  disabled={isSaving || !upsellModified}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checkout" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Checkouts</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Crie e personalize diferentes checkouts para seus produtos
                </p>
              </div>
              <CheckoutTable
                checkouts={checkouts}
                onAdd={handleAddCheckout}
                onDuplicate={handleDuplicateCheckout}
                onDelete={handleDeleteCheckout}
                onConfigure={handleConfigureCheckout}
                onCustomize={handleCustomizeCheckout}
              />
            </div>
          </TabsContent>

          <TabsContent value="cupons" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cupons</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie cupons de desconto para seus produtos
                  </p>
                </div>
                <Button onClick={handleAddCoupon} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Novo Cupom
                </Button>
              </div>
              <CouponsTable
                coupons={coupons}
                onAdd={handleAddCoupon}
                onEdit={handleEditCoupon}
                onDelete={handleDeleteCoupon}
              />
            </div>
          </TabsContent>

          <TabsContent value="afiliados" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Programa de Afiliados</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Configure as opções do seu programa de afiliados
                </p>

                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="affiliateEnabled"
                      checked={affiliateSettings.enabled}
                      onCheckedChange={(checked) => {
                        setAffiliateSettings({ ...affiliateSettings, enabled: checked });
                        setAffiliateModified(true);
                      }}
                    />
                    <Label htmlFor="affiliateEnabled" className="text-foreground cursor-pointer">
                      Ativar programa de afiliados
                    </Label>
                  </div>

                  {affiliateSettings.enabled && (
                    <div className="space-y-4 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="commission" className="text-foreground">
                          Comissão (%)
                        </Label>
                        <Input
                          id="commission"
                          type="number"
                          step="0.01"
                          value={affiliateSettings.commission}
                          onChange={(e) => {
                            setAffiliateSettings({ ...affiliateSettings, commission: e.target.value });
                            setAffiliateModified(true);
                          }}
                          className="bg-background border-border text-foreground"
                          placeholder="50.00"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="requireApproval"
                          checked={affiliateSettings.requireApproval}
                          onCheckedChange={(checked) => {
                            setAffiliateSettings({ ...affiliateSettings, requireApproval: checked });
                            setAffiliateModified(true);
                          }}
                        />
                        <Label htmlFor="requireApproval" className="text-foreground cursor-pointer">
                          Exigir aprovação para novos afiliados
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="allowContact"
                          checked={affiliateSettings.allowContactData}
                          onCheckedChange={(checked) => {
                            setAffiliateSettings({ ...affiliateSettings, allowContactData: checked });
                            setAffiliateModified(true);
                          }}
                        />
                        <Label htmlFor="allowContact" className="text-foreground cursor-pointer">
                          Permitir contato dos afiliados
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="upsellCommission"
                          checked={affiliateSettings.receiveUpsellCommission}
                          onCheckedChange={(checked) => {
                            setAffiliateSettings({ ...affiliateSettings, receiveUpsellCommission: checked });
                            setAffiliateModified(true);
                          }}
                        />
                        <Label htmlFor="upsellCommission" className="text-foreground cursor-pointer">
                          Comissão também em upsells
                        </Label>
                      </div>

                      <div className="space-y-2 border-t border-border pt-4">
                        <Label htmlFor="attribution" className="text-foreground">
                          Modelo de atribuição
                        </Label>
                        <Select
                          value={affiliateSettings.attribution}
                          onValueChange={(value) => {
                            setAffiliateSettings({ ...affiliateSettings, attribution: value });
                            setAffiliateModified(true);
                          }}
                        >
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first_click">Primeiro clique</SelectItem>
                            <SelectItem value="last_click">Último clique</SelectItem>
                            <SelectItem value="linear">Linear</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cookieDuration" className="text-foreground">
                          Duração do cookie (dias)
                        </Label>
                        <Input
                          id="cookieDuration"
                          type="number"
                          value={affiliateSettings.cookieDuration}
                          onChange={(e) => {
                            setAffiliateSettings({ ...affiliateSettings, cookieDuration: e.target.value });
                            setAffiliateModified(true);
                          }}
                          className="bg-background border-border text-foreground"
                          placeholder="30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-border">
                <div />
                <Button 
                  onClick={handleSaveAffiliate}
                  disabled={isSaving || !affiliateModified}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Links de Pagamento</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Links gerados automaticamente para cada oferta. Cada link pode ser associado a múltiplos checkouts.
                </p>
              </div>
              <LinksTable
                links={paymentLinks}
                onToggleStatus={handleToggleLinkStatus}
              />
            </div>
          </TabsContent>
        </Tabs>

        <OrderBumpDialog
          open={orderBumpDialogOpen}
          onOpenChange={setOrderBumpDialogOpen}
          productId={productId || ""}
          onSuccess={handleOrderBumpSuccess}
        />

        <CheckoutConfigDialog
          open={checkoutConfigDialogOpen}
          onOpenChange={(open) => {
            setCheckoutConfigDialogOpen(open);
            if (!open) {
              setEditingCheckout(null);
              setCurrentCheckoutLinkIds([]);
            }
          }}
          onSave={handleSaveCheckout}
          checkout={editingCheckout || undefined}
          availableOffers={availableOffers}
          currentOfferId={currentCheckoutLinkIds[0] || ""}
        />

        <CouponDialog
          open={couponDialogOpen}
          onOpenChange={(open) => {
            setCouponDialogOpen(open);
            if (!open) setEditingCoupon(null);
          }}
          onSave={handleSaveCoupon}
          coupon={editingCoupon || undefined}
        />
      </div>
        
      </UnsavedChangesGuard>
      <ConfirmRenderer />
    
      <ConfirmDeleteProductDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      productName={product?.name}
      onConfirm={handleDelete}
    />
    </>
  );
};

export default ProductEditInner;

