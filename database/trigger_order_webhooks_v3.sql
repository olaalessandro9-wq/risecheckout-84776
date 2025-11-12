CREATE OR REPLACE FUNCTION trigger_order_webhooks()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  item_record RECORD;
  product_record RECORD;
  request_id BIGINT;
  payload JSONB;
  has_items BOOLEAN;
  delivery_id UUID;
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
      -- Buscar dados do produto
      SELECT * INTO product_record FROM products WHERE id = NEW.product_id;
      
      payload := jsonb_build_object(
        'event', 'pix_generated',
        'timestamp', NOW(),
        'vendor_id', NEW.vendor_id,
        'product_id', NEW.product_id,
        'order_id', NEW.id,
        'data', jsonb_build_object(
          'customer', jsonb_build_object(
            'name', NEW.customer_name,
            'email', NEW.customer_email,
            'ip', NEW.customer_ip
          ),
          'product', jsonb_build_object(
            'id', product_record.id,
            'name', product_record.name,
            'description', product_record.description,
            'price', product_record.price,
            'image_url', product_record.image_url,
            'status', product_record.status,
            'support_name', product_record.support_name,
            'support_email', product_record.support_email
          ),
          'order', jsonb_build_object(
            'id', NEW.id,
            'amount_cents', NEW.amount_cents,
            'currency', NEW.currency,
            'payment_method', NEW.payment_method,
            'gateway', NEW.gateway,
            'gateway_payment_id', NEW.gateway_payment_id,
            'status', NEW.status,
            'created_at', NEW.created_at
          ),
          'pix', jsonb_build_object(
            'id', NEW.pix_id,
            'qr_code', NEW.pix_qr_code,
            'status', NEW.pix_status,
            'created_at', NEW.pix_created_at
          )
        )
      );

      -- Criar registro de entrega
      INSERT INTO webhook_deliveries (
        webhook_id, order_id, event_type, payload, status, created_at
      ) VALUES (
        webhook_record.id, NEW.id, 'pix_generated', payload, 'pending', NOW()
      ) RETURNING id INTO delivery_id;

      -- Enviar webhook via Edge Function
      SELECT net.http_post(
        url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook',
        body := jsonb_build_object(
          'delivery_id', delivery_id,
          'webhook_url', webhook_record.url,
          'payload', payload
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
        ),
        timeout_milliseconds := 10000
      ) INTO request_id;
    END LOOP;
  END IF;

  -- Evento de compra aprovada
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
    SELECT EXISTS(SELECT 1 FROM order_items WHERE order_id = NEW.id) INTO has_items;

    IF has_items THEN
      -- Iterar sobre order_items (produto principal + order bumps)
      FOR item_record IN
        SELECT * FROM order_items WHERE order_id = NEW.id
      LOOP
        -- Buscar dados completos do produto
        SELECT * INTO product_record FROM products WHERE id = item_record.product_id;
        
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
              'customer', jsonb_build_object(
                'name', NEW.customer_name,
                'email', NEW.customer_email,
                'ip', NEW.customer_ip
              ),
              'product', jsonb_build_object(
                'id', product_record.id,
                'name', product_record.name,
                'description', product_record.description,
                'price', product_record.price,
                'image_url', product_record.image_url,
                'status', product_record.status,
                'support_name', product_record.support_name,
                'support_email', product_record.support_email
              ),
              'order', jsonb_build_object(
                'id', NEW.id,
                'amount_cents', NEW.amount_cents,
                'currency', NEW.currency,
                'payment_method', NEW.payment_method,
                'gateway', NEW.gateway,
                'gateway_payment_id', NEW.gateway_payment_id,
                'status', NEW.status,
                'created_at', NEW.created_at,
                'paid_at', NEW.paid_at
              ),
              'item', jsonb_build_object(
                'product_name', item_record.product_name,
                'amount_cents', item_record.amount_cents,
                'is_bump', item_record.is_bump
              ),
              'pix', CASE 
                WHEN NEW.pix_id IS NOT NULL THEN
                  jsonb_build_object(
                    'id', NEW.pix_id,
                    'qr_code', NEW.pix_qr_code,
                    'status', NEW.pix_status,
                    'created_at', NEW.pix_created_at
                  )
                ELSE NULL
              END
            )
          );

          -- Criar registro de entrega
          INSERT INTO webhook_deliveries (
            webhook_id, order_id, event_type, payload, status, created_at
          ) VALUES (
            webhook_record.id, NEW.id, 'purchase_approved', payload, 'pending', NOW()
          ) RETURNING id INTO delivery_id;

          -- Enviar webhook via Edge Function
          SELECT net.http_post(
            url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook',
            body := jsonb_build_object(
              'delivery_id', delivery_id,
              'webhook_url', webhook_record.url,
              'payload', payload
            ),
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
            ),
            timeout_milliseconds := 10000
          ) INTO request_id;
        END LOOP;
      END LOOP;
    ELSE
      -- Fallback: usar product_id da tabela orders
      SELECT * INTO product_record FROM products WHERE id = NEW.product_id;
      
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
            'customer', jsonb_build_object(
              'name', NEW.customer_name,
              'email', NEW.customer_email,
              'ip', NEW.customer_ip
            ),
            'product', jsonb_build_object(
              'id', product_record.id,
              'name', product_record.name,
              'description', product_record.description,
              'price', product_record.price,
              'image_url', product_record.image_url,
              'status', product_record.status,
              'support_name', product_record.support_name,
              'support_email', product_record.support_email
            ),
            'order', jsonb_build_object(
              'id', NEW.id,
              'amount_cents', NEW.amount_cents,
              'currency', NEW.currency,
              'payment_method', NEW.payment_method,
              'gateway', NEW.gateway,
              'gateway_payment_id', NEW.gateway_payment_id,
              'status', NEW.status,
              'created_at', NEW.created_at,
              'paid_at', NEW.paid_at
            ),
            'item', jsonb_build_object(
              'product_name', product_record.name,
              'amount_cents', NEW.amount_cents,
              'is_bump', false
            ),
            'pix', CASE 
              WHEN NEW.pix_id IS NOT NULL THEN
                jsonb_build_object(
                  'id', NEW.pix_id,
                  'qr_code', NEW.pix_qr_code,
                  'status', NEW.pix_status,
                  'created_at', NEW.pix_created_at
                )
              ELSE NULL
            END
          )
        );

        -- Criar registro de entrega
        INSERT INTO webhook_deliveries (
          webhook_id, order_id, event_type, payload, status, created_at
        ) VALUES (
          webhook_record.id, NEW.id, 'purchase_approved', payload, 'pending', NOW()
        ) RETURNING id INTO delivery_id;

        -- Enviar webhook via Edge Function
        SELECT net.http_post(
          url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook',
          body := jsonb_build_object(
            'delivery_id', delivery_id,
            'webhook_url', webhook_record.url,
            'payload', payload
          ),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0'
          ),
          timeout_milliseconds := 10000
        ) INTO request_id;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
