-- ============================================================================
-- FASE 2 - ALTA: RLS em tabelas de audit + Criptografia de secrets
-- ============================================================================

-- 2.1) Tabela outbound_webhooks - Webhooks configurados pelos usuários
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

-- Vendors gerenciam seus próprios webhooks
CREATE POLICY "Vendors manage own webhooks"
ON public.outbound_webhooks FOR ALL TO authenticated
USING (vendor_id = auth.uid())
WITH CHECK (vendor_id = auth.uid());

-- Service role tem acesso total
CREATE POLICY "Service role full access on outbound_webhooks"
ON public.outbound_webhooks FOR ALL TO service_role
USING (true);

-- Adicionar coluna para secret criptografado
ALTER TABLE public.outbound_webhooks 
ADD COLUMN IF NOT EXISTS secret_encrypted TEXT;

COMMENT ON COLUMN public.outbound_webhooks.secret_encrypted IS 
'Encrypted webhook HMAC secret using AES-256-GCM from crypto.ts. Use encrypt() before storing.';

COMMENT ON TABLE public.outbound_webhooks IS 
'User configured webhooks. RLS: vendors manage their own. Secrets should be stored encrypted in secret_encrypted column.';

-- ============================================================================
-- 2.2) Tabela webhook_deliveries - Logs de entregas de webhook
-- ============================================================================

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Apenas service role (audit logs internos)
CREATE POLICY "Service role only on webhook_deliveries"
ON public.webhook_deliveries FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.webhook_deliveries IS 
'Webhook delivery audit logs. Only accessible via edge functions (service role). Contains retry attempts and responses.';

-- ============================================================================
-- 2.3) Tabela checkout_sessions - Sessões de checkout em andamento
-- ============================================================================

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Vendors veem sessões de seus checkouts
CREATE POLICY "Vendors see own checkout sessions"
ON public.checkout_sessions FOR SELECT TO authenticated
USING (vendor_id = auth.uid());

-- Service role tem acesso total (para heartbeat e cleanup)
CREATE POLICY "Service role full access on checkout_sessions"
ON public.checkout_sessions FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.checkout_sessions IS 
'Active checkout sessions. RLS: vendors see their own sessions. Service role manages heartbeat and cleanup.';

-- ============================================================================
-- 2.4) Tabela pix_transactions - Transações PIX
-- ============================================================================

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

-- Vendors veem transações de seu workspace
CREATE POLICY "Vendors see own pix transactions"
ON public.pix_transactions FOR SELECT TO authenticated
USING (workspace_id = auth.uid());

-- Service role tem acesso total (para criar e atualizar)
CREATE POLICY "Service role full access on pix_transactions"
ON public.pix_transactions FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.pix_transactions IS 
'PIX payment transactions. RLS: vendors see their workspace transactions. Service role creates from payment gateway.';

-- ============================================================================
-- ✅ FASE 2 CONCLUÍDA
-- ============================================================================