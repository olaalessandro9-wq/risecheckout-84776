-- ============================================================================
-- FASE 1 - CRÍTICO: Habilitar RLS em tabelas de pagamento
-- ============================================================================

-- 1.1) Tabela orders - Dados de pagamento CRÍTICOS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Vendors só veem seus próprios pedidos
CREATE POLICY "Vendors can view own orders"
ON public.orders FOR SELECT TO authenticated
USING (vendor_id = auth.uid());

-- Service role (edge functions) tem acesso total
CREATE POLICY "Service role full access on orders"
ON public.orders FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.orders IS 
'Payment orders. RLS enabled: vendors see only their orders. Service role bypasses for edge functions.';

-- ============================================================================
-- 1.2) Tabela payments_map - Mapeamento PIX ↔ Order
-- ============================================================================

ALTER TABLE public.payments_map ENABLE ROW LEVEL SECURITY;

-- Apenas edge functions (service role) podem acessar
CREATE POLICY "Service role only on payments_map"
ON public.payments_map FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.payments_map IS 
'Maps order_id to pix_id. Only accessible via edge functions (service role). No direct user access.';

-- ============================================================================
-- 1.3) Tabela order_events - Eventos de webhook do gateway
-- ============================================================================

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Vendors veem eventos de seus próprios pedidos
CREATE POLICY "Vendors see own order events"
ON public.order_events FOR SELECT TO authenticated
USING (vendor_id = auth.uid());

-- Service role tem acesso total (para inserir eventos de webhook)
CREATE POLICY "Service role full access on order_events"
ON public.order_events FOR ALL TO service_role
USING (true);

COMMENT ON TABLE public.order_events IS 
'Payment gateway webhook events. RLS: vendors see only their events. Service role inserts from webhooks.';

-- ============================================================================
-- ✅ FASE 1 CONCLUÍDA
-- ============================================================================