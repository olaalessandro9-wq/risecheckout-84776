-- Atualizar função auto_create_payment_link para usar o novo domínio
CREATE OR REPLACE FUNCTION public.auto_create_payment_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_slug TEXT;
  v_base_url TEXT;
  v_link_id UUID;
BEGIN
  v_slug := generate_link_slug(NEW.name, NEW.price);
  v_base_url := 'https://risecheckout.com/c/';
  INSERT INTO payment_links (offer_id, slug, url, status)
  VALUES (NEW.id, v_slug, v_base_url || v_slug, 'active')
  RETURNING id INTO v_link_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_payment_link() IS 
'Trigger function que cria automaticamente payment_links quando uma nova oferta é criada. Usa o domínio oficial risecheckout.com';