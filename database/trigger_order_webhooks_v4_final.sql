-- TRIGGER SEGURO - SEM CREDENCIAIS EXPOSTAS
-- Versão 4 Final - Correção de vulnerabilidade crítica
-- Data: 12/11/2025
-- Estratégia: Registrar webhooks e deixar Edge Function processar

CREATE OR REPLACE FUNCTION trigger_order_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  item_record RECORD;
  product_name_var TEXT;
  delivery_id UUID;
  payload JSONB;
  has_items BOOLEAN;
BEGIN
  -- Evento de PIX gerado
  IF NEW.pix_qr_code IS NOT NULL AND (OLD IS NULL OR OLD.pix_qr_code IS NULL) THEN
    FOR webhook_record IN
      SELECT w.* FROM outbound_webhooks w
      WHERE w.vendor_id = NEW.vendor_id
        AND w.active = true
        AND 'pix_generated' = ANY(w.events)
        AND EXISTS (
          SELECT 1 FROM webhook_products wp 
          WHERE wp.webhook_id = w.id AND wp.product_id = NEW.product_id
        )
    LOOP
      payload := jsonb_build_object(
        'event', 'pix_generated',
        'timestamp', NOW(),
        'vendor_id', NEW.vendor_id,
        'product_id', NEW.product_id,
        'order_id', NEW.id,
        'data', jsonb_build_object(
          'pix_id', NEW.pix_id,
          'pix_qr_code', NEW.pix_qr_code,
          'amount_cents', NEW.amount_cents,
          'customer_name', NEW.customer_name,
          'customer_email', NEW.customer_email
        )
      );

      -- APENAS registrar o webhook - processamento será feito por worker
      INSERT INTO webhook_deliveries (
        webhook_id, 
        order_id, 
        event_type, 
        payload, 
        webhook_url,
        status, 
        created_at
      ) VALUES (
        webhook_record.id, 
        NEW.id, 
        'pix_generated', 
        payload,
        webhook_record.url,
        'pending', 
        NOW()
      );
    END LOOP;
  END IF;

  -- Evento de compra aprovada
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    -- Verificar se há order_items
    SELECT EXISTS(SELECT 1 FROM order_items WHERE order_id = NEW.id) INTO has_items;

    IF has_items THEN
      -- Iterar sobre order_items (produto principal + order bumps)
      FOR item_record IN
        SELECT * FROM order_items WHERE order_id = NEW.id
      LOOP
        FOR webhook_record IN
          SELECT w.* FROM outbound_webhooks w
          WHERE w.vendor_id = NEW.vendor_id
            AND w.active = true
            AND 'purchase_approved' = ANY(w.events)
            AND EXISTS (
              SELECT 1 FROM webhook_products wp 
              WHERE wp.webhook_id = w.id AND wp.product_id = item_record.product_id
            )
        LOOP
          payload := jsonb_build_object(
            'event', 'purchase_approved',
            'timestamp', NOW(),
            'vendor_id', NEW.vendor_id,
            'product_id', item_record.product_id,
            'order_id', NEW.id,
            'data', jsonb_build_object(
              'product_name', item_record.product_name,
              'amount_cents', item_record.amount_cents,
              'is_bump', item_record.is_bump,
              'customer_name', NEW.customer_name,
              'customer_email', NEW.customer_email,
              'paid_at', NOW()
            )
          );

          -- APENAS registrar o webhook
          INSERT INTO webhook_deliveries (
            webhook_id, 
            order_id, 
            event_type, 
            payload,
            webhook_url,
            status, 
            created_at
          ) VALUES (
            webhook_record.id, 
            NEW.id, 
            'purchase_approved', 
            payload,
            webhook_record.url,
            'pending', 
            NOW()
          );
        END LOOP;
      END LOOP;
    ELSE
      -- Fallback: usar product_id da tabela orders (para pedidos sem order_items)
      SELECT name INTO product_name_var FROM products WHERE id = NEW.product_id;
      
      FOR webhook_record IN
        SELECT w.* FROM outbound_webhooks w
        WHERE w.vendor_id = NEW.vendor_id
          AND w.active = true
          AND 'purchase_approved' = ANY(w.events)
          AND EXISTS (
            SELECT 1 FROM webhook_products wp 
            WHERE wp.webhook_id = w.id AND wp.product_id = NEW.product_id
          )
      LOOP
        payload := jsonb_build_object(
          'event', 'purchase_approved',
          'timestamp', NOW(),
          'vendor_id', NEW.vendor_id,
          'product_id', NEW.product_id,
          'order_id', NEW.id,
          'data', jsonb_build_object(
            'product_name', product_name_var,
            'amount_cents', NEW.amount_cents,
            'is_bump', false,
            'customer_name', NEW.customer_name,
            'customer_email', NEW.customer_email,
            'paid_at', NOW()
          )
        );

        -- APENAS registrar o webhook
        INSERT INTO webhook_deliveries (
          webhook_id, 
          order_id, 
          event_type, 
          payload,
          webhook_url,
          status, 
          created_at
        ) VALUES (
          webhook_record.id, 
          NEW.id, 
          'purchase_approved', 
          payload,
          webhook_record.url,
          'pending', 
          NOW()
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS order_webhooks_trigger ON orders;
CREATE TRIGGER order_webhooks_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_order_webhooks();

-- NOTA: Os webhooks pendentes serão processados por um worker separado
-- que chamará a Edge Function send-webhook com as credenciais corretas
