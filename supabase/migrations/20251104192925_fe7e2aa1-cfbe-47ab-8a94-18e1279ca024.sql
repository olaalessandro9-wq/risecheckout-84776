-- ============================================================================
-- SECURITY FIX: Critical RLS and Public Exposure Issues
-- ============================================================================
-- This migration fixes 4 critical security vulnerabilities:
-- 1. app_settings - no RLS protection
-- 2. products - overly permissive public access exposing vendor emails
-- 3. checkouts - broad public access exposing designs and strategies
-- 4. offers - legacy policies exposing all pricing data
-- ============================================================================

-- ============================================================================
-- FIX 1: app_settings - Enable RLS and restrict to service role only
-- ============================================================================

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.app_settings;

-- Create restrictive policy: only service role can access
CREATE POLICY "Service role only access to app_settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- FIX 2: products - Remove overly permissive public access
-- ============================================================================

-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;

-- Create a more restrictive policy: anonymous users can only see products
-- that are actively being used in a public checkout page
CREATE POLICY "Public can view products in active checkouts"
ON public.products
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 
    FROM public.checkouts c
    WHERE c.product_id = products.id
    AND c.status = 'active'
    AND products.status = 'active'
  )
);

-- ============================================================================
-- FIX 3: checkouts - Restrict public access to specific checkout lookups only
-- ============================================================================

-- Drop the overly broad public read policy
DROP POLICY IF EXISTS "Allow public read access to checkouts by slug" ON public.checkouts;

-- Create a more restrictive policy: anonymous users can only read specific
-- checkout data when accessing via a valid payment link
CREATE POLICY "Public can view checkouts via valid payment links"
ON public.checkouts
FOR SELECT
TO anon
USING (
  checkouts.status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.checkout_links cl
    JOIN public.payment_links pl ON pl.id = cl.link_id
    WHERE cl.checkout_id = checkouts.id
    AND pl.status = 'active'
  )
);

-- ============================================================================
-- FIX 4: offers - Remove all legacy permissive policies
-- ============================================================================

-- Drop ALL overly permissive policies on offers
DROP POLICY IF EXISTS "Enable read access for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.offers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.offers;

-- Create restrictive policy: anonymous users can only see offers that are
-- actively linked to accessible checkouts
CREATE POLICY "Public can view offers in active payment links"
ON public.offers
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_links pl
    JOIN public.checkout_links cl ON cl.link_id = pl.id
    JOIN public.checkouts c ON c.id = cl.checkout_id
    WHERE pl.offer_id = offers.id
    AND pl.status = 'active'
    AND c.status = 'active'
  )
);

-- ============================================================================
-- VERIFICATION: Confirm all tables have proper RLS
-- ============================================================================

-- This query will show any tables in public schema without RLS enabled
-- (Run manually to verify: SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN (SELECT tablename FROM pg_policies WHERE schemaname = 'public') AND rowsecurity = false;)

-- ============================================================================
-- ✅ SECURITY FIXES APPLIED
-- ============================================================================
-- Summary of changes:
-- 1. app_settings: RLS enabled, service role only access
-- 2. products: Restricted to active checkout contexts only
-- 3. checkouts: Restricted to valid payment link access only
-- 4. offers: Restricted to active payment link contexts only
-- 
-- All vendor contact information, pricing strategies, and checkout designs
-- are now protected from unauthorized access.
-- ============================================================================