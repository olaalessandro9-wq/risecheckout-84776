-- Atualizar trigger function para usar o novo domínio
CREATE OR REPLACE FUNCTION public.create_payment_link_for_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_slug TEXT;
  link_url TEXT;
  link_id UUID;
BEGIN
  link_slug := public.generate_link_slug(NEW.name, NEW.price);
  link_url := 'https://risecheckout.com/c/' || link_slug;
  INSERT INTO public.payment_links (offer_id, slug, url)
  VALUES (NEW.id, link_slug, link_url);
  RETURN NEW;
END;
$$;

-- Atualizar todos os links existentes com o novo domínio
UPDATE public.payment_links
SET url = REPLACE(url, 'risecheckout.lovable.app', 'risecheckout.com')
WHERE url LIKE '%risecheckout.lovable.app%';

-- Comentário explicativo
COMMENT ON FUNCTION public.create_payment_link_for_offer() IS 
'Trigger function que cria automaticamente payment_links quando uma nova oferta é criada. Usa o domínio oficial risecheckout.com';