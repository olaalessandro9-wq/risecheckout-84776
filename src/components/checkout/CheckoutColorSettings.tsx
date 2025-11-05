import { ColorPicker } from "./ColorPicker";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THEME_PRESETS, FONT_OPTIONS } from "@/lib/checkout/themePresets";
import { Label } from "@/components/ui/label";

interface CheckoutColorSettingsProps {
  customization: any;
  onUpdate: (field: string, value: any) => void;
}

export const CheckoutColorSettings = ({ customization, onUpdate }: CheckoutColorSettingsProps) => {
  const handleThemeChange = (themeName: 'light' | 'dark' | 'custom') => {
    if (themeName === 'custom') {
      // Apenas muda o theme para custom, mantém as cores atuais
      onUpdate('design.theme', themeName);
    } else {
      // Aplica TODAS as cores do preset
      const preset = THEME_PRESETS[themeName];
      onUpdate('design', {
        ...customization.design,
        theme: themeName,
        colors: preset.colors,
      });
    }
  };

  const handleFontChange = (font: string) => {
    onUpdate('design.font', font);
  };

  return (
    <div className="space-y-6 p-4 min-w-[400px] w-[400px]">
      {/* Tema e Fonte */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tema e Fonte</h3>
        
        {/* SELETOR DE TEMA */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tema</Label>
          <Select
            value={customization.design?.theme || 'custom'}
            onValueChange={handleThemeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro (Light)</SelectItem>
              <SelectItem value="dark">Escuro (Dark)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {customization.design?.theme === 'light' && 'Tema claro padrão aplicado'}
            {customization.design?.theme === 'dark' && 'Tema escuro padrão aplicado'}
            {(!customization.design?.theme || customization.design?.theme === 'custom') && 'Tema personalizado - você pode editar todas as cores abaixo'}
          </p>
        </div>
        
        {/* SELETOR DE FONTE */}
        <div className="space-y-2 relative">
          <Label className="text-sm font-medium">Fonte</Label>
          <Select
            value={customization.design?.font || 'Inter'}
            onValueChange={handleFontChange}
          >
            <SelectTrigger className="will-change-auto">
              <SelectValue placeholder="Selecione a fonte" />
            </SelectTrigger>
            <SelectContent className="will-change-transform">
              {FONT_OPTIONS.map(font => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Cores Gerais */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Cores Gerais</h3>
        <ColorPicker
          label="Cor de Fundo Principal"
          value={customization.design?.colors?.background || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.background', value)}
          description="Fundo geral do checkout"
        />
        <ColorPicker
          label="Cor do Texto Principal"
          value={customization.design?.colors?.primaryText || '#000000'}
          onChange={(value) => onUpdate('design.colors.primaryText', value)}
          description="Títulos e textos principais"
        />
        <ColorPicker
          label="Cor do Texto Secundário"
          value={customization.design?.colors?.secondaryText || '#6B7280'}
          onChange={(value) => onUpdate('design.colors.secondaryText', value)}
          description="Descrições e subtítulos"
        />
      </div>

      <Separator />

      {/* Formulário de Pagamento */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Formulário de Pagamento</h3>
        <ColorPicker
          label="Cor de Fundo do Formulário"
          value={customization.design?.colors?.formBackground || '#F9FAFB'}
          onChange={(value) => onUpdate('design.colors.formBackground', value)}
          description="Fundo da seção de pagamento"
        />
      </div>

      <Separator />

      {/* Botões de Seleção (PIX, Cartão) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Botões de Seleção (PIX, Cartão)</h3>
        <h4 className="text-md font-semibold">Não Selecionado</h4>
        <ColorPicker
          label="Cor do Texto"
          value={customization.design?.colors?.unselectedButton?.text || '#000000'}
          onChange={(value) => onUpdate('design.colors.unselectedButton.text', value)}
        />
        <ColorPicker
          label="Cor de Fundo"
          value={customization.design?.colors?.unselectedButton?.background || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.unselectedButton.background', value)}
        />
        <ColorPicker
          label="Cor do Ícone"
          value={customization.design?.colors?.unselectedButton?.icon || '#000000'}
          onChange={(value) => onUpdate('design.colors.unselectedButton.icon', value)}
        />
        <h4 className="text-md font-semibold">Selecionado</h4>
        <ColorPicker
          label="Cor do Texto"
          value={customization.design?.colors?.selectedButton?.text || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.selectedButton.text', value)}
        />
        <ColorPicker
          label="Cor de Fundo"
          value={customization.design?.colors?.selectedButton?.background || '#10B981'}
          onChange={(value) => onUpdate('design.colors.selectedButton.background', value)}
          description="Padrão verde"
        />
        <ColorPicker
          label="Cor do Ícone"
          value={customization.design?.colors?.selectedButton?.icon || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.selectedButton.icon', value)}
        />
      </div>

      <Separator />

      {/* Botão Principal de Pagamento */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Botão Principal de Pagamento</h3>
        <ColorPicker
          label="Cor do Texto"
          value={customization.design?.colors?.button?.text || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.button.text', value)}
        />
        <ColorPicker
          label="Cor de Fundo"
          value={customization.design?.colors?.button?.background || '#10B981'}
          onChange={(value) => onUpdate('design.colors.button.background', value)}
          description="Padrão verde"
        />
      </div>

      <Separator />

      {/* Resumo do Pedido */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Resumo do Pedido</h3>
        <ColorPicker
          label="Cor de Fundo"
          value={customization.design?.colors?.orderSummary?.background || '#F9FAFB'}
          onChange={(value) => onUpdate('design.colors.orderSummary.background', value)}
          description="Fundo do bloco 'Resumo do pedido'"
        />
        <ColorPicker
          label="Título"
          value={customization.design?.colors?.orderSummary?.titleText || '#000000'}
          onChange={(value) => onUpdate('design.colors.orderSummary.titleText', value)}
          description="Texto 'Resumo do pedido'"
        />
        <ColorPicker
          label="Nome do Produto"
          value={customization.design?.colors?.orderSummary?.productName || '#000000'}
          onChange={(value) => onUpdate('design.colors.orderSummary.productName', value)}
        />
        <ColorPicker
          label="Preços"
          value={customization.design?.colors?.orderSummary?.priceText || '#000000'}
          onChange={(value) => onUpdate('design.colors.orderSummary.priceText', value)}
          description="Valores em destaque"
        />
        <ColorPicker
          label="Labels (Produto, Taxa, Total)"
          value={customization.design?.colors?.orderSummary?.labelText || '#6B7280'}
          onChange={(value) => onUpdate('design.colors.orderSummary.labelText', value)}
        />
        <ColorPicker
          label="Cor das Bordas"
          value={customization.design?.colors?.orderSummary?.borderColor || '#D1D5DB'}
          onChange={(value) => onUpdate('design.colors.orderSummary.borderColor', value)}
        />
      </div>

      <Separator />

      {/* Rodapé */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Rodapé (Footer)</h3>
        <ColorPicker
          label="Cor de Fundo"
          value={customization.design?.colors?.footer?.background || '#FFFFFF'}
          onChange={(value) => onUpdate('design.colors.footer.background', value)}
          description="Fundo do bloco do rodapé"
        />
        <ColorPicker
          label="Texto Principal"
          value={customization.design?.colors?.footer?.primaryText || '#000000'}
          onChange={(value) => onUpdate('design.colors.footer.primaryText', value)}
          description="'Rise Checkout' e nome do vendedor"
        />
        <ColorPicker
          label="Texto Secundário"
          value={customization.design?.colors?.footer?.secondaryText || '#6B7280'}
          onChange={(value) => onUpdate('design.colors.footer.secondaryText', value)}
          description="Textos explicativos"
        />
      </div>

    </div>
  );
};
