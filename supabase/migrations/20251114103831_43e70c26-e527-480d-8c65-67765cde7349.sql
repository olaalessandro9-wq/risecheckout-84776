-- ============================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA - RLS em Tabelas Expostas
-- Data: 14/11/2024
-- Objetivo: Habilitar Row-Level Security nas tabelas públicas
-- ============================================================

-- 1. Habilitar RLS na tabela trigger_debug_logs (CRÍTICO)
ALTER TABLE public.trigger_debug_logs ENABLE ROW LEVEL SECURITY;

-- 2. Criar política restritiva: apenas service_role pode acessar logs de debug
CREATE POLICY "Service role only access to debug logs"
ON public.trigger_debug_logs
FOR ALL
USING (false);  -- Ninguém tem acesso via RLS, apenas service_role bypassa RLS

-- 3. Comentário explicativo
COMMENT ON TABLE public.trigger_debug_logs IS 
'Logs de debug do sistema. Acesso restrito apenas ao service_role para evitar exposição de informações sensíveis.';

-- 4. Verificar se a tabela webhook_products existe antes de habilitar RLS
DO $$
BEGIN
  -- Verificar se a tabela webhook_products existe
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'webhook_products'
  ) THEN
    -- Habilitar RLS na tabela webhook_products
    ALTER TABLE public.webhook_products ENABLE ROW LEVEL SECURITY;
    
    -- Criar política: apenas vendedores donos do webhook podem ver/editar
    CREATE POLICY "Vendors manage own webhook products"
    ON public.webhook_products
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.outbound_webhooks w
        WHERE w.id = webhook_products.webhook_id
        AND w.vendor_id = auth.uid()
      )
    );
    
    RAISE NOTICE 'RLS habilitado na tabela webhook_products';
  ELSE
    RAISE NOTICE 'Tabela webhook_products não existe, pulando...';
  END IF;
END $$;