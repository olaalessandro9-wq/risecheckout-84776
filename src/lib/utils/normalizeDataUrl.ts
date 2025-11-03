/**
 * Normaliza Data URLs de imagens base64, removendo duplicações e garantindo formato correto
 */
export function normalizeDataUrl(input: string): string {
  if (!input) return '';
  
  // Remove espaços e quebras de linha
  let normalized = input.trim().replace(/\s+/g, '');
  
  // Remove duplicação do prefixo (bug comum)
  normalized = normalized.replace(
    /^data:image\/png;base64,data:image\/png;base64,/,
    'data:image/png;base64,'
  );
  
  // Adiciona prefixo se não existir
  if (!normalized.startsWith('data:image/png;base64,')) {
    normalized = 'data:image/png;base64,' + normalized;
  }
  
  return normalized;
}
