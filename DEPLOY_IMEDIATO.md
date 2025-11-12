# 🚀 DEPLOY IMEDIATO - Integração PushinPay

**Data:** 01 de Novembro de 2025  
**Projeto:** RiseCheckout  
**Tempo Estimado:** 1h55min  
**Status:** ✅ Pronto para Execução

---

## ⚡ ATENÇÃO: Comandos Prontos para Copiar/Colar

Este documento contém **comandos prontos** com os valores reais já preenchidos.  
**NÃO é necessário substituir placeholders!**

Basta copiar e colar cada bloco de comandos no terminal.

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de que:

- [ ] Supabase CLI está instalado (`npm install -g supabase`)
- [ ] Você está logado no Supabase CLI (`supabase login`)
- [ ] Você tem acesso ao painel da PushinPay
- [ ] Você tem o token de Sandbox da PushinPay

---

## 🔐 Etapa 1: Configurar Secrets (15 min)

### **Comandos Prontos:**

```bash
# 1. ENCRYPTION_KEY (chave de criptografia AES-256)
supabase secrets set ENCRYPTION_KEY="Q1Z6U1VqZEdhV05GYzNsaFpXdz09" --project-ref wivbtmtgpsxupfjwwovf

# 2. PLATFORM_PUSHINPAY_ACCOUNT_ID (ID da conta da plataforma)
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID="9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A" --project-ref wivbtmtgpsxupfjwwovf

# 3. PLATFORM_FEE_PERCENT (taxa da plataforma: 7.5%)
supabase secrets set PLATFORM_FEE_PERCENT="7.5" --project-ref wivbtmtgpsxupfjwwovf

# 4. PUSHINPAY_BASE_URL_PROD (URL de produção)
supabase secrets set PUSHINPAY_BASE_URL_PROD="https://api.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf

# 5. PUSHINPAY_BASE_URL_SANDBOX (URL de sandbox)
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX="https://api-sandbox.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf

# 6. PUSHINPAY_WEBHOOK_TOKEN (token de validação do webhook)
supabase secrets set PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123" --project-ref wivbtmtgpsxupfjwwovf
```

### **Validação:**

```bash
# Listar secrets configuradas
supabase secrets list --project-ref wivbtmtgpsxupfjwwovf
```

**Resultado esperado:**
```
ENCRYPTION_KEY
PLATFORM_PUSHINPAY_ACCOUNT_ID
PLATFORM_FEE_PERCENT
PUSHINPAY_BASE_URL_PROD
PUSHINPAY_BASE_URL_SANDBOX
PUSHINPAY_WEBHOOK_TOKEN
```

---

## 🚀 Etapa 2: Deploy das Edge Functions (30 min)

### **Comandos Prontos:**

```bash
# 1. encrypt-token (chamada pelo frontend - SEM JWT)
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 2. pushinpay-create-pix (chamada pelo frontend - SEM JWT)
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 3. pushinpay-get-status (chamada pelo frontend - SEM JWT)
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 4. pushinpay-webhook (chamada pela PushinPay - COM JWT)
supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf
```

### **Validação:**

```bash
# Listar funções deployadas
supabase functions list --project-ref wivbtmtgpsxupfjwwovf
```

**Resultado esperado:**
```
encrypt-token
pushinpay-create-pix
pushinpay-get-status
pushinpay-webhook
```

---

## 🌐 Etapa 3: Configurar Webhook na PushinPay (10 min)

### **Passos:**

1. Acesse: https://app.pushinpay.com.br/settings/webhooks
2. Clique em "Adicionar Webhook" ou "Novo Webhook"
3. Preencha os campos:

| Campo | Valor |
|-------|-------|
| **URL** | `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook` |
| **Token** | `rise_secure_token_123` |
| **Eventos** | `pix.created`, `pix.paid`, `pix.expired`, `pix.canceled` |

4. Clique em "Salvar"

### **Validação:**

```bash
# Testar webhook manualmente
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: rise_secure_token_123" \
  -d '{"event":"pix.paid","data":{"id":"test-id","status":"paid"}}'
```

**Resultado esperado:**
```
{"success":true}
```

---

## 🧪 Etapa 4: Testes em Sandbox (40 min)

### **Teste 1: Criptografia (encrypt-token)**

**Comando:**

```bash
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0Njk2MjcsImV4cCI6MjA0NjA0NTYyN30.Uh9Uw8lNJOqvZwDdLLfmLEkPF5pJMqH_K2mG_7wdQJQ" \
  -d '{"token":"teste123"}'
```

**Resultado esperado:**
```json
{"encrypted":"<string_base64>"}
```

**Se retornar 500:**
- ❌ `ENCRYPTION_KEY` não configurada
- **Solução:** Volte à Etapa 1

---

### **Teste 2: Salvar Integração no Frontend**

**Passos:**

1. Acesse: https://risecheckout.com/financeiro
2. No campo "API Token", cole o token de Sandbox da PushinPay
3. No campo "Ambiente", selecione "Sandbox (testes)"
4. Clique em "Salvar integração"

**Resultado esperado:**
- ✅ Toast de sucesso: "Integração PushinPay salva com sucesso!"
- ✅ Token aparece mascarado (••••••••••••••••)
- ✅ Nenhum erro 500 no console

**Se retornar 500:**
- ❌ Edge Functions não deployadas
- **Solução:** Volte à Etapa 2

---

### **Teste 3: Criar Cobrança PIX**

**Passos:**

1. Crie um pedido de teste com valor mínimo de R$ 0,50 (50 centavos)
2. Acesse a página de checkout público
3. Selecione "PIX" como método de pagamento
4. Aguarde a geração do QR Code

**Resultado esperado:**
- ✅ QR Code exibido na tela
- ✅ Código PIX copiável exibido
- ✅ Status "created" no banco de dados

**Se retornar erro:**
- ❌ Erro 401: Token inválido ou expirado
- ❌ Erro 422: Valor menor que 50 centavos
- **Solução:** Verifique token e valor do pedido

---

### **Teste 4: Simular Pagamento**

**Passos:**

1. Acesse o painel da PushinPay Sandbox
2. Localize a transação criada
3. Clique em "Simular Pagamento" ou "Marcar como Pago"
4. Aguarde a notificação do webhook

**Resultado esperado:**
- ✅ Webhook recebido pela função `pushinpay-webhook`
- ✅ Status atualizado para "paid" no banco de dados
- ✅ Frontend exibe mensagem de pagamento confirmado

**Verificar logs:**

```bash
# Ver logs do webhook
supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf --tail
```

---

### **Teste 5: Validar Split de Pagamento**

**Passos:**

1. Acesse o banco de dados (tabela `payments_map`)
2. Localize o registro da transação
3. Verifique o campo `split_rules` ou consulte a API da PushinPay

**Exemplo de cálculo:**
- Valor total: R$ 100,00 (10000 centavos)
- Split plataforma: R$ 7,50 (750 centavos) → 7.5%
- Vendedor recebe: R$ 92,50 (9250 centavos)

**Resultado esperado:**
- ✅ Split calculado corretamente
- ✅ `account_id` da plataforma: `9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A`
- ✅ Valor do split em centavos correto

---

## ✅ Etapa 5: Validação Final (20 min)

### **Checklist de Validação:**

| Item | Status | Evidência |
|------|--------|-----------|
| 6 secrets configuradas | ⬜ | Screenshot do painel |
| 4 Edge Functions deployadas | ⬜ | Screenshot do painel |
| Webhook configurado na PushinPay | ⬜ | Screenshot do painel |
| Teste encrypt-token (200 OK) | ⬜ | Screenshot da resposta |
| Salvar integração (sem erro 500) | ⬜ | Screenshot do toast |
| Criar cobrança PIX (QR Code gerado) | ⬜ | Screenshot do QR Code |
| Simular pagamento (webhook recebido) | ⬜ | Screenshot dos logs |
| Split de 7.5% aplicado | ⬜ | Screenshot do banco |

---

## 🐛 Troubleshooting

### **Erro 500 persiste após deploy**

**Causa:** `ENCRYPTION_KEY` não configurada ou inválida

**Solução:**
```bash
# Verificar logs
supabase functions logs encrypt-token --project-ref wivbtmtgpsxupfjwwovf --tail

# Reconfigurar chave
supabase secrets set ENCRYPTION_KEY="Q1Z6U1VqZEdhV05GYzNsaFpXdz09" --project-ref wivbtmtgpsxupfjwwovf

# Re-deploy
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
```

---

### **Erro 401 ao criar PIX**

**Causa:** Token inválido ou ambiente incorreto

**Solução:**
1. Gere novo token no painel da PushinPay
2. Verifique se está usando token de Sandbox para ambiente Sandbox
3. Salve novamente a integração

---

### **Webhook não recebido**

**Causa:** URL incorreta ou token inválido

**Solução:**
```bash
# Verificar logs
supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf --tail

# Verificar URL e token
echo "URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
echo "Token: rise_secure_token_123"

# Reconfigurar no painel da PushinPay
```

---

## 📊 Resumo de Execução

### **Comandos Executados:**

```bash
# Etapa 1: Secrets (6 comandos)
supabase secrets set ENCRYPTION_KEY="Q1Z6U1VqZEdhV05GYzNsaFpXdz09" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID="9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PLATFORM_FEE_PERCENT="7.5" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_BASE_URL_PROD="https://api.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX="https://api-sandbox.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123" --project-ref wivbtmtgpsxupfjwwovf

# Etapa 2: Deploy (4 comandos)
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf
```

### **Configuração Manual:**

- Webhook na PushinPay:
  - URL: `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook`
  - Token: `rise_secure_token_123`
  - Eventos: `pix.created`, `pix.paid`, `pix.expired`, `pix.canceled`

---

## 🎯 Resultado Esperado

Após a execução completa:

✅ Nenhum erro 500 no console  
✅ Integração PushinPay 100% funcional  
✅ Criação e pagamento de PIX em tempo real  
✅ Split automático de 7.5% aplicado  
✅ Webhook ativo e seguro

---

## 📞 Suporte

**Documentação Completa:**
- `RESUMO_EXECUTIVO_FINAL.md` - Visão geral completa
- `GUIA_QA_SANDBOX.md` - Roteiro de testes detalhado
- `CHECKLIST_CONCLUSAO.md` - Checklist de aceite

**Links Úteis:**
- **Supabase Dashboard:** https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf
- **PushinPay Dashboard:** https://app.pushinpay.com.br
- **Documentação PushinPay:** https://app.theneo.io/pushinpay/pix/criar-pix

---

**Criado por:** Manus AI  
**Data:** 01/11/2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para Execução Imediata
