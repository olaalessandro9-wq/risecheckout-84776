-- ============================================================================
-- SOFT DELETE: Adicionar status 'deleted' aos produtos
-- ============================================================================
-- Justificativa: Produtos com pedidos vinculados não podem ser excluídos
-- permanentemente devido a requisitos fiscais, de auditoria e compliance.
-- ============================================================================

-- 1) Remover constraint antiga de status (se existir)
ALTER TABLE public.products 
  DROP CONSTRAINT IF EXISTS products_status_check;

-- 2) Adicionar novo constraint incluindo 'deleted'
ALTER TABLE public.products 
  ADD CONSTRAINT products_status_check 
  CHECK (status IN ('active', 'blocked', 'deleted'));

-- 3) Criar índice para otimizar queries que filtram produtos deletados
CREATE INDEX IF NOT EXISTS idx_products_status 
  ON public.products(status) 
  WHERE status != 'deleted';

-- 4) Comentário na tabela para documentação
COMMENT ON COLUMN public.products.status IS 
  'Status do produto: active (visível), blocked (bloqueado), deleted (soft delete)';

-- ============================================================================
-- ✅ MIGRAÇÃO CONCLUÍDA
-- ============================================================================
-- Próximos passos:
-- 1. Atualizar deleteProductCascade para usar soft delete quando houver pedidos
-- 2. Filtrar produtos com status='deleted' na UI (ProductsTable)
-- 3. Atualizar RLS policies se necessário
-- ============================================================================