import { useState, useEffect } from "react";
import { parseJsonSafely } from "@/lib/utils"; // Importando função auxiliar
import { hasPendingUploads, waitForUploadsToFinish } from "@/lib/uploadUtils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Monitor, Smartphone, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutPreview } from "@/components/checkout/CheckoutPreview";
import { CheckoutCustomizationPanel } from "@/components/checkout/CheckoutCustomizationPanel";
import { CheckoutOfferSelector } from "@/components/products/CheckoutOfferSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ViewMode = "desktop" | "mobile";

export interface CheckoutComponent {
  id: string;
  type: "text" | "image" | "advantage" | "seal" | "timer" | "testimonial" | "video";
  content?: any;
}

// Helper function to get all components from customization
function getAllComponentsFromCustomization(customization: CheckoutCustomization): CheckoutComponent[] {
  const allComponents: CheckoutComponent[] = [];
  
  // Add top components
  if (customization.topComponents) {
    allComponents.push(...customization.topComponents);
  }
  
  // Add components from rows
  if (customization.rows) {
    customization.rows.forEach(row => {
      if (row.columns) {
        row.columns.forEach(column => {
          if (Array.isArray(column)) {
            allComponents.push(...column);
          }
        });
      }
    });
  }
  
  // Add bottom components
  if (customization.bottomComponents) {
    allComponents.push(...customization.bottomComponents);
  }
  
  return allComponents;
}

export type LayoutType = "single" | "two-columns" | "two-columns-asymmetric" | "three-columns";

export interface CheckoutRow {
  id: string;
  layout: LayoutType;
  columns: CheckoutComponent[][];
}

export interface CheckoutDesign {
  theme: string;
  font: string;
  colors: {
    background: string;
    primaryText: string;
    secondaryText: string;
    accent: string;
    button: {
      background: string;
      text: string;
    };
    form?: {
      background: string;
    };
    selectedPayment?: string;
  };
  backgroundImage?: {
    url?: string;
    fixed?: boolean;
    repeat?: boolean;
  };
}

export interface CheckoutCustomization {
  design: CheckoutDesign;
  rows: CheckoutRow[];
  topComponents: CheckoutComponent[];
  bottomComponents: CheckoutComponent[];
}

const CheckoutCustomizer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("id");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [customization, setCustomization] = useState<CheckoutCustomization>({
    design: {
      theme: "custom",
      font: "Inter",
      colors: {
        background: "#FFFFFF",
        primaryText: "#000000",
        secondaryText: "#6B7280",
        accent: "#10B981",
        button: {
          background: "#10B981",
          text: "#FFFFFF",
        },
        form: {
          background: "#F9FAFB",
        },
        selectedPayment: "#10B981",
      },
    },
    rows: [],
    topComponents: [],
    bottomComponents: [],
  });

  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number>(0);
  const [productData, setProductData] = useState<any>(null);
  const [orderBumps, setOrderBumps] = useState<any[]>([]);
  const [productOffers, setProductOffers] = useState<any[]>([]);
  const [currentLinks, setCurrentLinks] = useState<any[]>([]);
  
  // Flags para controlar resync/auto-save
  const [isDirty, setIsDirty] = useState(false);
  const [lastLocalRev, setLastLocalRev] = useState<number>(Date.now());
  
  // Função para marcar estado como modificado
  const touch = () => {
    setIsDirty(true);
    setLastLocalRev(Date.now());
  };

  // Load checkout data from Supabase
  useEffect(() => {
    if (checkoutId) {
      // Force reload by clearing any cache
      loadCheckoutData(checkoutId);
    }
  }, [checkoutId]);

  // Reload on window focus to ensure data is fresh (APENAS se não houver edições locais)
  useEffect(() => {
    const handleFocus = () => {
      // NÃO recarregar se houver edições não salvas
      if (checkoutId && !isDirty) {
        console.log('[Focus] Recarregando dados do servidor (sem edições locais)');
        loadCheckoutData(checkoutId);
      } else if (isDirty) {
        console.log('[Focus] Ignorando reload (há edições locais não salvas)');
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkoutId, isDirty]);

  const loadCheckoutData = async (id: string) => {
    setLoading(true);
    try {
      // Força reload dos dados do banco sem cache
      const { data: checkout, error: checkoutError } = await supabase
        .from("checkouts")
        .select(`
          *,
          products (
            id,
            name,
            description,
            price,
            image_url,
            status,
            support_name,
            support_email,
            user_id,
            created_at,
            updated_at
          )
        `)
        .eq("id", id)
        .single();

      if (checkoutError) throw checkoutError;

      if (checkout) {
        console.log('Checkout carregado:', checkout);
        console.log('Produto carregado:', checkout.products);
        console.log('Preço do produto:', checkout.products?.price);
        
        const loadedCustomization: CheckoutCustomization = {
          design: {
            font: checkout.font || 'Inter',
            theme: 'custom',
            colors: {
              background: checkout.background_color || '#FFFFFF',
              primaryText: checkout.text_color || '#000000',
              secondaryText: '#6B7280',
              accent: checkout.primary_color || '#10B981',
              button: {
                background: checkout.button_color || '#10B981',
                text: checkout.button_text_color || '#FFFFFF',
              },
              form: {
                background: checkout.form_background_color || '#F9FAFB',
              },
              selectedPayment: checkout.selected_payment_color || '#10B981',
            },
          },
          rows: parseJsonSafely(checkout.components, []),
          topComponents: parseJsonSafely(checkout.top_components, []),
          bottomComponents: parseJsonSafely(checkout.bottom_components, []),
        };
        setCustomization(loadedCustomization);
        setProductData(checkout.products);

        // Load product offers
        if (checkout.product_id) {
          const { data: offers, error: offersError } = await supabase
            .from("offers")
            .select("*")
            .eq("product_id", checkout.product_id)
            .order("created_at");
          
          if (!offersError && offers) {
            setProductOffers(offers);
          }
        }

        // Load current links for this checkout
        const { data: links, error: linksError } = await supabase
          .from("checkout_links")
          .select(`
            *,
            payment_links (
              *,
              offers (
                id,
                name,
                price
              )
            )
          `)
          .eq("checkout_id", id);

        if (!linksError && links) {
          setCurrentLinks(links);
        }
      }

      // Load order bumps with product data
      const { data: bumps, error: bumpsError } = await supabase
        .from("order_bumps")
        .select(`
          *,
          products!order_bumps_product_id_fkey (
            id,
            name,
            price,
            image_url
          ),
          offers (
            id,
            name,
            price
          )
        `)
        .eq("checkout_id", id)
        .eq("active", true)
        .order("position");

      if (bumpsError) {
        console.error("Error loading order bumps:", bumpsError);
      } else {
        // Map order bumps to include product data and customization
        const mappedBumps = (bumps || []).map((bump: any) => {
          const finalPrice = bump.offers?.price || bump.products?.price || 0;
          const originalPrice = bump.discount_enabled && bump.discount_price 
            ? bump.discount_price 
            : finalPrice;
          const discountPercentage = bump.discount_enabled && bump.discount_price && bump.discount_price > finalPrice
            ? Math.round(((bump.discount_price - finalPrice) / bump.discount_price) * 100)
            : 0;

          return {
            id: bump.id,
            name: bump.custom_title || bump.products?.name || "Produto não encontrado",
            description: bump.custom_description || undefined,
            price: finalPrice,
            original_price: bump.discount_enabled && bump.discount_price > finalPrice ? originalPrice : null,
            image_url: bump.show_image ? bump.products?.image_url : null,
            call_to_action: bump.call_to_action,
            discount_percentage: discountPercentage,
          };
        });
        setOrderBumps(mappedBumps);
      }
    } catch (error: any) {
      console.error("Error loading checkout:", error);
      toast({
        title: "Erro ao carregar checkout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper para obter todos os componentes em um array plano
  // Helper para obter todos os componentes em um array plano
  const getAllComponents = (custom: CheckoutCustomization) => {
    const all = [...custom.topComponents, ...custom.bottomComponents];
    custom.rows.forEach(row => row.columns.forEach(col => all.push(...col)));
    return all;
  };

  const handleSave = async () => {
    if (!checkoutId) {
      toast({
        title: "Erro",
        description: "ID do checkout não encontrado",
        variant: "destructive",
      });
      return;
    }

    // 1. Aguardar uploads pendentes
    if (hasPendingUploads(customization)) {
      toast({ title: "Aguardando upload", description: "Existem imagens sendo enviadas. Salvando automaticamente quando terminar..." });
      try {
        await waitForUploadsToFinish(() => customization, 45000);
      } catch (err) {
        toast({ title: "Tempo esgotado", description: "Uploads demoraram muito. Tente novamente.", variant: "destructive" });
        return;
      }
    }

    // 2. Sanity check: no blobs (após o wait)
    const blobs = getAllComponentsFromCustomization(customization).filter(c => typeof c?.content?.imageUrl === "string" && c.content.imageUrl.startsWith("blob:"));
    if (blobs.length) {
      toast({ title: "Erro", description: "Existem imagens em preview. Aguarde o upload terminar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    let oldStoragePaths: string[] = [];

    try {
      // 3. Coletar paths antigos para exclusão
      getAllComponentsFromCustomization(customization).forEach(comp => {
        if (comp.content?._old_storage_path) {
          oldStoragePaths.push(comp.content._old_storage_path);
        }
      });

      console.log('Salvando componentes:', {
        topComponents: customization.topComponents,
        bottomComponents: customization.bottomComponents
      });

      const { error } = await supabase
        .from("checkouts")
        .update({
          font: customization.design.font,
          background_color: customization.design.colors.background,
          text_color: customization.design.colors.primaryText,
          primary_color: customization.design.colors.accent,
          button_color: customization.design.colors.button.background,
          button_text_color: customization.design.colors.button.text,
          // Remover campos temporários antes de salvar
          components: JSON.parse(JSON.stringify(customization.rows, (k, v) => (k.startsWith('_') ? undefined : v))) as any,
          top_components: JSON.parse(JSON.stringify(customization.topComponents || [], (k, v) => (k.startsWith('_') ? undefined : v))) as any,
          bottom_components: JSON.parse(JSON.stringify(customization.bottomComponents || [], (k, v) => (k.startsWith('_') ? undefined : v))) as any,
        })
        .eq("id", checkoutId);

      if (error) throw error;

      // 4. Excluir arquivos antigos do storage (após save no DB)
      if (oldStoragePaths.length > 0) {
        const res = await fetch("/api/storage/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: oldStoragePaths, bucket: "product-images" })
        });
        if (!res.ok) {
          console.error("Falha ao remover arquivos antigos do storage:", await res.json());
        } else {
          console.log("Arquivos antigos removidos com sucesso:", oldStoragePaths);
        }
      }

      // Resetar flag de modificação após salvar
      setIsDirty(false);
      console.log('[Save] Estado salvo, isDirty resetado');

      toast({
        title: "Sucesso!",
        description: "Checkout salvo com sucesso",
      });
    } catch (error: any) {
      console.error("Error saving checkout:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const dropZone = over.id as string;

    // Check if dragging an existing component or a new one
    const isExistingComponent = activeId.startsWith("component-");

    if (isExistingComponent) {
      // Moving an existing component
      setCustomization((prev) => {
        // Find and remove the component from its current location
        let movedComponent: CheckoutComponent | null = null;
        const newCustomization = { ...prev };

        // Check top components
        const topIndex = prev.topComponents.findIndex((c) => c.id === activeId);
        if (topIndex !== -1) {
          movedComponent = prev.topComponents[topIndex];
          newCustomization.topComponents = prev.topComponents.filter((c) => c.id !== activeId);
        }

        // Check bottom components
        const bottomIndex = prev.bottomComponents.findIndex((c) => c.id === activeId);
        if (bottomIndex !== -1) {
          movedComponent = prev.bottomComponents[bottomIndex];
          newCustomization.bottomComponents = prev.bottomComponents.filter((c) => c.id !== activeId);
        }

        // Check rows
        if (!movedComponent) {
          newCustomization.rows = prev.rows.map((row) => {
            const newColumns = row.columns.map((column) => {
              const comp = column.find((c) => c.id === activeId);
              if (comp && !movedComponent) {
                movedComponent = comp;
                return column.filter((c) => c.id !== activeId);
              }
              return column;
            });
            return { ...row, columns: newColumns };
          });
        }

        if (!movedComponent) return prev;

        // Add component to new location
        if (dropZone === "top-drop-zone") {
          newCustomization.topComponents = [...newCustomization.topComponents, movedComponent];
        } else if (dropZone === "bottom-drop-zone") {
          newCustomization.bottomComponents = [...newCustomization.bottomComponents, movedComponent];
        } else if (dropZone.startsWith("row-")) {
          const [, rowId, columnIndex] = dropZone.split("-");
          const rowIndex = newCustomization.rows.findIndex((r) => r.id === `row-${rowId}`);
          
          if (rowIndex !== -1) {
            const updatedRows = [...newCustomization.rows];
            const colIndex = parseInt(columnIndex);
            updatedRows[rowIndex].columns[colIndex] = [
              ...updatedRows[rowIndex].columns[colIndex],
              movedComponent,
            ];
            newCustomization.rows = updatedRows;
          }
        }

        touch(); // Marcar como modificado
        return newCustomization;
      });
    } else {
      // Adding a new component
      const componentType = activeId;
      const newComponent: CheckoutComponent = {
        id: `component-${Date.now()}`,
        type: componentType as any,
        content: componentType === 'timer' ? {
          minutes: 15,
          seconds: 0,
          timerColor: "#EF4444",
          textColor: "#FFFFFF",
          activeText: "Oferta por tempo limitado",
          finishedText: "Oferta finalizada",
          fixedTop: false
        } : {},
      };

      setCustomization((prev) => {
        const newCustomization = { ...prev };

        if (dropZone === "top-drop-zone") {
          newCustomization.topComponents = [...prev.topComponents, newComponent];
        } else if (dropZone === "bottom-drop-zone") {
          newCustomization.bottomComponents = [...prev.bottomComponents, newComponent];
        } else if (dropZone.startsWith("row-")) {
          const [, rowId, columnIndex] = dropZone.split("-");
          const rowIndex = prev.rows.findIndex((r) => r.id === `row-${rowId}`);
          
          if (rowIndex !== -1) {
            const updatedRows = [...prev.rows];
            const colIndex = parseInt(columnIndex);
            updatedRows[rowIndex].columns[colIndex] = [
              ...updatedRows[rowIndex].columns[colIndex],
              newComponent,
            ];
            newCustomization.rows = updatedRows;
          }
        }

        touch(); // Marcar como modificado
        return newCustomization;
      });

      // Auto-select the new component
      setSelectedComponent(newComponent.id);
    }
  };

  const handleAddRow = (layout: LayoutType) => {
    const columnCount = 
      layout === "single" ? 1 :
      layout === "two-columns" ? 2 :
      layout === "two-columns-asymmetric" ? 2 :
      3;

    const newRow: CheckoutRow = {
      id: `row-${Date.now()}`,
      layout,
      columns: Array(columnCount).fill([]).map(() => []),
    };

    setCustomization((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
    touch(); // Marcar como modificado

    setSelectedRow(newRow.id);
  };

  const handleRemoveRow = (rowId: string) => {
    setCustomization((prev) => ({
      ...prev,
      rows: prev.rows.filter((row) => row.id !== rowId),
    }));
    touch(); // Marcar como modificado

    if (selectedRow === rowId) {
      setSelectedRow(null);
    }
  };

  const handleUpdateComponent = (componentId: string, partialContent: any) => {
    console.log('[handleUpdateComponent] id:', componentId, 'content:', partialContent);
    setCustomization((prev) => {
      let found = false;

      // 1) topComponents - criar NOVO objeto ao invés de mutar
      const newTopComponents = prev.topComponents.map((c) => {
        if (c.id !== componentId) return c;
        found = true;
        return {
          ...c,
          content: { ...(c.content ?? {}), ...(partialContent ?? {}) }
        };
      });

    if (found) {
      console.log('[handleUpdateComponent] componente atualizado em topComponents');
      touch(); // Marcar como modificado
      return { ...prev, topComponents: newTopComponents };
    }

      // 2) bottomComponents - criar NOVO objeto ao invés de mutar
      const newBottomComponents = prev.bottomComponents.map((c) => {
        if (c.id !== componentId) return c;
        found = true;
        return {
          ...c,
          content: { ...(c.content ?? {}), ...(partialContent ?? {}) }
        };
      });

    if (found) {
      console.log('[handleUpdateComponent] componente atualizado em bottomComponents');
      touch(); // Marcar como modificado
      return { ...prev, bottomComponents: newBottomComponents };
    }

      // 3) rows/columns - criar NOVO objeto ao invés de mutar
      const newRows = prev.rows.map((r) => ({
        ...r,
        columns: r.columns.map((col) =>
          col.map((c) => {
            if (c.id !== componentId) return c;
            found = true;
            return {
              ...c,
              content: { ...(c.content ?? {}), ...(partialContent ?? {}) }
            };
          })
        ),
      }));

    if (found) {
      console.log('[handleUpdateComponent] componente atualizado em rows');
      touch(); // Marcar como modificado
      return { ...prev, rows: newRows };
    }

      console.warn('[handleUpdateComponent] componente não encontrado:', componentId);
      return prev; // Não altera estado
    });
  };

  const handleRemoveComponent = (componentId: string) => {
    setCustomization((prev) => {
      const newCustomization = { ...prev };

      // Remove from top components
      newCustomization.topComponents = prev.topComponents.filter((c) => c.id !== componentId);

      // Remove from bottom components
      newCustomization.bottomComponents = prev.bottomComponents.filter((c) => c.id !== componentId);

      // Remove from rows
      newCustomization.rows = prev.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) =>
          column.filter((component) => component.id !== componentId)
        ),
      }));

      touch(); // Marcar como modificado
      return newCustomization;
    });

    if (selectedComponent === componentId) {
      setSelectedComponent(null);
    }
  };

  const handleDuplicateComponent = (componentId: string) => {
    setCustomization((prev) => {
      const newCustomization = { ...prev };
      let componentToDuplicate: CheckoutComponent | null = null;

      // Find component in top
      const topIndex = prev.topComponents.findIndex((c) => c.id === componentId);
      if (topIndex !== -1) {
        componentToDuplicate = { ...prev.topComponents[topIndex], id: `component-${Date.now()}` };
        newCustomization.topComponents = [
          ...prev.topComponents.slice(0, topIndex + 1),
          componentToDuplicate,
          ...prev.topComponents.slice(topIndex + 1),
        ];
        return newCustomization;
      }

      // Find component in bottom
      const bottomIndex = prev.bottomComponents.findIndex((c) => c.id === componentId);
      if (bottomIndex !== -1) {
        componentToDuplicate = { ...prev.bottomComponents[bottomIndex], id: `component-${Date.now()}` };
        newCustomization.bottomComponents = [
          ...prev.bottomComponents.slice(0, bottomIndex + 1),
          componentToDuplicate,
          ...prev.bottomComponents.slice(bottomIndex + 1),
        ];
        return newCustomization;
      }

      // Find component in rows
      newCustomization.rows = prev.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) => {
          const compIndex = column.findIndex((c) => c.id === componentId);
          if (compIndex !== -1 && !componentToDuplicate) {
            componentToDuplicate = { ...column[compIndex], id: `component-${Date.now()}` };
            return [
              ...column.slice(0, compIndex + 1),
              componentToDuplicate,
              ...column.slice(compIndex + 1),
            ];
          }
          return column;
        }),
      }));

      return newCustomization;
    });
  };

  const handleMoveComponentUp = (componentId: string) => {
    setCustomization((prev) => {
      const newCustomization = { ...prev };

      // Move in top components
      const topIndex = prev.topComponents.findIndex((c) => c.id === componentId);
      if (topIndex > 0) {
        const newTopComponents = [...prev.topComponents];
        [newTopComponents[topIndex - 1], newTopComponents[topIndex]] = 
          [newTopComponents[topIndex], newTopComponents[topIndex - 1]];
        newCustomization.topComponents = newTopComponents;
        return newCustomization;
      }

      // Move in bottom components
      const bottomIndex = prev.bottomComponents.findIndex((c) => c.id === componentId);
      if (bottomIndex > 0) {
        const newBottomComponents = [...prev.bottomComponents];
        [newBottomComponents[bottomIndex - 1], newBottomComponents[bottomIndex]] = 
          [newBottomComponents[bottomIndex], newBottomComponents[bottomIndex - 1]];
        newCustomization.bottomComponents = newBottomComponents;
        return newCustomization;
      }

      // Move in rows
      newCustomization.rows = prev.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) => {
          const compIndex = column.findIndex((c) => c.id === componentId);
          if (compIndex > 0) {
            const newColumn = [...column];
            [newColumn[compIndex - 1], newColumn[compIndex]] = 
              [newColumn[compIndex], newColumn[compIndex - 1]];
            return newColumn;
          }
          return column;
        }),
      }));

      return newCustomization;
    });
  };

  const handleMoveComponentDown = (componentId: string) => {
    setCustomization((prev) => {
      const newCustomization = { ...prev };

      // Move in top components
      const topIndex = prev.topComponents.findIndex((c) => c.id === componentId);
      if (topIndex !== -1 && topIndex < prev.topComponents.length - 1) {
        const newTopComponents = [...prev.topComponents];
        [newTopComponents[topIndex], newTopComponents[topIndex + 1]] = 
          [newTopComponents[topIndex + 1], newTopComponents[topIndex]];
        newCustomization.topComponents = newTopComponents;
        return newCustomization;
      }

      // Move in bottom components
      const bottomIndex = prev.bottomComponents.findIndex((c) => c.id === componentId);
      if (bottomIndex !== -1 && bottomIndex < prev.bottomComponents.length - 1) {
        const newBottomComponents = [...prev.bottomComponents];
        [newBottomComponents[bottomIndex], newBottomComponents[bottomIndex + 1]] = 
          [newBottomComponents[bottomIndex + 1], newBottomComponents[bottomIndex]];
        newCustomization.bottomComponents = newBottomComponents;
        return newCustomization;
      }

      // Move in rows
      newCustomization.rows = prev.rows.map((row) => ({
        ...row,
        columns: row.columns.map((column) => {
          const compIndex = column.findIndex((c) => c.id === componentId);
          if (compIndex !== -1 && compIndex < column.length - 1) {
            const newColumn = [...column];
            [newColumn[compIndex], newColumn[compIndex + 1]] = 
              [newColumn[compIndex + 1], newColumn[compIndex]];
            return newColumn;
          }
          return column;
        }),
      }));

      return newCustomization;
    });
  };

  const handleUpdateDesign = (design: CheckoutDesign) => {
    setCustomization((prev) => ({
      ...prev,
      design,
    }));
    touch(); // Marcar como modificado
  };

  const getSelectedComponentData = () => {
    if (!selectedComponent) return null;

    // Check top components
    const topComponent = customization.topComponents.find((c) => c.id === selectedComponent);
    if (topComponent) return topComponent;

    // Check bottom components
    const bottomComponent = customization.bottomComponents.find((c) => c.id === selectedComponent);
    if (bottomComponent) return bottomComponent;

    // Check rows
    for (const row of customization.rows) {
      for (const column of row.columns) {
        const component = column.find((c) => c.id === selectedComponent);
        if (component) return component;
      }
    }

    return null;
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Personalizar Checkout</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("desktop")}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </Button>
                <Button
                  variant={viewMode === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>

              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-73px)]">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto">
            <CheckoutPreview
              customization={customization}
              viewMode={viewMode}
              selectedComponentId={selectedComponent}
              onSelectComponent={setSelectedComponent}
              selectedRowId={selectedRow}
              onSelectRow={setSelectedRow}
              selectedColumn={selectedColumn}
              onSelectColumn={setSelectedColumn}
              isPreviewMode={isPreviewMode}
              productData={productData}
              orderBumps={orderBumps}
            />
          </div>

          {/* Customization Panel */}
          {!isPreviewMode && (
            <div className="w-[400px] border-l bg-card overflow-auto">
              <div className="p-6 space-y-6">
                <CheckoutCustomizationPanel
                  customization={customization}
                  selectedComponent={getSelectedComponentData()}
                  onUpdateComponent={handleUpdateComponent}
                  onRemoveComponent={handleRemoveComponent}
                  onDuplicateComponent={handleDuplicateComponent}
                  onMoveComponentUp={handleMoveComponentUp}
                  onMoveComponentDown={handleMoveComponentDown}
                  onUpdateDesign={handleUpdateDesign}
                  onAddRow={handleAddRow}
                  onRemoveRow={handleRemoveRow}
                  onBack={() => setSelectedComponent(null)}
                  rows={customization.rows}
                  selectedRowId={selectedRow}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 cursor-grabbing">
            <p className="text-sm font-medium capitalize">{activeId}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CheckoutCustomizer;

