# Guia de QA - Integração PushinPay (Sandbox)

**Data:** 01 de Novembro de 2025  
**Ambiente:** Sandbox (Testes)  
**Objetivo:** Validar fluxo completo da integração PushinPay

---

## 📋 Pré-requisitos

Antes de iniciar os testes, certifique-se de que:

- [ ] Edge Functions estão deployadas (execute `./scripts/deploy-functions.sh`)
- [ ] Secrets estão configuradas (execute `./scripts/configure-secrets.sh`)
- [ ] Você possui um token de API da PushinPay para Sandbox
- [ ] Webhook está configurado no painel da PushinPay

---

## 🧪 Roteiro de QA

### **Teste 1: Salvar Integração**

**Objetivo:** Verificar se o token é criptografado e salvo corretamente no banco de dados.

#### **Passos:**

1. Acesse: https://risecheckout.com/financeiro
2. No campo "API Token", cole o token de Sandbox da PushinPay
3. No campo "Ambiente", selecione "Sandbox (testes)"
4. Clique em "Salvar integração"

#### **Resultado Esperado:**

- ✅ Toast de sucesso: "Integração PushinPay salva com sucesso!"
- ✅ Nenhum erro no console do navegador
- ✅ Token aparece mascarado (••••••••••••••••)

#### **Resultado Indesejado:**

- ❌ Erro 500: "Edge Function returned a non-2xx status code"
  - **Causa:** `ENCRYPTION_KEY` não configurada ou função não deployada
  - **Solução:** Execute `./scripts/configure-secrets.sh` e `./scripts/deploy-functions.sh`

- ❌ Erro 406: "Not Acceptable"
  - **Causa:** CORS bloqueando preflight OPTIONS
  - **Solução:** Verifique se `x-client-info` está nos headers permitidos

#### **Evidências:**

- [ ] Screenshot do toast de sucesso
- [ ] Screenshot do console sem erros
- [ ] Screenshot do token mascarado

---

### **Teste 2: Criar Cobrança PIX**

**Objetivo:** Gerar QR Code PIX e validar resposta da API PushinPay.

#### **Passos:**

1. Crie um pedido de teste com valor mínimo de R$ 0,50 (50 centavos)
2. Acesse a página de checkout público
3. Selecione "PIX" como método de pagamento
4. Aguarde a geração do QR Code

#### **Resultado Esperado:**

- ✅ QR Code exibido na tela
- ✅ Código PIX copiável exibido
- ✅ Status "created" no banco de dados
- ✅ Resposta 200 da função `pushinpay-create-pix`

#### **Resultado Indesejado:**

- ❌ Erro 401: "Unauthorized"
  - **Causa:** Token inválido ou expirado
  - **Solução:** Gere um novo token no painel da PushinPay

- ❌ Erro 422: "O campo value deve ser no mínimo 50"
  - **Causa:** Valor menor que 50 centavos
  - **Solução:** Aumente o valor do pedido

- ❌ Erro 500: "Internal Server Error"
  - **Causa:** Endpoint incorreto ou erro na API da PushinPay
  - **Solução:** Verifique logs com `supabase functions logs pushinpay-create-pix`

#### **Evidências:**

- [ ] Screenshot do QR Code exibido
- [ ] Screenshot da resposta da API (200 OK)
- [ ] Screenshot do registro no banco de dados
- [ ] Copiar `id` da transação para próximo teste

---

### **Teste 3: Simular Pagamento**

**Objetivo:** Simular pagamento no painel da PushinPay e verificar webhook.

#### **Passos:**

1. Acesse o painel da PushinPay Sandbox
2. Localize a transação criada (use o `id` do teste anterior)
3. Clique em "Simular Pagamento" ou "Marcar como Pago"
4. Aguarde a notificação do webhook

#### **Resultado Esperado:**

- ✅ Webhook recebido pela função `pushinpay-webhook`
- ✅ Status atualizado para "paid" no banco de dados
- ✅ Campo `end_to_end_id` preenchido
- ✅ Campos `payer_name` e `payer_national_registration` preenchidos

#### **Resultado Indesejado:**

- ❌ Webhook não recebido
  - **Causa:** URL do webhook não configurada ou incorreta
  - **Solução:** Verifique URL no painel da PushinPay

- ❌ Erro 500 no webhook
  - **Causa:** Erro ao atualizar banco de dados
  - **Solução:** Verifique logs com `supabase functions logs pushinpay-webhook`

#### **Evidências:**

- [ ] Screenshot do painel da PushinPay com status "paid"
- [ ] Screenshot dos logs do webhook
- [ ] Screenshot do banco de dados com status atualizado
- [ ] Copiar `end_to_end_id` para validação

---

### **Teste 4: Consultar Status**

**Objetivo:** Validar que o frontend consulta e exibe o status atualizado.

#### **Passos:**

1. Na página de checkout, aguarde a atualização automática (polling)
2. Ou clique em "Atualizar Status" (se disponível)
3. Verifique se o status mudou de "created" para "paid"

#### **Resultado Esperado:**

- ✅ Status exibido como "Pago" ou "Aprovado"
- ✅ Mensagem de sucesso exibida
- ✅ Botão "Continuar" ou "Finalizar" habilitado

#### **Resultado Indesejado:**

- ❌ Status continua "created" após pagamento
  - **Causa:** Webhook não atualizou o banco ou polling não está funcionando
  - **Solução:** Verifique logs do webhook e função `pushinpay-get-status`

#### **Evidências:**

- [ ] Screenshot do status "Pago" exibido
- [ ] Screenshot da resposta da API `pushinpay-get-status`
- [ ] Screenshot do console sem erros

---

### **Teste 5: Split de Pagamento**

**Objetivo:** Validar que a taxa da plataforma foi aplicada corretamente.

#### **Passos:**

1. Acesse o banco de dados (tabela `payments_map`)
2. Localize o registro da transação
3. Verifique o campo `split_rules` ou consulte a API da PushinPay

#### **Resultado Esperado:**

- ✅ Split calculado corretamente (7.5% do valor total)
- ✅ `account_id` da plataforma presente no split
- ✅ Valor do split em centavos correto

**Exemplo:**
- Valor total: R$ 100,00 (10000 centavos)
- Split plataforma: R$ 7,50 (750 centavos)
- Vendedor recebe: R$ 92,50 (9250 centavos)

#### **Resultado Indesejado:**

- ❌ Split não aplicado
  - **Causa:** `PLATFORM_PUSHINPAY_ACCOUNT_ID` não configurada
  - **Solução:** Execute `./scripts/configure-secrets.sh`

- ❌ Split com valor incorreto
  - **Causa:** `PLATFORM_FEE_PERCENT` incorreta
  - **Solução:** Verifique secret e ajuste se necessário

#### **Evidências:**

- [ ] Screenshot do banco de dados com split_rules
- [ ] Screenshot da resposta da API PushinPay
- [ ] Cálculo manual do split validado

---

### **Teste 6: Webhook de Expiração**

**Objetivo:** Validar que o webhook atualiza status para "expired".

#### **Passos:**

1. Crie uma nova cobrança PIX
2. Aguarde 15 minutos (ou o tempo de expiração configurado)
3. Ou force a expiração no painel da PushinPay
4. Verifique se o webhook atualizou o status

#### **Resultado Esperado:**

- ✅ Webhook recebido com evento `pix.expired`
- ✅ Status atualizado para "expired" no banco de dados
- ✅ Frontend exibe mensagem "PIX Expirado"

#### **Resultado Indesejado:**

- ❌ Status não atualizado
  - **Causa:** Webhook não configurado para evento `pix.expired`
  - **Solução:** Adicione evento no painel da PushinPay

#### **Evidências:**

- [ ] Screenshot dos logs do webhook
- [ ] Screenshot do banco de dados com status "expired"
- [ ] Screenshot do frontend com mensagem de expiração

---

### **Teste 7: Webhook de Cancelamento**

**Objetivo:** Validar que o webhook atualiza status para "canceled".

#### **Passos:**

1. Crie uma nova cobrança PIX
2. Cancele manualmente no painel da PushinPay
3. Verifique se o webhook atualizou o status

#### **Resultado Esperado:**

- ✅ Webhook recebido com evento `pix.canceled`
- ✅ Status atualizado para "canceled" no banco de dados
- ✅ Frontend exibe mensagem "PIX Cancelado"

#### **Resultado Indesejado:**

- ❌ Status não atualizado
  - **Causa:** Webhook não configurado para evento `pix.canceled`
  - **Solução:** Adicione evento no painel da PushinPay

#### **Evidências:**

- [ ] Screenshot dos logs do webhook
- [ ] Screenshot do banco de dados com status "canceled"
- [ ] Screenshot do frontend com mensagem de cancelamento

---

## 📊 Checklist de Validação

### **Configuração**

- [ ] Edge Functions deployadas (4 funções)
- [ ] Secrets configuradas (5 secrets)
- [ ] Token de Sandbox configurado
- [ ] Webhook configurado no painel da PushinPay

### **Funcionalidades**

- [ ] Salvar integração (criptografia funcionando)
- [ ] Criar cobrança PIX (QR Code gerado)
- [ ] Simular pagamento (webhook recebido)
- [ ] Consultar status (status atualizado)
- [ ] Split de pagamento (taxa aplicada)
- [ ] Webhook de expiração (status expired)
- [ ] Webhook de cancelamento (status canceled)

### **Segurança**

- [ ] Token criptografado no banco de dados
- [ ] Token mascarado na UI
- [ ] CORS funcionando (sem erros 406)
- [ ] RLS ativo no banco de dados

### **Performance**

- [ ] Tempo de resposta < 3s para criar PIX
- [ ] Polling de status funcionando
- [ ] Webhook recebido em < 5s após pagamento

---

## 🐛 Troubleshooting

### **Erro 500 em encrypt-token**

**Sintoma:** "Edge Function returned a non-2xx status code"

**Causas Possíveis:**
1. `ENCRYPTION_KEY` não configurada
2. Edge Function não deployada
3. `ENCRYPTION_KEY` com formato inválido

**Solução:**
```bash
# Configurar secrets
./scripts/configure-secrets.sh

# Deploy das funções
./scripts/deploy-functions.sh

# Testar função
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \
  -H "Content-Type: application/json" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -d '{"token":"test"}'
```

### **Erro 401 em pushinpay-create-pix**

**Sintoma:** "Unauthorized"

**Causas Possíveis:**
1. Token inválido ou expirado
2. Token de produção usado em Sandbox (ou vice-versa)

**Solução:**
1. Gere um novo token no painel da PushinPay
2. Verifique se está usando o ambiente correto
3. Salve novamente a integração

### **Webhook não recebido**

**Sintoma:** Status não atualiza após pagamento

**Causas Possíveis:**
1. URL do webhook incorreta
2. Eventos não configurados
3. Erro 500 na função webhook

**Solução:**
```bash
# Verificar logs
supabase functions logs pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf --tail

# Verificar URL configurada
echo "URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"

# Testar webhook manualmente
curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"pix.paid","data":{"id":"test-id","status":"paid"}}'
```

---

## 📝 Relatório de QA

Ao finalizar os testes, preencha o relatório abaixo:

### **Informações Gerais**

- **Testador:** _______________________
- **Data:** _______________________
- **Ambiente:** Sandbox
- **Versão:** _______________________

### **Resultados**

| Teste | Status | Observações |
|-------|--------|-------------|
| 1. Salvar Integração | ⬜ Pass ⬜ Fail | |
| 2. Criar Cobrança PIX | ⬜ Pass ⬜ Fail | |
| 3. Simular Pagamento | ⬜ Pass ⬜ Fail | |
| 4. Consultar Status | ⬜ Pass ⬜ Fail | |
| 5. Split de Pagamento | ⬜ Pass ⬜ Fail | |
| 6. Webhook Expiração | ⬜ Pass ⬜ Fail | |
| 7. Webhook Cancelamento | ⬜ Pass ⬜ Fail | |

### **Bugs Encontrados**

| ID | Descrição | Severidade | Status |
|----|-----------|------------|--------|
| 1 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | |
| 2 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | |
| 3 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | |

### **Conclusão**

⬜ **Aprovado para Produção** - Todos os testes passaram sem bugs críticos  
⬜ **Aprovado com Ressalvas** - Bugs menores encontrados, mas não bloqueiam produção  
⬜ **Reprovado** - Bugs críticos encontrados, necessário correção antes de produção

**Observações Finais:**

_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

---

**Assinatura:** _______________________  
**Data:** _______________________
