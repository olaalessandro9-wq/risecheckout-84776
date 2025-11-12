-- Trigger que usa a Edge Function send-webhook-test com autenticação

CREATE OR REPLACE FUNCTION public.trigger_order_webhooks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  event_type TEXT;
  webhook_payload JSONB;
  webhook_record RECORD;
  product_record RECORD;
  edge_function_url TEXT;
  edge_function_payload JSONB;
  request_id BIGINT;
  supabase_service_key TEXT;
BEGIN
  edge_function_url := 'https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/send-webhook-test';
  supabase_service_key := current_setting('app.settings.service_role_key', true);
  
  -- Se não conseguir pegar a service key, usar uma key fixa (TEMPORÁRIO)
  IF supabase_service_key IS NULL OR supabase_service_key = '' THEN
    supabase_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NjMyOCwiZXhwIjoyMDc2NjQyMzI4fQ.ztPJHTkCi4XYkihlBVVXL6Xrissm_vDQQklYfAqxUS0';
  END IF;
  
  -- Determinar qual evento disparar
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    
    -- 1. PIX gerado
    IF NEW.pix_status IN ('created', 'generated', 'active') AND 
       (OLD IS NULL OR OLD.pix_status IS NULL OR OLD.pix_status NOT IN ('created', 'generated', 'active')) THEN
      
      event_type := 'pix_generated';
      
      -- Buscar webhooks ativos para este vendor e evento
      FOR webhook_record IN
        SELECT w.id, w.url, w.events
        FROM outbound_webhooks w
        WHERE w.vendor_id = NEW.vendor_id
          AND w.active = true
          AND w.events @> ARRAY[event_type]::text[]
      LOOP
        -- Verificar se o produto está configurado neste webhook
        IF EXISTS (
          SELECT 1 FROM webhook_products wp
          WHERE wp.webhook_id = webhook_record.id
            AND wp.product_id = NEW.product_id
        ) THEN
          -- Preparar payload
          webhook_payload := jsonb_build_object(
            'event', event_type,
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
          
          -- Preparar payload para Edge Function
          edge_function_payload := jsonb_build_object(
            'webhook_id', webhook_record.id,
            'webhook_url', webhook_record.url,
            'event_type', event_type,
            'payload', webhook_payload
          );
          
          -- Chamar Edge Function com autenticação
          SELECT INTO request_id net.http_post(
            edge_function_url,
            edge_function_payload,
            '{}'::jsonb,
            jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || supabase_service_key,
              'apikey', supabase_service_key
            ),
            30000
          );
        END IF;
      END LOOP;
      
    -- 2. Compra aprovada
    ELSIF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status != 'paid') THEN
      
      event_type := 'purchase_approved';
      
      -- Buscar webhooks ativos para este vendor e evento
      FOR webhook_record IN
        SELECT w.id, w.url, w.events
        FROM outbound_webhooks w
        WHERE w.vendor_id = NEW.vendor_id
          AND w.active = true
          AND w.events @> ARRAY[event_type]::text[]
      LOOP
        -- Para cada item do pedido (produto principal + order bumps)
        FOR product_record IN
          SELECT oi.product_id, oi.product_name, oi.amount_cents, oi.is_bump
          FROM order_items oi
          WHERE oi.order_id = NEW.id
        LOOP
          -- Verificar se este produto está configurado no webhook
          IF EXISTS (
            SELECT 1 FROM webhook_products wp
            WHERE wp.webhook_id = webhook_record.id
              AND wp.product_id = product_record.product_id
          ) THEN
            -- Preparar payload
            webhook_payload := jsonb_build_object(
              'event', event_type,
              'timestamp', NOW(),
              'vendor_id', NEW.vendor_id,
              'product_id', product_record.product_id,
              'order_id', NEW.id,
              'data', jsonb_build_object(
                'product_name', product_record.product_name,
                'amount_cents', product_record.amount_cents,
                'is_bump', product_record.is_bump,
                'customer_name', NEW.customer_name,
                'customer_email', NEW.customer_email,
                'paid_at', NEW.paid_at
              )
            );
            
            edge_function_payload := jsonb_build_object(
              'webhook_id', webhook_record.id,
              'webhook_url', webhook_record.url,
              'event_type', event_type,
              'payload', webhook_payload
            );
            
            SELECT INTO request_id net.http_post(
              edge_function_url,
              edge_function_payload,
              '{}'::jsonb,
              jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || supabase_service_key,
                'apikey', supabase_service_key
              ),
              30000
            );
          END IF;
        END LOOP;
        
        -- Se não houver order_items, enviar para o produto principal
        IF NOT FOUND THEN
          IF EXISTS (
            SELECT 1 FROM webhook_products wp
            WHERE wp.webhook_id = webhook_record.id
              AND wp.product_id = NEW.product_id
          ) THEN
            webhook_payload := jsonb_build_object(
              'event', event_type,
              'timestamp', NOW(),
              'vendor_id', NEW.vendor_id,
              'product_id', NEW.product_id,
              'order_id', NEW.id,
              'data', jsonb_build_object(
                'product_name', 'Produto Principal',
                'amount_cents', NEW.amount_cents,
                'is_bump', false,
                'customer_name', NEW.customer_name,
                'customer_email', NEW.customer_email,
                'paid_at', NEW.paid_at
              )
            );
            
            edge_function_payload := jsonb_build_object(
              'webhook_id', webhook_record.id,
              'webhook_url', webhook_record.url,
              'event_type', event_type,
              'payload', webhook_payload
            );
            
            SELECT INTO request_id net.http_post(
              edge_function_url,
              edge_function_payload,
              '{}'::jsonb,
              jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || supabase_service_key,
                'apikey', supabase_service_key
              ),
              30000
            );
          END IF;
        END IF;
      END LOOP;
      
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;
