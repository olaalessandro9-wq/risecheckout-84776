/**
 * Normaliza Data URLs de imagens base64, removendo duplicações e garantindo formato correto
 */
export function normalizeDataUrl(input: string): string {
  if (!input) {
    console.warn("⚠️ normalizeDataUrl: input vazio");
    return '';
  }
  
  // Remove espaços e quebras de linha
  let normalized = input.trim().replace(/\s+/g, '');
  
  // Remove múltiplas duplicações do prefixo (bug comum)
  const prefix = 'data:image/png;base64,';
  while (normalized.includes(prefix + prefix)) {
    normalized = normalized.replace(prefix + prefix, prefix);
  }
  
  // Remove outros tipos de duplicação
  normalized = normalized.replace(
    /^data:image\/(png|jpeg|jpg|gif|webp);base64,data:image\/(png|jpeg|jpg|gif|webp);base64,/gi,
    'data:image/$1;base64,'
  );
  
  // Adiciona prefixo se não existir
  if (!normalized.startsWith('data:image/')) {
    normalized = prefix + normalized;
  }
  
  // Validação final
  const isValid = normalized.startsWith('data:image/') && 
                  normalized.includes(';base64,') && 
                  normalized.length > 50;
  
  if (!isValid) {
    console.error("❌ normalizeDataUrl: resultado inválido", {
      startsWithData: normalized.startsWith('data:image/'),
      hasBase64: normalized.includes(';base64,'),
      length: normalized.length,
      preview: normalized.substring(0, 60)
    });
  }
  
  return normalized;
}
