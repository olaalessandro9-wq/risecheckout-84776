# [DEPLOY] Integração PushinPay PIX - Resolver Erro 500 e Finalizar Implementação

**Tipo:** Deploy / Bug Fix  
**Prioridade:** 🔴 Alta  
**Status:** 📋 Pronto para Execução  
**Estimativa:** 2-4 horas  
**Responsável:** DevOps / Backend

---

## 📝 Descrição

Finalizar o deploy da integração PushinPay PIX com split de pagamento, resolvendo o erro "Edge Function returned a non-2xx status code" (HTTP 500) que ocorre ao tentar salvar a integração na página Financeiro.

**Erro Atual:**
```
POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token
500 (Internal Server Error)
```

**Causa Raiz Identificada:**
1. Edge Functions não deployadas
2. Secret `ENCRYPTION_KEY` não configurada
3. Outras secrets obrigatórias pendentes

---

## ✅ Validações Realizadas

### **Código 100% Correto**

Após análise da documentação oficial da PushinPay (https://app.theneo.io/pushinpay/pix/criar-pix), confirmamos que:

- ✅ Endpoint `/pix/cashIn` está correto (não há ocorrências de `/pix/create`)
- ✅ Headers obrigatórios implementados (`Authorization`, `Accept`, `Content-Type`)
- ✅ Formato de `split_rules` conforme documentação (`{value, account_id}`)
- ✅ CORS configurado corretamente (inclui `x-client-info`, preflight 204)
- ✅ Criptografia AES-256-GCM implementada
- ✅ RLS ativo no banco de dados

**Documentação de Referência:**
- `ANALISE_DOCUMENTACAO_PUSHINPAY.md` - Comparação código vs documentação oficial
- `DIAGNOSTICO_ERRO_500.md` - Análise completa do erro
- `RELATORIO_TECNICO_SUPABASE.md` - Especificação técnica completa

---

## 🎯 Objetivo

Realizar o deploy completo da integração PushinPay, permitindo que:

1. Vendedores salvem suas credenciais da PushinPay
2. Clientes paguem via PIX com QR Code
3. Plataforma receba automaticamente a taxa configurada (split)
4. Webhook atualize status dos pagamentos em tempo real

---

## 📋 Tarefas

### **Passo 1: Configurar Secrets no Supabase** ⏱️ 15 min

Execute o script de configuração de secrets:

```bash
cd /path/to/risecheckout

# Definir variáveis de ambiente
export PLATFORM_PUSHINPAY_ACCOUNT_ID="<seu_account_id_aqui>"
export PLATFORM_FEE_PERCENT="7.5"
export PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123"

# Executar script (gera ENCRYPTION_KEY automaticamente)
./scripts/configure-secrets.sh
```

**Ou configure manualmente via Dashboard:**

1. Acesse: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/functions
2. Vá em **Edge Functions → Secrets**
3. Adicione as seguintes secrets:

| Nome | Valor | Como Obter |
|------|-------|------------|
| `ENCRYPTION_KEY` | `<32_bytes_base64>` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PLATFORM_PUSHINPAY_ACCOUNT_ID` | `<account_id>` | Painel PushinPay → Settings → Account |
| `PLATFORM_FEE_PERCENT` | `7.5` | Taxa da plataforma (%) |
| `PUSHINPAY_BASE_URL_PROD` | `https://api.pushinpay.com.br/api` | URL de produção |
| `PUSHINPAY_BASE_URL_SANDBOX` | `https://api-sandbox.pushinpay.com.br/api` | URL de sandbox |
| `PUSHINPAY_WEBHOOK_TOKEN` | `rise_secure_token_123` | Token de validação do webhook (mesmo da PushinPay) |

**Validação:**
```bash
supabase secrets list --project-ref wivbtmtgpsxupfjwwovf
```

---

### **Passo 2: Deploy das Edge Functions** ⏱️ 30 min

Execute o script de deploy:

```bash
cd /path/to/risecheckout

# Deploy automatizado
./scripts/deploy-functions.sh
```

**Ou deploy manual:**

```bash
# 1. Funções chamadas pelo frontend (SEM JWT)
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

# 2. Webhook server-to-server (COM JWT)
supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf
```

**Validação:**
```bash
# Listar funções deployadas
supabase functions list --project-ref wivbtmtgpsxupfjwwovf

# Testar encrypt-token
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{"token":"test_token_123"}'

# Esperado: {"encrypted":"..."}
```

---

### **Passo 3: Configurar Webhook na PushinPay** ⏱️ 10 min

1. Acesse o painel da PushinPay: https://app.pushinpay.com.br/settings/webhooks
2. Adicione um novo webhook:
   - **URL:** `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook`
   - **Eventos:**
     - [x] `pix.created`
     - [x] `pix.paid`
     - [x] `pix.expired`
     - [x] `pix.canceled`
3. Salve a configuração

**Validação:**
```bash
# Testar webhook manualmente
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"pix.paid","data":{"id":"test-id","status":"paid"}}'
```

---

### **Passo 4: Testes em Sandbox** ⏱️ 1-2 horas

Siga o guia de QA completo: `GUIA_QA_SANDBOX.md`

**Testes Obrigatórios:**

1. ✅ **Salvar Integração**
   - Acesse: https://risecheckout.com/financeiro
   - Insira token de Sandbox
   - Clique em "Salvar integração"
   - Esperado: Toast de sucesso, sem erro 500

2. ✅ **Criar Cobrança PIX**
   - Crie pedido de R$ 0,50 (mínimo)
   - Gere QR Code
   - Esperado: QR Code exibido, resposta 200 OK

3. ✅ **Simular Pagamento**
   - Pague no painel da PushinPay
   - Esperado: Webhook recebido, status "paid"

4. ✅ **Validar Split**
   - Verifique banco de dados
   - Esperado: Split de 7.5% aplicado

**Evidências Necessárias:**
- Screenshots de cada teste
- Logs das Edge Functions
- Registros do banco de dados

---

### **Passo 5: Documentar Resultados** ⏱️ 30 min

Preencha o checklist de conclusão: `CHECKLIST_CONCLUSAO.md`

**Itens Obrigatórios:**
- [ ] Todas as secrets configuradas
- [ ] Todas as Edge Functions deployadas
- [ ] Webhook configurado
- [ ] Testes em Sandbox passando
- [ ] Evidências coletadas

---

## 🐛 Troubleshooting

### **Erro 500 persiste após deploy**

**Causa:** `ENCRYPTION_KEY` não configurada ou inválida

**Solução:**
```bash
# Verificar logs
supabase functions logs encrypt-token --project-ref wivbtmtgpsxupfjwwovf --tail

# Reconfigurar chave
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
supabase secrets set ENCRYPTION_KEY="<nova_chave>" --project-ref wivbtmtgpsxupfjwwovf

# Re-deploy
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf
```

### **Erro 401 ao criar PIX**

**Causa:** Token inválido ou ambiente incorreto

**Solução:**
1. Gere novo token no painel da PushinPay
2. Verifique se está usando token de Sandbox para ambiente Sandbox
3. Salve novamente a integração

### **Webhook não recebido**

**Causa:** URL incorreta ou eventos não configurados

**Solução:**
```bash
# Verificar logs
supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf --tail

# Verificar URL
echo "URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"

# Reconfigurar no painel da PushinPay
```

---

## 📊 Critérios de Aceite

### **Obrigatórios**

- [ ] Erro 500 resolvido (encrypt-token retorna 200 OK)
- [ ] Integração salva com sucesso no frontend
- [ ] QR Code PIX gerado corretamente
- [ ] Webhook atualiza status para "paid"
- [ ] Split de 7.5% aplicado automaticamente
- [ ] Nenhum erro de CORS no console

### **Recomendados**

- [ ] Tempo de resposta < 3s para criar PIX
- [ ] Webhook recebido em < 5s após pagamento
- [ ] Todos os testes do `GUIA_QA_SANDBOX.md` passando

---

## 📚 Documentação de Referência

| Documento | Descrição |
|-----------|-----------|
| `ANALISE_DOCUMENTACAO_PUSHINPAY.md` | Comparação código vs documentação oficial |
| `DIAGNOSTICO_ERRO_500.md` | Análise completa do erro 500 |
| `RELATORIO_TECNICO_SUPABASE.md` | Especificação técnica completa (1.182 linhas) |
| `GUIA_QA_SANDBOX.md` | Roteiro de testes em Sandbox |
| `CHECKLIST_CONCLUSAO.md` | Checklist de conclusão e aceite |
| `GUIA_DEPLOY_FINAL.md` | Guia de deploy com troubleshooting |
| `scripts/configure-secrets.sh` | Script de configuração de secrets |
| `scripts/deploy-functions.sh` | Script de deploy automatizado |

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf
- **PushinPay Dashboard:** https://app.pushinpay.com.br
- **Documentação PushinPay:** https://app.theneo.io/pushinpay/pix/criar-pix
- **Frontend (Produção):** https://risecheckout.com/financeiro
- **Repositório GitHub:** https://github.com/olaalessandro9-wq/lovabloo-checkout-16140-81239-42802

---

## 📅 Cronograma

| Etapa | Tempo Estimado | Status |
|-------|----------------|--------|
| Configurar Secrets | 15 min | ⬜ Pendente |
| Deploy Edge Functions | 30 min | ⬜ Pendente |
| Configurar Webhook | 10 min | ⬜ Pendente |
| Testes em Sandbox | 1-2 horas | ⬜ Pendente |
| Documentar Resultados | 30 min | ⬜ Pendente |
| **Total** | **2-4 horas** | |

---

## 💬 Comentários

_Espaço para anotações durante a execução:_

---

## ✅ Checklist de Execução

- [ ] Secrets configuradas (Passo 1)
- [ ] Edge Functions deployadas (Passo 2)
- [ ] Webhook configurado (Passo 3)
- [ ] Testes realizados (Passo 4)
- [ ] Documentação preenchida (Passo 5)
- [ ] Evidências coletadas
- [ ] Issue pode ser fechada

---

**Criado por:** Manus AI  
**Data:** 01/11/2025  
**Versão:** 1.0
