-- Atualizar função generate_link_slug para gerar slugs aleatórios profissionais
CREATE OR REPLACE FUNCTION public.generate_link_slug(offer_name text DEFAULT NULL, offer_price numeric DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_slug text;
  slug_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    -- Gera slug aleatório: 7 caracteres alfanuméricos + underscore + 6 dígitos
    -- Exemplo: a3f5k2p_123456
    new_slug := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7)) || 
                '_' || 
                lpad(floor(random() * 1000000)::text, 6, '0');
    
    -- Verifica se o slug já existe
    SELECT EXISTS(SELECT 1 FROM payment_links WHERE slug = new_slug) INTO slug_exists;
    
    attempts := attempts + 1;
    
    EXIT WHEN NOT slug_exists OR attempts >= max_attempts;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Não foi possível gerar slug único após % tentativas', max_attempts;
  END IF;
  
  RETURN new_slug;
END;
$$;

COMMENT ON FUNCTION public.generate_link_slug(text, numeric) IS 
'Gera slugs aleatórios profissionais para payment links (formato: 7chars_6digits)';

-- Atualizar função generate_unique_payment_slug para usar o novo formato
CREATE OR REPLACE FUNCTION public.generate_unique_payment_slug(p_offer_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug text;
  slug_exists boolean;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    -- Usa a mesma lógica de generate_link_slug
    new_slug := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7)) || 
                '_' || 
                lpad(floor(random() * 1000000)::text, 6, '0');
    
    -- Verifica se o slug já existe
    SELECT EXISTS(SELECT 1 FROM payment_links WHERE slug = new_slug) INTO slug_exists;
    
    attempts := attempts + 1;
    
    EXIT WHEN NOT slug_exists OR attempts >= max_attempts;
  END LOOP;
  
  IF attempts >= max_attempts THEN
    RAISE EXCEPTION 'Não foi possível gerar slug único após % tentativas', max_attempts;
  END IF;
  
  RETURN new_slug;
END;
$$;

COMMENT ON FUNCTION public.generate_unique_payment_slug(uuid) IS 
'Gera slugs aleatórios únicos para payment links (formato: 7chars_6digits)';