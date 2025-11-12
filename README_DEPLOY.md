# 🚀 DEPLOY RÁPIDO - Integração PushinPay

## Como Usar

### **Opção 1: Script Automático (Recomendado)**

```bash
chmod +x deploy_rise_pushinpay.sh
./deploy_rise_pushinpay.sh
```

Este script faz **tudo automaticamente**:
- ✅ Gera e configura 6 secrets no Supabase
- ✅ Faz deploy de 4 Edge Functions
- ✅ Imprime instruções finais

**Tempo:** 5-10 minutos

---

### **Opção 2: Comandos Manuais**

Se preferir controle total, siga o arquivo: `INSTRUCOES_FINAIS.md`

---

## Após o Deploy

### **1. Configure o Webhook na PushinPay**

Acesse: https://app.pushinpay.com.br/settings/webhooks

| Campo | Valor |
|-------|-------|
| URL | `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook` |
| Token | `rise_secure_token_123` |
| Eventos | `pix.created, pix.paid, pix.expired, pix.canceled` |

---

### **2. Teste no Frontend**

1. Acesse: https://risecheckout.com/financeiro
2. Cole seu **token da PushinPay** (Sandbox ou Produção)
3. Clique em **Salvar integração**
4. Crie um pedido de R$ 0,50 ou mais
5. Gere o QR Code PIX
6. Simule o pagamento no painel da PushinPay

---

## ⚠️ Possíveis Erros

### **Erro 500 no encrypt-token**

**Causa:** ANON KEY errada ou secrets não configuradas

**Solução:**
1. Pegue a ANON KEY: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/api
2. Verifique as secrets: https://supabase.com/dashboard/project/wivbtmtgpsxupfjwwovf/settings/secrets

---

### **Webhook não funciona**

**Causa:** Webhook não configurado na PushinPay

**Solução:** Configure conforme Etapa 1 acima

---

### **Token de ambiente errado**

**Causa:** Token Sandbox usado em Produção (ou vice-versa)

**Solução:** Certifique-se de usar o token correto para o ambiente selecionado

---

## 📚 Documentação Completa

- **Instruções Finais:** `INSTRUCOES_FINAIS.md`
- **Plano Final:** `PLANO_FINAL_DEPLOY.md`
- **Comandos Prontos:** `COMANDOS_PRONTOS.md`
- **Guia de QA:** `GUIA_QA_SANDBOX.md`
- **Checklist:** `CHECKLIST_CONCLUSAO.md`

---

## ✅ Resultado Esperado

Após seguir todos os passos:

- ✅ Nenhum erro 500
- ✅ Integração PushinPay 100% funcional
- ✅ Criação e pagamento de PIX em tempo real
- ✅ Split automático de 7.5% aplicado
- ✅ Webhook ativo e seguro
- ✅ Account ID correto: `9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A`

---

**Repositório:** https://github.com/olaalessandro9-wq/lovabloo-checkout-16140-81239-42802  
**Suporte:** Consulte a documentação completa ou abra uma issue no GitHub
