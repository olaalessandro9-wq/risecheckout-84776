import { THEME_PRESETS, ThemePreset } from './themePresets';

/**
 * Normaliza o design do checkout mesclando:
 * 1. Preset do tema (light/dark)
 * 2. JSON salvo em checkout.design
 * 3. Colunas legadas (background_color, button_color, etc.)
 * 
 * Garante que todas as propriedades de cores necessárias existam,
 * sem usar "cores mágicas" hardcoded.
 */
export function normalizeDesign(checkout: any): ThemePreset {
  // 1. Base: preset do tema
  const theme = checkout.theme || checkout.design?.theme || 'light';
  const basePreset = THEME_PRESETS[theme as 'light' | 'dark'] || THEME_PRESETS.light;
  
  // 2. Deep clone do preset para não mutar o original
  const normalized: ThemePreset = JSON.parse(JSON.stringify(basePreset));
  
  // 3. Merge com design JSON salvo (se existir)
  if (checkout.design?.colors) {
    deepMerge(normalized.colors, checkout.design.colors);
  }
  
  // 4. Merge com colunas legadas APENAS como fallback (não sobrescrever design salvo)
  const hasDesignColors = checkout.design?.colors && Object.keys(checkout.design.colors).length > 0;
  
  // Só usar legado se não houver valor no design JSON
  if (checkout.background_color && !hasDesignColors) {
    normalized.colors.background = checkout.background_color;
  }
  if (checkout.text_color && !checkout.design?.colors?.primaryText) {
    normalized.colors.primaryText = checkout.text_color;
  }
  if (checkout.primary_color && !checkout.design?.colors?.active) {
    normalized.colors.active = checkout.primary_color;
    // Se não tiver cores de botões selecionados, usar a cor primária
    if (!checkout.design?.colors?.selectedButton?.background) {
      normalized.colors.selectedButton.background = checkout.primary_color;
    }
  }
  if (checkout.button_color && !checkout.design?.colors?.button?.background) {
    normalized.colors.button.background = checkout.button_color;
  }
  if (checkout.button_text_color && !checkout.design?.colors?.button?.text) {
    normalized.colors.button.text = checkout.button_text_color;
  }
  
  // 5. Garantir propriedades derivadas se não existirem
  if (!normalized.colors.border) {
    normalized.colors.border = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  }
  
  if (!normalized.colors.placeholder) {
    normalized.colors.placeholder = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  }
  
  if (!normalized.colors.inputBackground) {
    normalized.colors.inputBackground = normalized.colors.formBackground;
  }
  
  // Info box para PIX (usar cores derivadas do active se não existir)
  if (!normalized.colors.infoBox) {
    const activeColor = normalized.colors.active;
    normalized.colors.infoBox = {
      background: theme === 'dark' ? 'rgba(16,185,129,0.1)' : '#ECFDF5',
      border: theme === 'dark' ? 'rgba(16,185,129,0.3)' : '#A7F3D0',
      text: theme === 'dark' ? '#D1FAE5' : '#047857',
    };
  }
  
  return normalized;
}

/**
 * Deep merge de objetos
 */
function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
