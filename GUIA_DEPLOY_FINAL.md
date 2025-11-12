# Guia de Deploy Final - Integração PushinPay

**Data:** 01 de Novembro de 2025  
**Projeto:** RiseCheckout  
**Project ID:** `wivbtmtgpsxupfjwwovf`  
**Status:** ✅ Código pronto para deploy

---

## 📋 Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configurar Variáveis de Ambiente](#2-configurar-variáveis-de-ambiente)
3. [Deploy das Edge Functions](#3-deploy-das-edge-functions)
4. [Configurar Webhook na PushinPay](#4-configurar-webhook-na-pushinpay)
5. [Testes em Sandbox](#5-testes-em-sandbox)
6. [Checklist Final](#6-checklist-final)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Pré-requisitos

### 1.1. Ferramentas Necessárias

- [x] Supabase CLI instalado
- [x] Acesso ao projeto Supabase (`wivbtmtgpsxupfjwwovf`)
- [x] Token de Sandbox da PushinPay
- [x] Account ID da plataforma PushinPay

### 1.2. Verificar Instalação do Supabase CLI

```bash
# Verificar versão
supabase --version

# Se não estiver instalado:
npm install -g supabase
```

### 1.3. Login no Supabase

```bash
# Fazer login
supabase login

# Verificar projeto linkado
supabase projects list
```

---

## 2. Configurar Variáveis de Ambiente

### 2.1. Gerar Chave de Criptografia

```bash
# Gerar chave AES-256 (32 bytes em base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Exemplo de saída:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6==
```

### 2.2. Configurar Secrets no Supabase

**Opção 1: Via Dashboard**

1. Acesse: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/functions
2. Vá em **Edge Functions → Secrets**
3. Adicione as seguintes variáveis:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `ENCRYPTION_KEY` | `<chave_gerada_acima>` | Chave AES-256 para criptografia |
| `PLATFORM_PUSHINPAY_ACCOUNT_ID` | `<seu_account_id>` | ID da conta da plataforma |
| `PLATFORM_FEE_PERCENT` | `7.5` | Taxa da plataforma (7.5%) |
| `PUSHINPAY_BASE_URL_PROD` | `https://api.pushinpay.com.br/api` | URL da API de produção |
| `PUSHINPAY_BASE_URL_SANDBOX` | `https://api-sandbox.pushinpay.com.br/api` | URL da API de sandbox |

**Opção 2: Via CLI**

```bash
# Configurar secrets
supabase secrets set ENCRYPTION_KEY=<chave_gerada>
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID=<seu_account_id>
supabase secrets set PLATFORM_FEE_PERCENT=7.5
supabase secrets set PUSHINPAY_BASE_URL_PROD=https://api.pushinpay.com.br/api
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX=https://api-sandbox.pushinpay.com.br/api

# Verificar secrets configurados
supabase secrets list
```

### 2.3. Obter Account ID da PushinPay

1. Acesse o painel da PushinPay
2. Vá em **Configurações → Conta**
3. Copie o **Account ID** (geralmente no formato `acc_xxxxx`)

---

## 3. Deploy das Edge Functions

### 3.1. Navegar até o Diretório do Projeto

```bash
cd /path/to/risecheckout
```

### 3.2. Deploy das Functions (Ordem Importante)

**⚠️ ATENÇÃO:** As funções chamadas pelo frontend devem usar `--no-verify-jwt`.

```bash
# 1. Função de criptografia (chamada pelo frontend)
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 2. Criar cobrança PIX (chamada pelo frontend)
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 3. Consultar status (chamada pelo frontend)
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 4. Webhook (chamada pela PushinPay - server-to-server)
supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf
```

### 3.3. Verificar Deploy

```bash
# Listar functions deployadas
supabase functions list --project-ref wivbtmtgpsxupfjwwovf

# Ver logs de uma função específica
supabase functions logs encrypt-token --project-ref wivbtmtgpsxupfjwwovf
```

### 3.4. URLs das Functions Deployadas

Após o deploy, as funções estarão disponíveis em:

```
https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token
https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-create-pix
https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-get-status
https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook
```

---

## 4. Configurar Webhook na PushinPay

### 4.1. Acessar Painel da PushinPay

1. Login em: https://dashboard.pushinpay.com.br (ou sandbox)
2. Vá em **Configurações → Webhooks**

### 4.2. Adicionar Webhook

**URL do Webhook:**
```
https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook
```

**Eventos para Assinar:**
- [x] `pix.created` (PIX criado)
- [x] `pix.paid` (PIX pago)
- [x] `pix.expired` (PIX expirado)
- [x] `pix.canceled` (PIX cancelado)

**Método:** `POST`

**Headers:** (se necessário)
- `Content-Type: application/json`

### 4.3. Testar Webhook (Opcional)

A PushinPay geralmente oferece um botão "Testar Webhook". Use-o para verificar se a URL está acessível.

---

## 5. Testes em Sandbox

### 5.1. Configurar Integração no Frontend

1. Acesse: https://risecheckout.com (ou preview)
2. Faça login como vendedor
3. Vá em **Financeiro**
4. Configure a integração:
   - **Token PushinPay:** `<seu_token_de_sandbox>`
   - **Ambiente:** Sandbox
   - Clique em **Salvar integração**

**Resultado esperado:**
- ✅ Toast de sucesso: "Integração PushinPay salva com sucesso!"
- ✅ Nenhum erro no console do navegador

### 5.2. Criar Pedido de Teste

1. Crie um produto de teste (valor mínimo R$ 0,50)
2. Gere um checkout
3. Preencha os dados do cliente
4. Selecione **PIX** como forma de pagamento
5. Clique em **Finalizar pedido**

**Resultado esperado:**
- ✅ QR Code PIX exibido
- ✅ Código PIX copiável
- ✅ Status do pedido: "Aguardando pagamento"

### 5.3. Simular Pagamento no Sandbox

**Opção 1: Via Dashboard PushinPay**
1. Acesse o painel da PushinPay (Sandbox)
2. Vá em **Transações**
3. Localize o PIX criado
4. Clique em **Simular Pagamento**

**Opção 2: Via API (curl)**
```bash
curl -X POST https://api-sandbox.pushinpay.com.br/api/pix/simulate-payment \
  -H "Authorization: Bearer <seu_token_sandbox>" \
  -H "Content-Type: application/json" \
  -d '{"pix_id":"<pix_id_do_pedido>"}'
```

### 5.4. Verificar Atualização de Status

1. Volte para o checkout
2. O status deve atualizar automaticamente (polling)
3. Ou recarregue a página

**Resultado esperado:**
- ✅ Status do pedido atualizado para "Pago"
- ✅ Webhook recebeu notificação (verificar logs)

### 5.5. Verificar Logs das Functions

```bash
# Ver logs do webhook
supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf

# Ver logs de criação de PIX
supabase functions logs pushinpay-create-pix --project-ref wivbtmtgpsxupfjwwovf

# Ver logs de consulta de status
supabase functions logs pushinpay-get-status --project-ref wivbtmtgpsxupfjwwovf
```

---

## 6. Checklist Final

### 6.1. Pré-Deploy

- [ ] Supabase CLI instalado e autenticado
- [ ] Chave de criptografia gerada (32 bytes base64)
- [ ] Account ID da plataforma obtido
- [ ] Token de Sandbox da PushinPay obtido

### 6.2. Configuração

- [ ] `ENCRYPTION_KEY` configurada no Supabase
- [ ] `PLATFORM_PUSHINPAY_ACCOUNT_ID` configurada
- [ ] `PLATFORM_FEE_PERCENT` configurada (7.5)
- [ ] `PUSHINPAY_BASE_URL_PROD` configurada
- [ ] `PUSHINPAY_BASE_URL_SANDBOX` configurada

### 6.3. Deploy

- [ ] `encrypt-token` deployada com `--no-verify-jwt`
- [ ] `pushinpay-create-pix` deployada com `--no-verify-jwt`
- [ ] `pushinpay-get-status` deployada com `--no-verify-jwt`
- [ ] `pushinpay-webhook` deployada (sem `--no-verify-jwt`)
- [ ] Todas as functions aparecem em `supabase functions list`

### 6.4. Webhook

- [ ] Webhook configurado na PushinPay
- [ ] URL correta: `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook`
- [ ] Eventos selecionados: `pix.paid`, `pix.expired`, `pix.canceled`
- [ ] Teste de webhook bem-sucedido

### 6.5. Testes

- [ ] Integração salva no frontend sem erros
- [ ] Pedido de teste criado (R$ 0,50 mínimo)
- [ ] QR Code PIX gerado corretamente
- [ ] Pagamento simulado no Sandbox
- [ ] Status do pedido atualizado para "Pago"
- [ ] Webhook recebeu notificação (verificar logs)
- [ ] Split de 7.5% aplicado corretamente

### 6.6. Validação

- [ ] Nenhum erro no console do navegador
- [ ] Nenhum erro nos logs das Edge Functions
- [ ] Preflight OPTIONS retorna 204
- [ ] POST retorna 200 com dados corretos
- [ ] CORS funcionando (sem erros de origem)

---

## 7. Troubleshooting

### 7.1. Erro: "Failed to send a request to the Edge Function"

**Causa:** Edge Function não deployada ou CORS bloqueado.

**Solução:**
1. Verificar se a função foi deployada:
   ```bash
   supabase functions list --project-ref wivbtmtgpsxupfjwwovf
   ```
2. Verificar logs da função:
   ```bash
   supabase functions logs encrypt-token --project-ref wivbtmtgpsxupfjwwovf
   ```
3. Limpar cache do navegador (Ctrl+Shift+Delete)
4. Testar em aba anônima

### 7.2. Erro: "Request header field x-client-info is not allowed"

**Causa:** CORS não inclui `x-client-info` nos headers permitidos.

**Solução:**
✅ **JÁ CORRIGIDO** no código atual. Se o erro persistir:
1. Verificar se o deploy foi feito após a correção
2. Limpar cache do navegador
3. Verificar logs da função

### 7.3. Erro 406 Not Acceptable

**Causa:** Preflight OPTIONS falhando ou header `Accept` faltando.

**Solução:**
✅ **JÁ CORRIGIDO** no código atual. Se o erro persistir:
1. Verificar se o deploy foi feito após a correção
2. Verificar se preflight retorna 204:
   ```bash
   curl -X OPTIONS https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
     -H "Origin: https://risecheckout.com" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

### 7.4. Erro: "Encryption key not configured"

**Causa:** Variável `ENCRYPTION_KEY` não configurada.

**Solução:**
```bash
# Gerar chave
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Configurar
supabase secrets set ENCRYPTION_KEY=<chave_gerada>
```

### 7.5. Erro: "Token PushinPay inválido"

**Causa:** Token incorreto ou expirado.

**Solução:**
1. Verificar se o token é de Sandbox (se testando em Sandbox)
2. Verificar se o token não expirou
3. Gerar novo token no painel da PushinPay
4. Salvar novamente no frontend

### 7.6. Erro: "Pedido não encontrado"

**Causa:** `orderId` inválido ou pedido não existe.

**Solução:**
1. Verificar se o pedido foi criado corretamente
2. Verificar se o `orderId` está sendo passado corretamente
3. Verificar logs da função `pushinpay-create-pix`

### 7.7. Webhook não recebe notificações

**Causa:** URL incorreta ou webhook não configurado.

**Solução:**
1. Verificar URL do webhook na PushinPay
2. Verificar se a função `pushinpay-webhook` foi deployada
3. Testar webhook manualmente:
   ```bash
   curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "id": "pix_test",
       "status": "paid",
       "value": 100
     }'
   ```
4. Verificar logs do webhook:
   ```bash
   supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf
   ```

---

## 8. Comandos Úteis

### 8.1. Gerenciamento de Functions

```bash
# Listar functions
supabase functions list --project-ref wivbtmtgpsxupfjwwovf

# Ver logs em tempo real
supabase functions logs encrypt-token --follow --project-ref wivbtmtgpsxupfjwwovf

# Deletar function
supabase functions delete encrypt-token --project-ref wivbtmtgpsxupfjwwovf

# Re-deploy de todas as functions
./scripts/deploy-functions.sh
```

### 8.2. Gerenciamento de Secrets

```bash
# Listar secrets
supabase secrets list --project-ref wivbtmtgpsxupfjwwovf

# Atualizar secret
supabase secrets set PLATFORM_FEE_PERCENT=10 --project-ref wivbtmtgpsxupfjwwovf

# Deletar secret
supabase secrets unset ENCRYPTION_KEY --project-ref wivbtmtgpsxupfjwwovf
```

### 8.3. Testes Manuais

```bash
# Testar encrypt-token
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{"token":"test_token_123"}'

# Testar pushinpay-create-pix
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-create-pix \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{
    "orderId": "uuid-do-pedido",
    "value": 100
  }'
```

---

## 9. Migração para Produção

Após validar em Sandbox:

1. **Obter token de Produção** da PushinPay
2. **Configurar webhook de Produção** (mesma URL)
3. **Atualizar integração no frontend:**
   - Token de Produção
   - Ambiente: Produção
4. **Testar com valor real** (mínimo R$ 0,50)
5. **Monitorar logs** nas primeiras transações

---

## 10. Suporte

**Documentação PushinPay:**
- https://docs.pushinpay.com.br

**Documentação Supabase:**
- https://supabase.com/docs/guides/functions

**Repositório do Projeto:**
- https://github.com/olaalessandro9-wq/lovabloo-checkout-16140-81239-42802

**Logs e Monitoramento:**
- Supabase Dashboard: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf
- PushinPay Dashboard: https://dashboard.pushinpay.com.br

---

**Desenvolvido por:** Manus AI  
**Data:** 01 de Novembro de 2025  
**Versão:** 5.0.0  
**Commit:** `37e81c5`
