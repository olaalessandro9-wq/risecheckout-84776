-- Remove overly permissive public read policies on payment_links and checkout_links
-- These tables should not allow unrestricted enumeration

-- Drop the public read policy on payment_links
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payment_links;

-- Drop the public read policy on checkout_links  
DROP POLICY IF EXISTS "Enable read access for all users" ON public.checkout_links;

-- payment_links: Only allow access to active links (no full enumeration)
-- Note: The RPC function get_checkout_by_payment_slug should be used for secure access
CREATE POLICY "public_access_active_links_only"
ON public.payment_links FOR SELECT
TO public
USING (status = 'active');

-- checkout_links: Remove all public access
-- This mapping table should only be accessible server-side via RPC functions
-- Vendors can still manage their own checkout_links via the owner policies

-- Verify owner policies still exist for authenticated users
-- (These should already be in place from previous migrations)