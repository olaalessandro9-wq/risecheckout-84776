# 🔐 Configuração Segura do Service Role Key

## ⚠️ IMPORTANTE

O trigger `trigger_order_webhooks` agora usa uma **variável de ambiente** ao invés de um token hardcoded. Você precisa configurar essa variável no PostgreSQL do Supabase.

---

## 📋 Passo a Passo

### 1. Obter o Service Role Key

1. Acesse: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/api
2. Copie o **service_role** key (NÃO compartilhe com ninguém!)

### 2. Configurar a Variável no PostgreSQL

Acesse o **SQL Editor** do Supabase e execute:

```sql
ALTER DATABASE postgres 
SET app.supabase_service_role_key = 'SEU_SERVICE_ROLE_KEY_AQUI';
```

**Substitua** `SEU_SERVICE_ROLE_KEY_AQUI` pelo token que você copiou no passo 1.

### 3. Verificar se Foi Configurado

Execute no SQL Editor:

```sql
SELECT current_setting('app.supabase_service_role_key', true);
```

Deve retornar o token configurado.

---

## 🔄 Recarregar Configuração (Se Necessário)

Se o trigger não funcionar imediatamente, execute:

```sql
SELECT pg_reload_conf();
```

---

## ✅ Teste

Crie um pedido de teste e verifique se os webhooks estão sendo enviados corretamente.

---

## 🚨 Segurança

- ✅ **NUNCA** commite o service_role key no código
- ✅ **NUNCA** exponha o service_role key em logs
- ✅ Use variáveis de ambiente sempre que possível
- ✅ Rotacione o key periodicamente (gere um novo no dashboard)

---

## 📝 Como Funciona

O trigger agora usa:

```sql
'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
```

Ao invés de:

```sql
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  -- ❌ INSEGURO
```

---

## 🔄 Rotação de Token (Recomendado)

Para maior segurança, rotacione o service_role key periodicamente:

1. Gere um novo key no dashboard do Supabase
2. Atualize a variável no PostgreSQL (passo 2)
3. O antigo key será automaticamente invalidado

---

## 📞 Suporte

Se tiver problemas, verifique:

1. O token está correto? (sem espaços extras)
2. A variável foi configurada? (passo 3)
3. O PostgreSQL foi recarregado? (SELECT pg_reload_conf())

---

**Data:** 13/11/2025
**Versão:** v4_secure
**Status:** ✅ Configuração necessária
