-- Script para marcar produtos com status 'deleted' como inativos
-- Execute este script uma vez no Supabase SQL Editor para corrigir produtos antigos

UPDATE products
SET active = false
WHERE status = 'deleted' AND active = true;

-- Verificar quantos produtos foram atualizados
SELECT COUNT(*) as produtos_corrigidos
FROM products
WHERE status = 'deleted' AND active = false;
