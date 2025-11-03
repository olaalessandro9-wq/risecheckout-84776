/**
 * Módulo CORS com whitelist e headers completos
 * 
 * Corrige os seguintes problemas:
 * 1. Adiciona x-client-info, apikey e prefer aos headers permitidos
 * 2. Preflight OPTIONS retorna 204 No Content (padrão HTTP)
 * 3. Allow-Credentials false para evitar conflitos com origem vazia
 */

/**
 * Gera headers CORS permitindo qualquer origem
 * 
 * @param origin - Origem da requisição (não usado, permitimos todas)
 * @returns Headers CORS para incluir na resposta
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': [
      'authorization',
      'content-type',
      'apikey',
      'x-client-info',
      'prefer',
      'x-requested-with',
    ].join(', '),
    'Access-Control-Allow-Credentials': 'false',
  };
}

/**
 * Trata requisições OPTIONS (preflight)
 * 
 * Retorna 204 No Content (padrão HTTP para preflight)
 * 
 * @param req - Requisição OPTIONS
 * @returns Response 204 No Content com headers CORS
 */
export function handleOptions(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders(origin) 
  });
}

/**
 * Helper para retornar resposta JSON com CORS
 * 
 * @param req - Requisição original
 * @param body - Corpo da resposta (será convertido para JSON)
 * @param init - Opções adicionais de Response
 * @returns Response com JSON e headers CORS
 */
export function withCorsJson(
  req: Request, 
  body: unknown, 
  init?: ResponseInit
): Response {
  const origin = req.headers.get('origin');
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json', 
      ...corsHeaders(origin) 
    },
    ...init,
  });
}

/**
 * Helper para retornar erro JSON com CORS
 * 
 * @param req - Requisição original
 * @param message - Mensagem de erro
 * @param status - Código HTTP de erro (padrão: 400)
 * @returns Response com erro JSON e headers CORS
 */
export function withCorsError(
  req: Request, 
  message: string, 
  status = 400
): Response {
  const origin = req.headers.get('origin');
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 
      'Content-Type': 'application/json', 
      ...corsHeaders(origin) 
    },
  });
}
