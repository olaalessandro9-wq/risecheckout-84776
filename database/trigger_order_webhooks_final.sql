CREATE OR REPLACE FUNCTION trigger_order_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  item_record RECORD;
  product_name_var TEXT;
  request_id BIGINT;
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

      SELECT net.http_post(
        url := webhook_record.url,
        body := payload,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
        ),
        timeout_milliseconds := 10000
      ) INTO request_id;

      INSERT INTO webhook_deliveries (
        webhook_id, order_id, event_type, payload, status, created_at
      ) VALUES (
        webhook_record.id, NEW.id, 'pix_generated', payload, 'pending', NOW()
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

          SELECT net.http_post(
            url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook-test',
            body := jsonb_build_object(
              'webhook_url', webhook_record.url,
              'payload', payload
            ),
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
            ),
            timeout_milliseconds := 10000
          ) INTO request_id;

          INSERT INTO webhook_deliveries (
            webhook_id, order_id, event_type, payload, status, created_at
          ) VALUES (
            webhook_record.id, NEW.id, 'purchase_approved', payload, 'pending', NOW()
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

        SELECT net.http_post(
          url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook-test',
          body := jsonb_build_object(
            'webhook_url', webhook_record.url,
            'payload', payload
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
          ),
          timeout_milliseconds := 10000
        ) INTO request_id;

        INSERT INTO webhook_deliveries (
          webhook_id, order_id, event_type, payload, status, created_at
        ) VALUES (
          webhook_record.id, NEW.id, 'purchase_approved', payload, 'pending', NOW()
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
