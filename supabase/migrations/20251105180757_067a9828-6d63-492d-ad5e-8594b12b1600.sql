-- ========================================
-- FUNÇÃO RPC PARA MAPEAR SLUG → CHECKOUT_ID (DROP e CREATE)
-- ========================================

-- Drop da função existente (que tinha assinatura diferente)
DROP FUNCTION IF EXISTS public.get_checkout_by_payment_slug(text);

-- Criar função com nova assinatura (retorna checkout_id e product_id)
CREATE OR REPLACE FUNCTION public.get_checkout_by_payment_slug(p_slug text)
RETURNS TABLE (
  checkout_id uuid,
  product_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cl.checkout_id,
    c.product_id
  FROM public.payment_links pl
  JOIN public.checkout_links cl ON cl.link_id = pl.id
  JOIN public.checkouts c ON c.id = cl.checkout_id
  WHERE pl.slug = p_slug
    AND pl.status = 'active'
    AND c.status = 'active'
  LIMIT 1;
$$;

-- Permitir que usuários anônimos chamem esta função
GRANT EXECUTE ON FUNCTION public.get_checkout_by_payment_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_by_payment_slug(text) TO authenticated;

-- ========================================
-- LIMPEZA DE POLICY PROBLEMÁTICA
-- ========================================

-- Remove a policy que causa erro 500 devido ao subselect
DROP POLICY IF EXISTS "cl_read_on_active_link_anon" ON public.checkout_links;

-- Adiciona GRANTs explícitos para evitar erros de permissão
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.payment_links TO anon;
GRANT SELECT ON public.checkout_links TO anon;