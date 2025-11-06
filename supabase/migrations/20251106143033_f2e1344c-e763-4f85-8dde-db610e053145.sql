-- ============================================================================
-- Security Fix: Restrict Public Data Exposure on Business Intelligence Tables
-- ============================================================================
-- Issue: Overly permissive RLS policies expose complete product catalog,
--        checkout designs, and pricing strategies to competitors.
-- Solution: Restrict public access to only data associated with active
--           payment links being viewed, not entire catalogs.
-- ============================================================================

-- 1) CHECKOUTS: Only expose checkouts associated with active payment links
DROP POLICY IF EXISTS "public_read_active_checkouts" ON public.checkouts;

CREATE POLICY "public_view_checkout_via_active_payment_link"
ON public.checkouts FOR SELECT
TO public
USING (
  status = 'active'
  AND id IN (
    SELECT cl.checkout_id
    FROM public.checkout_links cl
    JOIN public.payment_links pl ON pl.id = cl.link_id
    WHERE pl.status = 'active'
  )
);

-- 2) PRODUCTS: Only expose products associated with active checkout flows
DROP POLICY IF EXISTS "public_read_active_products" ON public.products;

CREATE POLICY "public_view_products_via_active_checkouts"
ON public.products FOR SELECT
TO public
USING (
  status = 'active'
  AND id IN (
    SELECT DISTINCT c.product_id
    FROM public.checkouts c
    JOIN public.checkout_links cl ON cl.checkout_id = c.id
    JOIN public.payment_links pl ON pl.id = cl.link_id
    WHERE c.status = 'active' AND pl.status = 'active'
  )
);

-- 3) OFFERS: Only expose offers through active payment links
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers;

CREATE POLICY "public_view_offers_via_active_links"
ON public.offers FOR SELECT
TO public
USING (
  id IN (
    SELECT pl.offer_id
    FROM public.payment_links pl
    WHERE pl.status = 'active'
  )
);

-- ============================================================================
-- Result: Public users can only see data for checkouts/products/offers they
--         are actively viewing through a payment link, not entire catalogs.
-- Frontend compatibility: The get_checkout_by_payment_slug RPC function and
--         normal checkout flows continue working normally.
-- ============================================================================