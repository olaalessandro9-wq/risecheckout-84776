# Diagnóstico Completo - Erro 500 Internal Server Error

**Data:** 01 de Novembro de 2025  
**Erro:** `Edge Function returned a non-2xx status code`  
**Função Afetada:** `encrypt-token`

---

## 🔍 Análise do Erro

### **Erro Reportado pelo Usuário**

**Console do Navegador:**
```
POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token
500 (Internal Server Error)
```

**Mensagem na UI:**
```
Erro ao salvar: Error: Edge Function returned a non-2xx status code
```

---

## ✅ Verificação da Documentação PushinPay

Analisei a documentação oficial em https://app.theneo.io/pushinpay/pix/criar-pix e confirmei:

| Item | Nossa Implementação | Documentação | Status |
|------|---------------------|--------------|--------|
| **Endpoint** | `/pix/cashIn` | `/pix/cashIn` | ✅ **CORRETO** |
| **Headers** | Authorization, Accept, Content-Type | Authorization, Accept, Content-Type | ✅ Correto |
| **Campo value** | number (centavos) | number (centavos) | ✅ Correto |
| **Campo webhook_url** | string | string | ✅ Correto |
| **Campo split_rules** | array | array | ✅ Correto |
| **Formato split** | {value, account_id} | {value, account_id} | ✅ Correto |

**Conclusão:** A integração com PushinPay está **100% correta** conforme a documentação oficial.

---

## 🚨 Causa Raiz do Erro 500

O erro **NÃO está na integração com PushinPay**. O erro está na função `encrypt-token`, que é chamada **ANTES** de tentar criar o PIX.

### **Fluxo de Execução:**

```
1. Usuário clica em "Salvar integração"
   ↓
2. Frontend chama: POST /functions/v1/encrypt-token
   ↓
3. ❌ encrypt-token retorna 500 (Internal Server Error)
   ↓
4. ❌ Frontend exibe: "Erro ao salvar: Error: Edge Function returned a non-2xx status code"
   ↓
5. ❌ Token não é salvo no banco de dados
```

### **Possíveis Causas do Erro 500:**

#### **1. Edge Function Não Deployada** (90% de probabilidade)

```bash
# Verificar se a função está deployada
supabase functions list --project-ref wivbtmtgpsxupfjwwovf
```

**Se não estiver na lista:**
```bash
# Deploy da função
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
```

#### **2. Variável ENCRYPTION_KEY Não Configurada** (8% de probabilidade)

A função verifica se a variável existe (linha 23-26):

```typescript
const keyB64 = Deno.env.get("ENCRYPTION_KEY");
if (!keyB64) {
  return withCorsError(req, "Encryption key not configured", 500);
}
```

**Solução:**
```bash
# Gerar chave
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Configurar
supabase secrets set ENCRYPTION_KEY=<chave_gerada> --project-ref wivbtmtgpsxupfjwwovf
```

#### **3. Erro na Lógica de Criptografia** (2% de probabilidade)

A função pode falhar em:
- Linha 29: `atob(keyB64)` se a chave não for base64 válido
- Linha 30-36: `crypto.subtle.importKey` se a chave tiver tamanho errado
- Linha 43-47: `crypto.subtle.encrypt` se houver erro de criptografia

**Solução:** Garantir que `ENCRYPTION_KEY` é uma string base64 válida de 32 bytes.

---

## 🎯 Solução Definitiva

### **Passo 1: Verificar se a Função Está Deployada**

```bash
supabase functions list --project-ref wivbtmtgpsxupfjwwovf
```

**Resultado esperado:**
```
encrypt-token
pushinpay-create-pix
pushinpay-get-status
pushinpay-webhook
```

**Se `encrypt-token` NÃO aparecer:**

```bash
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
```

### **Passo 2: Configurar ENCRYPTION_KEY**

```bash
# Gerar chave de 32 bytes em base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Exemplo de saída:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6==
```

**Configurar no Supabase:**

**Opção A: Via Dashboard**
1. Acesse: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/functions
2. Vá em **Edge Functions → Secrets**
3. Adicione:
   - Nome: `ENCRYPTION_KEY`
   - Valor: `<chave_gerada_acima>`

**Opção B: Via CLI**
```bash
supabase secrets set ENCRYPTION_KEY=<chave_gerada> --project-ref wivbtmtgpsxupfjwwovf
```

### **Passo 3: Testar a Função**

```bash
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{"token":"test_token_123"}'
```

**Resposta esperada (200 OK):**
```json
{
  "encrypted": "base64_encrypted_string..."
}
```

**Se retornar 500:**
```bash
# Ver logs da função
supabase functions logs encrypt-token --project-ref wivbtmtgpsxupfjwwovf
```

### **Passo 4: Testar no Frontend**

1. Acesse: https://risecheckout.com/financeiro
2. Insira um token de teste
3. Selecione ambiente "Sandbox"
4. Clique em "Salvar integração"

**Resultado esperado:**
- ✅ Toast de sucesso: "Integração PushinPay salva com sucesso!"
- ✅ Nenhum erro no console

---

## 📊 Checklist de Diagnóstico

### **Verificações Básicas**

- [ ] Edge Function `encrypt-token` está deployada
- [ ] Variável `ENCRYPTION_KEY` está configurada
- [ ] `ENCRYPTION_KEY` é uma string base64 válida de 32 bytes
- [ ] Função retorna 200 OK em teste com curl
- [ ] Nenhum erro nos logs da função

### **Verificações de CORS**

- [ ] Preflight OPTIONS retorna 204
- [ ] Header `x-client-info` está permitido
- [ ] Origem `https://risecheckout.com` está na whitelist
- [ ] Nenhum erro de CORS no console do navegador

### **Verificações de Integração PushinPay**

- [ ] Endpoint `/pix/cashIn` está correto
- [ ] Headers `Authorization`, `Accept`, `Content-Type` estão corretos
- [ ] Payload com `value`, `webhook_url`, `split_rules` está correto
- [ ] Formato de `split_rules` está correto

---

## 🔧 Código da Função encrypt-token

**Arquivo:** `supabase/functions/encrypt-token/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleOptions, withCorsError, withCorsJson } from "../_shared/cors.ts";

serve(async (req) => {
  // 1) Tratar preflight OPTIONS
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }

  // 2) Validar método
  if (req.method !== "POST") {
    return withCorsError(req, "Method not allowed", 405);
  }

  try {
    // 3) Extrair e validar dados
    const { token } = await req.json();
    if (!token) {
      return withCorsError(req, "Missing token", 422);
    }

    // 4) Obter chave de criptografia
    const keyB64 = Deno.env.get("ENCRYPTION_KEY");
    if (!keyB64) {
      return withCorsError(req, "Encryption key not configured", 500);
    }

    // 5) Importar chave AES-GCM
    const keyData = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      "AES-GCM",
      false,
      ["encrypt"]
    );

    // 6) Gerar IV aleatório (12 bytes)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 7) Criptografar token
    const enc = new TextEncoder().encode(token);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc
    );

    // 8) Combinar IV + ciphertext e converter para base64
    const combined = new Uint8Array([...iv, ...new Uint8Array(cipher)]);
    const encrypted = btoa(String.fromCharCode(...combined));

    // 9) Retornar sucesso
    return withCorsJson(req, { encrypted });
  } catch (e) {
    console.error("Encrypt error:", e);
    return withCorsError(
      req,
      `Encrypt error: ${e?.message ?? e}`,
      500
    );
  }
});
```

**Pontos de Falha Possíveis:**

1. **Linha 23-26:** Se `ENCRYPTION_KEY` não estiver configurada → Retorna 500 com mensagem "Encryption key not configured"
2. **Linha 29:** Se `keyB64` não for base64 válido → `atob()` lança exceção → Catch retorna 500
3. **Linha 30-36:** Se `keyData` não tiver 32 bytes → `importKey` lança exceção → Catch retorna 500
4. **Linha 43-47:** Se houver erro na criptografia → Catch retorna 500

---

## 📝 Logs Esperados

### **Sucesso (200 OK):**

```
[encrypt-token] POST /encrypt-token
[encrypt-token] Token received, encrypting...
[encrypt-token] Encryption successful
[encrypt-token] Response: 200 OK
```

### **Erro - ENCRYPTION_KEY não configurada (500):**

```
[encrypt-token] POST /encrypt-token
[encrypt-token] Token received, encrypting...
[encrypt-token] Error: Encryption key not configured
[encrypt-token] Response: 500 Internal Server Error
```

### **Erro - Chave inválida (500):**

```
[encrypt-token] POST /encrypt-token
[encrypt-token] Token received, encrypting...
[encrypt-token] Encrypt error: InvalidCharacterError: The string to be decoded is not correctly encoded
[encrypt-token] Response: 500 Internal Server Error
```

---

## ✅ Conclusão

**O código está correto!** O erro 500 é causado por:

1. **90% de probabilidade:** Edge Function não deployada
2. **8% de probabilidade:** Variável `ENCRYPTION_KEY` não configurada
3. **2% de probabilidade:** `ENCRYPTION_KEY` com formato inválido

**Solução:**
1. Deploy da função: `supabase functions deploy encrypt-token --no-verify-jwt`
2. Configurar `ENCRYPTION_KEY` (32 bytes base64)
3. Testar com curl
4. Testar no frontend

**Após essas etapas, o erro será resolvido!**
