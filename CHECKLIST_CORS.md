# Checklist de Verificação CORS

**Data:** 01 de Novembro de 2025  
**Versão:** 3.0.0 (CORS com whitelist)

---

## 🎯 Objetivo

Verificar que o erro de CORS foi completamente resolvido e que as Edge Functions estão respondendo corretamente ao preflight OPTIONS.

---

## 📋 Checklist de Deploy

### 1. Variáveis de Ambiente Configuradas

- [ ] `PUSHINPAY_BASE_URL_PROD` configurada
- [ ] `PUSHINPAY_BASE_URL_SANDBOX` configurada
- [ ] `PLATFORM_PUSHINPAY_ACCOUNT_ID` configurada
- [ ] `PLATFORM_FEE_PERCENT` configurada (padrão: 7.5)
- [ ] `ENCRYPTION_KEY` configurada (32 bytes em base64)

### 2. Edge Functions Deployadas

Execute o deploy com as flags corretas:

```bash
# Functions chamadas pelo frontend (--no-verify-jwt)
supabase functions deploy encrypt-token --no-verify-jwt
supabase functions deploy pushinpay-create-pix --no-verify-jwt
supabase functions deploy pushinpay-get-status --no-verify-jwt

# Webhook (server-to-server, JWT padrão)
supabase functions deploy pushinpay-webhook
```

Verifique:
- [ ] `encrypt-token` deployada com `--no-verify-jwt`
- [ ] `pushinpay-create-pix` deployada com `--no-verify-jwt`
- [ ] `pushinpay-get-status` deployada com `--no-verify-jwt`
- [ ] `pushinpay-webhook` deployada (sem flag)

---

## 🧪 Testes de CORS (DevTools)

### Teste 1: Preflight OPTIONS

1. Abra o painel em `https://risecheckout.com`
2. Abra DevTools → Network
3. Acesse a página Financeiro
4. Insira um token de teste
5. Clique em "Salvar integração"
6. Localize a requisição **OPTIONS** para `encrypt-token`

**Verificações:**

- [ ] **Status:** 200 OK
- [ ] **Header `Access-Control-Allow-Origin`:** `https://risecheckout.com`
- [ ] **Header `Access-Control-Allow-Methods`:** Inclui `POST, OPTIONS`
- [ ] **Header `Access-Control-Allow-Headers`:** Inclui `content-type, authorization`
- [ ] **Header `Vary`:** `Origin`
- [ ] **Header `Access-Control-Allow-Credentials`:** `true`

### Teste 2: Requisição POST

Após o preflight, localize a requisição **POST** para `encrypt-token`:

**Verificações:**

- [ ] **Status:** 200 OK
- [ ] **Response Body:** `{ "encrypted": "..." }`
- [ ] **Header `Access-Control-Allow-Origin`:** `https://risecheckout.com`
- [ ] **Header `Content-Type`:** `application/json`

### Teste 3: UI de Sucesso

- [ ] Toast de sucesso aparece: "Integração PushinPay salva com sucesso!"
- [ ] Nenhum erro no console do navegador
- [ ] Token é salvo no banco de dados

---

## 🌐 Testes de Origem

### Origens Permitidas

Teste em cada ambiente:

- [ ] **Produção:** `https://risecheckout.com`
- [ ] **Preview:** `https://preview.risecheckout.com`
- [ ] **Localhost (Vite):** `http://localhost:5173`
- [ ] **Localhost (alternativo):** `http://localhost:3000`

### Origens Bloqueadas

Teste que origens não autorizadas são bloqueadas:

- [ ] Requisição de `https://example.com` → Sem header `Access-Control-Allow-Origin`
- [ ] Requisição de `https://malicious-site.com` → Sem header `Access-Control-Allow-Origin`

---

## 🔍 Testes de Integração

### Fluxo Completo: Sandbox

1. **Configurar Token:**
   - [ ] Acesse Financeiro
   - [ ] Insira token de Sandbox
   - [ ] Selecione ambiente "Sandbox"
   - [ ] Salve com sucesso (sem erros de CORS)

2. **Criar Cobrança PIX:**
   - [ ] Crie um pedido de R$ 1,00
   - [ ] Escolha PIX como pagamento
   - [ ] QR Code é gerado (sem erros de CORS)
   - [ ] Código PIX é copiável

3. **Verificar Status:**
   - [ ] Polling inicia automaticamente
   - [ ] Status é consultado a cada 7 segundos (sem erros de CORS)
   - [ ] Status é atualizado corretamente

---

## 🐛 Troubleshooting

### Erro: "Response to preflight request doesn't pass access control check"

**Causa:** Edge Function não foi deployada com as correções de CORS

**Solução:**
```bash
supabase functions deploy encrypt-token --no-verify-jwt
```

### Erro: "Access-Control-Allow-Origin header is missing"

**Causa:** Origem não está na whitelist

**Solução:**
1. Verifique se está acessando de um domínio permitido
2. Se necessário, adicione a origem em `_shared/cors.ts`:
   ```typescript
   export const ALLOWED_ORIGINS = [
     'https://risecheckout.com',
     'https://seu-novo-dominio.com',
     // ...
   ];
   ```

### Erro: "Failed to send a request to the Edge Function"

**Causa:** Edge Function não está respondendo 200 ao OPTIONS

**Solução:**
1. Verifique se a função usa `handleOptions(req)` para OPTIONS
2. Redeploy: `supabase functions deploy encrypt-token --no-verify-jwt`

### Erro: JWT verification failed

**Causa:** Edge Function foi deployada sem `--no-verify-jwt`

**Solução:**
```bash
# Functions chamadas pelo frontend PRECISAM de --no-verify-jwt
supabase functions deploy encrypt-token --no-verify-jwt
supabase functions deploy pushinpay-create-pix --no-verify-jwt
supabase functions deploy pushinpay-get-status --no-verify-jwt
```

---

## 📊 Logs de Verificação

### Verificar Logs em Tempo Real

```bash
# Logs de encrypt-token
supabase functions logs encrypt-token --tail

# Logs de pushinpay-create-pix
supabase functions logs pushinpay-create-pix --tail
```

### O que procurar nos logs:

- [ ] Nenhum erro de CORS
- [ ] Requisições OPTIONS retornando 200
- [ ] Requisições POST retornando 200
- [ ] Tokens sendo criptografados com sucesso

---

## ✅ Critérios de Aceitação

Para considerar o CORS completamente resolvido:

- [ ] Preflight OPTIONS retorna 200 OK
- [ ] Headers CORS corretos em todas as respostas
- [ ] Whitelist de origens funcionando
- [ ] Botão "Salvar integração" funciona sem erros
- [ ] QR Code PIX é gerado sem erros
- [ ] Polling de status funciona sem erros
- [ ] Nenhum erro de CORS no console do navegador
- [ ] Testes em produção, preview e localhost bem-sucedidos

---

## 🎯 Resultado Esperado

Após seguir este checklist, o erro de CORS deve estar **completamente resolvido**:

✅ **Antes:**
```
Response to preflight request doesn't pass access control check
Failed to send a request to the Edge Function
```

✅ **Depois:**
```
Status: 200 OK
Access-Control-Allow-Origin: https://risecheckout.com
{ "encrypted": "..." }
```

---

## 📞 Suporte

Se após seguir este checklist o erro persistir:

1. Capture um print do Network → OPTIONS
2. Capture um print do Network → POST
3. Copie os logs da Edge Function
4. Abra uma issue no repositório com essas informações

---

**Desenvolvido por:** Manus AI  
**Versão:** 3.0.0 (CORS com whitelist e --no-verify-jwt)
