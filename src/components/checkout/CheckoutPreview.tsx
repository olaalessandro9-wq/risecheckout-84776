import { CheckoutCustomization, CheckoutComponent, CheckoutRow, ViewMode } from "@/pages/CheckoutCustomizer";
import { useState } from "react";
import { Plus, Wallet, Lock as LockIconLucide, User } from "lucide-react";
import { formatCentsToBRL } from "@/utils/money";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { PixIcon, CreditCardIcon, LockIcon } from "@/components/icons";
import { CheckIconCakto } from "@/components/icons/CheckIconCakto";
import { CheckCircleFilledIcon } from "@/components/icons/CheckCircleFilledIcon";
import { ImageIcon } from "@/components/icons/ImageIcon";
import { CountdownTimer } from "@/components/CountdownTimer";

interface CheckoutPreviewProps {
  customization: CheckoutCustomization;
  viewMode: ViewMode;
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  selectedRowId: string | null;
  onSelectRow: (id: string) => void;
  selectedColumn: number;
  onSelectColumn: (index: number) => void;
  isPreviewMode?: boolean;
  productData?: any;
  orderBumps?: any[];
}

const DropZone = ({ id, children, isOver }: { id: string; children: React.ReactNode; isOver?: boolean }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] rounded-lg border-2 border-dashed transition-all ${
        isOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"
      }`}
    >
      {children}
    </div>
  );
};

const ComponentRenderer = ({ 
  component, 
  isSelected, 
  onClick,
  customization,
  isPreviewMode = false,
}: { 
  component: CheckoutComponent;
  isSelected: boolean;
  onClick: () => void;
  customization: CheckoutCustomization;
  isPreviewMode?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    disabled: isPreviewMode,
  });

  const baseClasses = isPreviewMode ? '' : `cursor-move transition-all ${
    isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:ring-1 hover:ring-primary/50"
  } ${isDragging ? "opacity-50" : ""}`;

  const renderContent = () => {

  switch (component.type) {
    case "text":
      const textColor = component.content?.color || customization.design.colors.primaryText || "#000000";
      const textContent = component.content?.text || "Texto editável - Clique para editar";
      
      return (
        <div 
          key={`${component.id}-${textContent}-${textColor}`}
          className={`p-4 ${baseClasses}`}
          onClick={onClick}
          style={{
            backgroundColor: component.content?.backgroundColor || "#FFFFFF",
            borderColor: component.content?.borderColor || "#E5E7EB",
            borderWidth: `${component.content?.borderWidth || 1}px`,
            borderStyle: "solid",
            borderRadius: `${component.content?.borderRadius || 8}px`,
          }}
        >
          <p 
            style={{
              color: textColor,
              fontSize: `${component.content?.fontSize || 16}px`,
            }}
          >
            {textContent}
          </p>
        </div>
      );
    
    case "image": {
      const getAlignmentClass = () => {
        const alignment = component.content?.alignment || "center";
        if (alignment === "left") return "justify-start";
        if (alignment === "right") return "justify-end";
        return "justify-center";
      };
      
      // Ler src com fallback seguro
      const src = typeof component.content?.imageUrl === 'string'
        ? component.content.imageUrl
        : (typeof component.content?.url === 'string' ? component.content.url : '');
      console.log('[ComponentRenderer:image] src:', src, 'component:', component.id);
      
      return (
        <div 
          className={`p-4 rounded-lg flex items-center ${getAlignmentClass()} ${baseClasses}`}
          onClick={onClick}
          style={{ 
            minHeight: src ? "auto" : "128px",
            backgroundColor: "transparent",
          }}
        >
          {src ? (
            <img 
              key={component.id}
              src={src} 
              alt="Componente" 
              className="rounded object-contain"
              style={{
                maxWidth: '400px',      // largura máxima
                maxHeight: '350px',     // altura máxima
                width: '100%',          // responsivo
                height: 'auto',         // mantém proporção
              }}
            />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center w-full flex flex-col items-center gap-2">
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#9CA3AF" 
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p 
                className="text-sm"
                style={{ color: customization.design.colors.secondaryText }}
              >
                Imagem - Clique para adicionar
              </p>
            </div>
          )}
        </div>
      );
    }
    
    case "advantage": {
      const advantageIcon = component.content?.icon || "check";
      const primaryColor = component.content?.primaryColor || "#1DB88E";
      const titleColor = component.content?.titleColor || "#000000";
      const darkMode = component.content?.darkMode || false;
      const verticalMode = component.content?.verticalMode || false;
      const size = component.content?.size || "original";
      const advantageTitle = component.content?.title || "Vantagem";
      const advantageDescription = component.content?.description || "Descrição da vantagem";
      
      const getSizeClass = () => {
        if (size === "small") return "text-xs";
        if (size === "large") return "text-lg";
        return "text-sm";
      };
      
      const getIconSize = () => {
        if (size === "small") return 32;
        if (size === "large") return 56;
        return 40;
      };
      
      return (
        <div 
          className={`p-4 rounded-lg flex ${verticalMode ? 'flex-col items-center text-center' : 'items-center'} gap-4 ${baseClasses}`}
          onClick={onClick}
          style={{
            backgroundColor: darkMode ? "#1F2937" : "#FFFFFF",
            border: "1px solid #E5E7EB",
          }}
        >
          <div className="flex-shrink-0">
            <CheckIconCakto 
              size={getIconSize()}
              color={primaryColor}
            />
          </div>
          <div className="flex-1">
            <p 
              className={`font-semibold mb-1 ${getSizeClass()}`}
              style={{ color: darkMode ? "#FFFFFF" : titleColor }}
            >
              {advantageTitle}
            </p>
            <p 
              className={getSizeClass()}
              style={{ color: darkMode ? "#D1D5DB" : customization.design.colors.secondaryText }}
            >
              {advantageDescription}
            </p>
          </div>
        </div>
      );
    }
    
    case "seal": {
      const sealPrimaryColor = component.content?.primaryColor || "#4F9EF8";
      const sealTitleColor = component.content?.titleColor || "#FFFFFF";
      const sealDarkMode = component.content?.darkMode || false;
      const sealAlignment = component.content?.alignment || "center";
      
      const getSealAlignmentClass = () => {
        if (sealAlignment === "left") return "justify-start";
        if (sealAlignment === "right") return "justify-end";
        return "justify-center";
      };
      
      return (
        <div 
          className={`p-6 rounded-lg flex items-center ${getSealAlignmentClass()} ${baseClasses}`}
          onClick={onClick}
          style={{
            backgroundColor: sealDarkMode ? "#1F2937" : "transparent",
          }}
        >
          <div className="relative">
            {/* Escudo superior */}
            <div 
              className="relative w-32 h-24 flex flex-col items-center justify-center rounded-t-full"
              style={{ 
                backgroundColor: "#FFFFFF",
                border: `3px solid ${sealPrimaryColor}`,
                borderBottom: "none",
              }}
            >
              {/* Ícone/Texto superior */}
              <div className="text-sm font-bold" style={{ color: sealPrimaryColor }}>
                {component.content?.topText || "7"}
              </div>
            </div>
            
            {/* Fita central */}
            <div 
              className="relative w-32 h-12 flex items-center justify-center"
              style={{ backgroundColor: sealPrimaryColor }}
            >
              <span className="text-lg font-bold text-center px-2" style={{ color: sealTitleColor }}>
                {component.content?.title || "Privacidade"}
              </span>
            </div>
            
            {/* Escudo inferior */}
            <div 
              className="relative w-32 h-16 flex items-center justify-center"
              style={{ 
                backgroundColor: "#FFFFFF",
                border: `3px solid ${sealPrimaryColor}`,
                borderTop: "none",
                clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)",
              }}
            >
              <span className="text-xs font-semibold text-center px-2" style={{ color: sealPrimaryColor }}>
                {component.content?.subtitle || "Garantida"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    
    case "timer": {
      return (
        <CountdownTimer
          initialMinutes={component.content?.minutes || 15}
          initialSeconds={component.content?.seconds || 0}
          backgroundColor={component.content?.timerColor || customization.design.colors.active}
          textColor={component.content?.textColor || "#FFFFFF"}
          activeText={component.content?.activeText || "Oferta por tempo limitado"}
          finishedText={component.content?.finishedText || "Oferta finalizada"}
          fixedTop={component.content?.fixedTop || false}
          onClick={onClick}
          className={baseClasses}
        />
      );
    }
    
    case "testimonial": {
      return (
        <div 
          className={`p-6 rounded-lg ${baseClasses}`}
          onClick={onClick}
          style={{
            backgroundColor: customization.design.colors.formBackground || "#F9FAFB",
          }}
        >
          <div className="flex gap-4">
            {component.content?.authorImage && (
              <img 
                src={component.content.authorImage} 
                alt={component.content.authorName} 
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <p 
                className="italic mb-2"
                style={{ color: customization.design.colors.primaryText }}
              >
                "{component.content?.testimonialText || "Depoimento do cliente aqui"}"
              </p>
              <p 
                className="text-sm font-semibold"
                style={{ color: customization.design.colors.secondaryText }}
              >
                - {component.content?.authorName || "Nome do Cliente"}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    case "video": {
      const getEmbedUrl = (url: string, type: string) => {
        if (!url) return "";
        
        if (type === "youtube") {
          const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
          return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
        } else if (type === "vimeo") {
          const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
        }
        return url;
      };

      const embedUrl = getEmbedUrl(
        component.content?.videoUrl || "", 
        component.content?.videoType || "youtube"
      );

      return (
        <div 
          className={`p-4 rounded-lg ${baseClasses}`}
          onClick={onClick}
          style={{
            backgroundColor: customization.design.colors.formBackground || "#F9FAFB",
          }}
        >
          {embedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                className="w-full h-full rounded"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full flex items-center justify-center border-2 border-dashed rounded"
              style={{ borderColor: customization.design.colors.secondaryText }}
            >
              <p 
                className="text-sm"
                style={{ color: customization.design.colors.secondaryText }}
              >
                Vídeo - Clique para configurar
              </p>
            </div>
          )}
        </div>
      );
    }
    
    default:
      return null;
  }
  };

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {renderContent()}
    </div>
  );
};

const RowRenderer = ({
  row,
  customization,
  selectedComponentId,
  onSelectComponent,
  isSelected,
  onSelectRow,
  selectedColumn,
  onSelectColumn,
  isPreviewMode = false,
}: {
  row: CheckoutRow;
  customization: CheckoutCustomization;
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  isSelected: boolean;
  onSelectRow: (id: string) => void;
  selectedColumn: number;
  onSelectColumn: (index: number) => void;
  isPreviewMode?: boolean;
}) => {
  const getColumnClasses = () => {
    switch (row.layout) {
      case "single":
        return "grid-cols-1";
      case "two-columns":
        return "grid-cols-2";
      case "two-columns-asymmetric":
        return "grid-cols-3";
      case "three-columns":
        return "grid-cols-3";
      default:
        return "grid-cols-1";
    }
  };

  const getColumnSpan = (columnIndex: number) => {
    if (row.layout === "two-columns-asymmetric") {
      return columnIndex === 0 ? "col-span-1" : "col-span-2";
    }
    return "col-span-1";
  };

  return (
    <div 
      className={`w-full rounded-lg p-2 transition-all ${
        !isPreviewMode && isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={!isPreviewMode ? (e) => {
        e.stopPropagation();
        onSelectRow(row.id);
      } : undefined}
    >
      <div className={`grid ${getColumnClasses()} gap-4`}>
        {row.columns.map((column, columnIndex) => {
          const dropZoneId = `${row.id}-${columnIndex}`;
          const { setNodeRef, isOver } = useDroppable({ id: dropZoneId });

          return (
            <div
              key={columnIndex}
              ref={setNodeRef}
              className={`${getColumnSpan(columnIndex)} rounded-lg p-4 flex flex-col gap-3 ${
                isPreviewMode 
                  ? 'min-h-0' 
                  : `min-h-[150px] border-2 border-dashed ${isOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}`
              } ${!isPreviewMode && isSelected && selectedColumn === columnIndex ? 'border-primary' : ''}`}
              onClick={!isPreviewMode ? (e) => {
                e.stopPropagation();
                onSelectRow(row.id);
                onSelectColumn(columnIndex);
              } : undefined}
            >
              {column.length === 0 && !isPreviewMode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm">Arraste componentes aqui</span>
                </div>
              ) : (
                column.map((component) => (
                  <ComponentRenderer
                    key={component.id}
                    component={component}
                    customization={customization}
                    isSelected={selectedComponentId === component.id}
                    onClick={() => !isPreviewMode && onSelectComponent(component.id)}
                    isPreviewMode={isPreviewMode}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';

const CheckoutPreviewComponent = ({
  customization,
  viewMode,
  selectedComponentId,
  onSelectComponent,
  selectedRowId,
  onSelectRow,
  selectedColumn,
  onSelectColumn,
  isPreviewMode = false,
  productData,
  orderBumps = [],
}: CheckoutPreviewProps) => {
  const [selectedPayment, setSelectedPayment] = useState<"pix" | "credit_card">("pix");
  const [selectedBumps, setSelectedBumps] = useState<Set<string>>(new Set());
  const { setNodeRef: setTopRef, isOver: isTopOver } = useDroppable({ id: "top-drop-zone" });
  const { setNodeRef: setBottomRef, isOver: isBottomOver } = useDroppable({ id: "bottom-drop-zone" });

  const productPrice = productData?.price ? Number(productData.price) : 0;
  const bumpsTotal = Array.from(selectedBumps).reduce((total, bumpId) => {
    const bump = orderBumps.find(b => b.id === bumpId);
    return total + (bump ? Number(bump.price) : 0);
  }, 0);
  const totalPrice = productPrice + bumpsTotal;

  // Normaliza cor do botão (suporta string ou objeto)
  const buttonBackgroundColor =
    typeof customization.design.colors.button === 'string'
      ? customization.design.colors.button
      : customization.design.colors.button?.background || '#10B981';

  const buttonTextColor =
    typeof customization.design.colors.button === 'string'
      ? '#FFFFFF'
      : customization.design.colors.button?.text || '#FFFFFF';

  const toggleBump = (bumpId: string) => {
    setSelectedBumps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bumpId)) {
        newSet.delete(bumpId);
      } else {
        newSet.add(bumpId);
      }
      return newSet;
    });
  };

  return (
    <div 
      className="min-h-screen flex items-start justify-center p-6"
      style={{
        backgroundColor: customization.design.colors.background || "#FFFFFF",
        fontFamily: customization.design.font 
          ? `${customization.design.font}, system-ui, sans-serif` 
          : 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="w-full">
        <div className={viewMode === "mobile" ? "max-w-md mx-auto space-y-4" : "max-w-[1120px] mx-auto px-4 lg:px-6"}>
          <div className={viewMode === "mobile" ? "space-y-4" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"}>
            {/* Coluna Esquerda - Formulário */}
            <div className="space-y-4 min-w-0">
        {/* Top Drop Zone */}
        {!isPreviewMode && (
          <div
            ref={setTopRef}
            className={`min-h-[100px] rounded-lg border-2 border-dashed transition-all flex flex-col gap-3 p-4 ${
              isTopOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"
            }`}
          >
            {customization.topComponents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Plus className="w-6 h-6" />
                <span className="text-sm">Arraste componentes aqui</span>
              </div>
            ) : (
              customization.topComponents.map((component) => (
                <ComponentRenderer
                  key={component.id}
                  component={component}
                  customization={customization}
                  isSelected={selectedComponentId === component.id}
                  onClick={() => onSelectComponent(component.id)}
                  isPreviewMode={false}
                />
              ))
            )}
          </div>
        )}

        {/* Top Components (Preview Mode) */}
        {isPreviewMode && customization.topComponents.length > 0 && (
          <div className="space-y-3">
            {customization.topComponents.map((component) => (
              <ComponentRenderer
                key={component.id}
                component={component}
                customization={customization}
                isSelected={false}
                onClick={() => {}}
                isPreviewMode={true}
              />
            ))}
          </div>
        )}

        {/* Custom Rows Area */}
        {customization.rows.length > 0 && (
          <div className="space-y-4">
            {customization.rows.map((row) => (
              <RowRenderer
                key={row.id}
                row={row}
                customization={customization}
                selectedComponentId={selectedComponentId}
                onSelectComponent={onSelectComponent}
                isSelected={selectedRowId === row.id}
                onSelectRow={onSelectRow}
                selectedColumn={selectedColumn}
                onSelectColumn={onSelectColumn}
                isPreviewMode={isPreviewMode}
              />
            ))}
          </div>
        )}

        {/* Product Header + Customer Data Form - UNIFICADOS */}
        <div 
          className="rounded-xl shadow-sm p-5 mb-4"
          style={{ backgroundColor: customization.design.colors.formBackground || "#FFFFFF" }}
        >
          {/* Product Header */}
          <div className="flex items-center gap-3 mb-5">
            {productData?.image_url ? (
              <img
                src={productData.image_url}
                alt={productData.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                <span className="text-gray-400">IMG</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 
                className="text-base font-bold mb-1"
                style={{ color: customization.design.colors.primaryText || "#000000" }}
              >
                {productData?.name || "Nome do Produto"}
              </h3>
              <p 
                className="text-lg font-bold"
                style={{ color: customization.design.colors.primaryText || "#000000" }}
              >
                {productData?.price ? formatCentsToBRL(productData.price) : 'R$ 0,00'}
              </p>
              <p 
                className="text-xs mt-0.5"
                style={{ color: customization.design.colors.secondaryText || "#6B7280" }}
              >
                à vista
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-5"></div>

          {/* Customer Data Form */}
          <div className="space-y-3">
          <h2 
            className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight"
            style={{ color: customization.design.colors.primaryText || "#000000" }}
          >
            <User className="w-5 h-5" />
            Seus dados
          </h2>
          
          <div className="space-y-3">
            <div>
              <label 
                className="text-sm mb-1 block"
                style={{ color: customization.design.colors.secondaryText || "#374151" }}
              >
                Nome completo
              </label>
              <input
                type="text"
                placeholder="Digite seu nome completo"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                style={{
                  backgroundColor: customization.design.colors.formBackground || "#FFFFFF",
                  color: customization.design.colors.primaryText || "#000000",
                }}
              />
            </div>
            
            <div>
              <label 
                className="text-sm mb-1 block"
                style={{ color: customization.design.colors.secondaryText || "#374151" }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="Digite seu email"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                style={{
                  backgroundColor: customization.design.colors.formBackground || "#FFFFFF",
                  color: customization.design.colors.primaryText || "#000000",
                }}
              />
            </div>

            <div>
              <label 
                className="text-sm mb-1 block"
                style={{ color: customization.design.colors.secondaryText || "#374151" }}
              >
                CPF/CNPJ
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                style={{
                  backgroundColor: customization.design.colors.formBackground || "#FFFFFF",
                  color: customization.design.colors.primaryText || "#000000",
                }}
              />
            </div>

            <div>
              <label 
                className="text-sm mb-1 block"
                style={{ color: customization.design.colors.secondaryText || "#374151" }}
              >
                Celular
              </label>
              <input
                type="tel"
                placeholder="+55 (00) 00000-0000"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                style={{
                  backgroundColor: customization.design.colors.formBackground || "#FFFFFF",
                  color: customization.design.colors.primaryText || "#000000",
                }}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Payment Method */}
        <div 
          className="rounded-xl shadow-sm p-5"
          style={{ backgroundColor: customization.design.colors.formBackground || "#FFFFFF" }}
        >
          <h2 
            className="text-lg font-bold mb-4 flex items-center gap-2 tracking-tight"
            style={{ color: customization.design.colors.primaryText || "#000000" }}
          >
            <Wallet className="w-5 h-5" />
            Pagamento
          </h2>
          
          <div className="space-y-2.5 mb-4">
            <button
              type="button"
              onClick={() => setSelectedPayment('pix')}
              className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left"
              style={{
                backgroundColor: selectedPayment === 'pix' 
                  ? (customization.design.colors.selectedButton?.background || "#10B981") + "20"
                  : customization.design.colors.unselectedButton?.background || "#FFFFFF",
                borderColor: selectedPayment === 'pix'
                  ? customization.design.colors.selectedButton?.background || "#10B981"
                  : customization.design.colors.unselectedButton?.background || "#E5E7EB",
              }}
            >
              <div className="flex items-center gap-3">
                <PixIcon 
                  className="w-5 h-5" 
                  color={selectedPayment === 'pix' 
                    ? (customization.design.colors.selectedButton?.icon || "#00A868")
                    : (customization.design.colors.unselectedButton?.icon || "#00A868")
                  } 
                />
                <span 
                  className="font-semibold text-sm"
                  style={{
                    color: selectedPayment === 'pix'
                      ? customization.design.colors.selectedButton?.text || "#000000"
                      : customization.design.colors.unselectedButton?.text || "#000000"
                  }}
                >
                  PIX
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPayment('credit_card')}
              className="w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left"
              style={{
                backgroundColor: selectedPayment === 'credit_card' 
                  ? (customization.design.colors.selectedButton?.background || "#3B82F6") + "20"
                  : customization.design.colors.unselectedButton?.background || "#FFFFFF",
                borderColor: selectedPayment === 'credit_card'
                  ? customization.design.colors.selectedButton?.background || "#3B82F6"
                  : customization.design.colors.unselectedButton?.background || "#E5E7EB",
              }}
            >
              <div className="flex items-center gap-3">
                <CreditCardIcon 
                  className="w-5 h-5" 
                  color={selectedPayment === 'credit_card' 
                    ? (customization.design.colors.selectedButton?.icon || "#3B82F6")
                    : (customization.design.colors.unselectedButton?.icon || "#3B82F6")
                  } 
                />
                <span 
                  className="font-semibold text-sm"
                  style={{
                    color: selectedPayment === 'credit_card'
                      ? customization.design.colors.selectedButton?.text || "#000000"
                      : customization.design.colors.unselectedButton?.text || "#000000"
                  }}
                >
                  Cartão de Crédito
                </span>
              </div>
            </button>
          </div>

          {selectedPayment === 'pix' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2 mb-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircleFilledIcon size={18} color="#10B981" className="flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-green-800 leading-relaxed font-medium">Liberação imediata</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircleFilledIcon size={18} color="#10B981" className="flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-green-800 leading-relaxed font-medium">É simples, só usar o aplicativo de seu banco para pagar Pix</span>
                </div>
              </div>

              {/* Resumo do Pedido - PIX */}
              <div 
                className="border rounded-lg p-4"
                style={{ 
                  backgroundColor: customization.design.colors.orderSummary?.background || "#F9FAFB",
                  borderColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB",
                }}
              >
                <h4 
                  className="font-semibold mb-3 text-sm tracking-tight"
                  style={{ color: customization.design.colors.orderSummary?.titleText || "#000000" }}
                >
                  Resumo do pedido
                </h4>
                
                <div className="flex items-start gap-3 mb-3">
                  {productData?.image_url ? (
                    <img 
                      src={productData.image_url} 
                      alt={productData?.name || 'Produto'}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 
                      className="text-sm font-medium leading-tight"
                      style={{ color: customization.design.colors.orderSummary?.productName || "#000000" }}
                    >
                      {productData?.name || "Nome do Produto"}
                    </h5>
                    <p 
                      className="text-base font-bold mt-0.5"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      {productData?.price ? formatCentsToBRL(productData.price) : 'R$ 0,00'}
                    </p>
                  </div>
                </div>

                <div 
                  className="space-y-1.5 text-sm border-t pt-2.5"
                  style={{ borderTopColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB" }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: customization.design.colors.orderSummary?.labelText || "#6B7280" }}>
                      Produto
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      {productData?.price ? formatCentsToBRL(productData.price) : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: customization.design.colors.orderSummary?.labelText || "#6B7280" }}>
                      Taxa de serviço
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      R$ 0,99
                    </span>
                  </div>
                  <div 
                    className="flex justify-between text-sm font-bold pt-1.5 border-t"
                    style={{ borderTopColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB" }}
                  >
                    <span style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}>
                      Total
                    </span>
                    <span style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}>
                      {formatCentsToBRL(totalPrice)}
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
                className="border rounded-lg p-4"
                style={{ 
                  backgroundColor: customization.design.colors.orderSummary?.background || "#F9FAFB",
                  borderColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB",
                }}
              >
                <h4 
                  className="font-semibold mb-3 text-sm tracking-tight"
                  style={{ color: customization.design.colors.orderSummary?.titleText || "#000000" }}
                >
                  Resumo do pedido
                </h4>
                
                <div className="flex items-start gap-3 mb-3">
                  {productData?.image_url ? (
                    <img 
                      src={productData.image_url} 
                      alt={productData?.name || 'Produto'}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h5 
                      className="text-sm font-medium leading-tight"
                      style={{ color: customization.design.colors.orderSummary?.productName || "#000000" }}
                    >
                      {productData?.name || "Nome do Produto"}
                    </h5>
                    <p 
                      className="text-base font-bold mt-0.5"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      {productData?.price ? formatCentsToBRL(productData.price) : 'R$ 0,00'}
                    </p>
                  </div>
                </div>

                <div 
                  className="space-y-1.5 text-sm border-t pt-2.5"
                  style={{ borderTopColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB" }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: customization.design.colors.orderSummary?.labelText || "#6B7280" }}>
                      Produto
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      {productData?.price ? formatCentsToBRL(productData.price) : 'R$ 0,00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: customization.design.colors.orderSummary?.labelText || "#6B7280" }}>
                      Taxa de serviço
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}
                    >
                      R$ 0,99
                    </span>
                  </div>
                  <div 
                    className="flex justify-between text-sm font-bold pt-1.5 border-t"
                    style={{ borderTopColor: customization.design.colors.orderSummary?.borderColor || "#D1D5DB" }}
                  >
                    <span style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}>
                      Total
                    </span>
                    <span style={{ color: customization.design.colors.orderSummary?.priceText || "#000000" }}>
                      {formatCentsToBRL(totalPrice)}
                    </span>
                  </div>
                </div>

                <p 
                  className="text-xs mt-2"
                  style={{ color: customization.design.colors.orderSummary?.labelText || "#6B7280" }}
                >
                  à vista no Cartão de Crédito
                </p>
              </div>
            </>
          )}

          <button
            className="w-full mt-5 py-3.5 rounded-lg font-bold text-base transition-all duration-200 hover:opacity-90 shadow-sm"
            style={{
              backgroundColor: buttonBackgroundColor,
              color: buttonTextColor
            }}
          >
            {selectedPayment === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão de Crédito'}
          </button>
        </div>


        {/* Order Bumps */}
        {orderBumps.length > 0 && (
          <div className="space-y-3">
            {orderBumps.map((bump) => (
              <div
                key={bump.id}
                className="p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-md"
                style={{
                  backgroundColor: selectedBumps.has(bump.id) 
                    ? customization.design.colors.active + "10" 
                    : customization.design.colors.background,
                  borderColor: selectedBumps.has(bump.id) 
                    ? customization.design.colors.active 
                    : "#E5E7EB",
                }}
                onClick={() => toggleBump(bump.id)}
              >
                {/* Call to Action */}
                {bump.call_to_action && (
                  <div className="flex items-start gap-2 mb-3">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: customization.design.colors.active + "20" }}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: customization.design.colors.active }}
                      ></div>
                    </div>
                    <h5 
                      className="text-sm font-semibold"
                      style={{ color: customization.design.colors.primaryText }}
                    >
                      {bump.call_to_action}
                    </h5>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBumps.has(bump.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleBump(bump.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                    style={{ accentColor: customization.design.colors.active }}
                  />
                  
                  {/* Imagem (condicional) */}
                  {bump.image_url && (
                    <img
                      src={bump.image_url}
                      alt={bump.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h5
                      className="font-semibold mb-1"
                      style={{ color: customization.design.colors.primaryText }}
                    >
                      {bump.name}
                    </h5>
                    
                    {bump.description && (
                      <p
                        className="text-sm mb-2"
                        style={{ color: customization.design.colors.secondaryText }}
                      >
                        {bump.description}
                      </p>
                    )}
                    
                    {/* Preço com desconto */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {bump.original_price && bump.discount_percentage > 0 ? (
                        <>
                          <span 
                            className="text-sm line-through" 
                            style={{ color: customization.design.colors.secondaryText }}
                          >
                            {formatCentsToBRL(Number(bump.original_price))}
                          </span>
                          <span 
                            className="font-bold" 
                            style={{ color: customization.design.colors.active }}
                          >
                            {formatCentsToBRL(Number(bump.price))}
                          </span>
                          <span 
                            className="text-xs px-2 py-1 rounded font-semibold" 
                            style={{ 
                              backgroundColor: customization.design.colors.active,
                              color: '#fff'
                            }}
                          >
                            {bump.discount_percentage}% OFF
                          </span>
                        </>
                      ) : (
                        <span 
                          className="font-bold" 
                          style={{ color: customization.design.colors.active }}
                        >
                          + {formatCentsToBRL(Number(bump.price))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer com Informações Legais */}
        <div 
          className="rounded-xl shadow-sm p-5 mt-5 text-center"
          style={{ backgroundColor: customization.design.colors.footer?.background || "#FFFFFF" }}
        >
          <div className="space-y-3">
            {/* Logo/Nome + Processador */}
            <p 
              className="text-xs leading-relaxed"
              style={{ color: customization.design.colors.footer?.secondaryText || "#6B7280" }}
            >
              <span 
                className="font-bold"
                style={{ color: customization.design.colors.footer?.primaryText || "#000000" }}
              >
                Rise Checkout
              </span> está processando este pagamento para o vendedor{' '}
              <span 
                className="font-semibold"
                style={{ color: customization.design.colors.footer?.primaryText || "#000000" }}
              >
                {productData?.seller_name || productData?.support_name || 'Vendedor'}
              </span>
            </p>

            {/* Compra Segura com Check */}
            <div className="flex items-center justify-center gap-2">
              <CheckCircleFilledIcon size={16} color="#10B981" />
              <span 
                className="text-xs font-semibold"
                style={{ color: customization.design.colors.footer?.primaryText || "#000000" }}
              >
                Compra 100% segura
              </span>
            </div>

            {/* reCAPTCHA */}
            <p 
              className="text-xs leading-relaxed"
              style={{ color: customization.design.colors.footer?.secondaryText || "#6B7280" }}
            >
              Este site é protegido pelo reCAPTCHA do Google
            </p>
          </div>
        </div>

        {/* Bottom Drop Zone */}
        {!isPreviewMode && (
          <div
            ref={setBottomRef}
            className={`min-h-[100px] rounded-lg border-2 border-dashed transition-all flex flex-col gap-3 p-4 ${
              isBottomOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"
            }`}
          >
            {customization.bottomComponents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Plus className="w-6 h-6" />
                <span className="text-sm">Arraste componentes aqui</span>
              </div>
            ) : (
              customization.bottomComponents.map((component) => (
                <ComponentRenderer
                  key={component.id}
                  component={component}
                  customization={customization}
                  isSelected={selectedComponentId === component.id}
                  onClick={() => onSelectComponent(component.id)}
                  isPreviewMode={false}
                />
              ))
            )}
          </div>
        )}

        {/* Bottom Components (Preview Mode) */}
        {isPreviewMode && customization.bottomComponents.length > 0 && (
          <div className="space-y-3">
            {customization.bottomComponents.map((component) => (
              <ComponentRenderer
                key={component.id}
                component={component}
                customization={customization}
                isSelected={false}
                onClick={() => {}}
                isPreviewMode={true}
              />
            ))}
          </div>
        )}
            </div>

            {/* Coluna Direita - Sidebar (apenas desktop) */}
            {viewMode !== "mobile" && (
              <aside className="hidden lg:block min-w-0">
              <div className="sticky top-6 space-y-3">
                {/* Card Principal */}
                <div 
                  className="rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: customization.design.colors.securePurchase?.cardBackground || "#FFFFFF" }}
                >
                  {/* Cabeçalho */}
                  <div 
                    className="px-4 py-3 flex items-center gap-2"
                    style={{ backgroundColor: customization.design.colors.securePurchase?.headerBackground || "#10B981" }}
                  >
                    <LockIcon 
                      size={16} 
                      color={customization.design.colors.securePurchase?.headerText || "#FFFFFF"} 
                    />
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: customization.design.colors.securePurchase?.headerText || "#FFFFFF" }}
                    >
                      Compra segura
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Mini Preview do Produto */}
                    <div className="flex items-start gap-3">
                      {productData?.image_url ? (
                        <img
                          src={productData.image_url}
                          alt={productData.name}
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">IMG</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h5 
                          className="text-sm font-medium leading-tight"
                          style={{ color: customization.design.colors.securePurchase?.primaryText || "#000000" }}
                        >
                          {productData?.name || "Nome do Produto"}
                        </h5>
                        <p 
                          className="text-xs mt-1"
                          style={{ color: customization.design.colors.securePurchase?.secondaryText || "#6B7280" }}
                        >
                          Precisa de ajuda?
                        </p>
                        <a 
                          href="#" 
                          className="text-xs hover:underline"
                          style={{ color: customization.design.colors.securePurchase?.linkText || "#3B82F6" }}
                        >
                          Veja o contato do vendedor
                        </a>
                      </div>
                    </div>

                    {/* Linha Divisória */}
                    <div className="border-t border-dashed border-gray-300"></div>

                    {/* Total */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span 
                          className="text-sm"
                          style={{ color: customization.design.colors.securePurchase?.secondaryText || "#6B7280" }}
                        >
                          Total
                        </span>
                        <span 
                          className="text-xl font-bold"
                          style={{ color: customization.design.colors.securePurchase?.primaryText || "#000000" }}
                        >
                          {formatCentsToBRL(totalPrice)}
                        </span>
                      </div>
                      <p 
                        className="text-xs"
                        style={{ color: customization.design.colors.securePurchase?.secondaryText || "#6B7280" }}
                      >
                        à vista no {selectedPayment === 'pix' ? 'PIX' : 'Cartão'}
                      </p>
                      <p 
                        className="text-xs"
                        style={{ color: customization.design.colors.securePurchase?.secondaryText || "#6B7280" }}
                      >
                        Renovação atual
                      </p>
                    </div>

                    {/* Linha Divisória */}
                    <div className="border-t border-dashed border-gray-300"></div>

                    {/* Informações Legais */}
                    <div 
                      className="space-y-2 text-xs"
                      style={{ color: customization.design.colors.securePurchase?.secondaryText || "#6B7280" }}
                    >
                      <p>
                        <span 
                          className="font-semibold"
                          style={{ color: customization.design.colors.securePurchase?.primaryText || "#000000" }}
                        >
                          Rise Checkout
                        </span> está processando este pagamento para o vendedor{' '}
                        <span 
                          className="font-semibold"
                          style={{ color: customization.design.colors.securePurchase?.primaryText || "#000000" }}
                        >
                          {productData?.support_name || 'Vendedor'}
                        </span>
                      </p>
                      <p>Este site é protegido pelo reCAPTCHA do Google</p>
                    </div>
                  </div>
                </div>
              </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Remover React.memo temporariamente para forçar re-render e debug
export const CheckoutPreview = CheckoutPreviewComponent;

