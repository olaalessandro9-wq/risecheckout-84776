-- Migração: Adicionar índice único em checkouts.slug e limpar duplicados

-- 1) Identificar e renomear checkouts duplicados (mantém o mais recente)
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN 
    SELECT slug, array_agg(id ORDER BY created_at DESC) as ids
    FROM public.checkouts 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  LOOP
    -- Renomear os antigos (todos exceto o primeiro do array, que é o mais recente)
    FOR i IN 2..array_length(duplicate_record.ids, 1) LOOP
      UPDATE public.checkouts 
      SET slug = slug || '-old-' || substring(duplicate_record.ids[i]::text from 1 for 8)
      WHERE id = duplicate_record.ids[i];
      
      RAISE NOTICE 'Renamed duplicate slug: % for checkout %', 
        duplicate_record.slug, duplicate_record.ids[i];
    END LOOP;
  END LOOP;
END $$;

-- 2) Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS checkouts_slug_unique_idx 
ON public.checkouts(slug) 
WHERE slug IS NOT NULL AND slug <> '';

-- 3) Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Migração concluída: índice único criado e duplicatas resolvidas';
END $$;