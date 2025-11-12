# Checklist de Conclusão e Aceite - Integração PushinPay

**Data:** 01 de Novembro de 2025  
**Projeto:** RiseCheckout  
**Integração:** PushinPay PIX com Split de Pagamento

---

## 📋 Checklist de Implementação

### **A) Código e Documentação**

- [ ] **A1.** Endpoint `/pix/cashIn` verificado em todo o código
  - Comando: `grep -R "/pix/create" . --exclude-dir=node_modules`
  - Resultado esperado: Nenhuma ocorrência encontrada
  - Evidência: Screenshot ou log do comando

- [ ] **A2.** Headers obrigatórios implementados
  - `Authorization: Bearer ${token}`
  - `Accept: application/json`
  - `Content-Type: application/json`
  - Evidência: Código da função `pushinpay-create-pix/index.ts`

- [ ] **A3.** Formato de `split_rules` conforme documentação
  - Formato: `{ value: number, account_id: string }`
  - Validação: Split ≤ 50% do valor total
  - Evidência: Código da função `pushinpay-create-pix/index.ts`

- [ ] **A4.** Documentação completa gerada
  - `ANALISE_DOCUMENTACAO_PUSHINPAY.md`
  - `DIAGNOSTICO_ERRO_500.md`
  - `GUIA_QA_SANDBOX.md`
  - `CHECKLIST_CONCLUSAO.md`
  - Evidência: Arquivos presentes no repositório

---

### **B) Configuração de Secrets**

- [ ] **B1.** `ENCRYPTION_KEY` configurada (32 bytes base64)
  - Comando: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - Configurada em: Supabase Dashboard ou CLI
  - Evidência: Screenshot do painel de secrets (valor pode estar ofuscado)

- [ ] **B2.** `PLATFORM_PUSHINPAY_ACCOUNT_ID` configurada
  - Valor: Account ID da plataforma na PushinPay
  - Obtido em: https://app.pushinpay.com.br/settings/account
  - Evidência: Screenshot do painel de secrets

- [ ] **B3.** `PLATFORM_FEE_PERCENT` configurada
  - Valor padrão: 7.5
  - Ajustável conforme modelo de negócio
  - Evidência: Screenshot do painel de secrets

- [ ] **B4.** `PUSHINPAY_BASE_URL_PROD` configurada
  - Valor: `https://api.pushinpay.com.br/api`
  - Evidência: Screenshot do painel de secrets

- [ ] **B5.** `PUSHINPAY_BASE_URL_SANDBOX` configurada
  - Valor: `https://api-sandbox.pushinpay.com.br/api`
  - Evidência: Screenshot do painel de secrets

- [ ] **B6.** `PUSHINPAY_WEBHOOK_TOKEN` configurada
  - Valor: `rise_secure_token_123` (mesmo token da PushinPay)
  - Usado para: Validação de segurança do webhook
  - Evidência: Screenshot do painel de secrets

---

### **C) Deploy de Edge Functions**

- [ ] **C1.** `encrypt-token` deployada com `--no-verify-jwt`
  - Comando: `supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf`
  - Status: Deployada com sucesso
  - Evidência: Log do deploy

- [ ] **C2.** `pushinpay-create-pix` deployada com `--no-verify-jwt`
  - Comando: `supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf`
  - Status: Deployada com sucesso
  - Evidência: Log do deploy

- [ ] **C3.** `pushinpay-get-status` deployada com `--no-verify-jwt`
  - Comando: `supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf`
  - Status: Deployada com sucesso
  - Evidência: Log do deploy

- [ ] **C4.** `pushinpay-webhook` deployada (com JWT)
  - Comando: `supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf`
  - Status: Deployada com sucesso
  - Evidência: Log do deploy

---

### **D) Configuração de CORS**

- [ ] **D1.** Whitelist de origens configurada
  - `https://risecheckout.com`
  - `https://preview.risecheckout.com`
  - `http://localhost:5173`
  - `http://localhost:3000`
  - Evidência: Código do módulo `_shared/cors.ts`

- [ ] **D2.** Headers CORS incluem `x-client-info`
  - Headers permitidos: `authorization, content-type, accept, apikey, x-client-info, prefer, x-requested-with`
  - Evidência: Código do módulo `_shared/cors.ts`

- [ ] **D3.** Preflight OPTIONS retorna 204 No Content
  - Método: `handleOptions(req)`
  - Status: 204
  - Evidência: Código do módulo `_shared/cors.ts`

---

### **E) Configuração de Webhook**

- [ ] **E1.** Webhook configurado no painel da PushinPay
  - URL: `https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook`
  - Evidência: Screenshot do painel da PushinPay

- [ ] **E2.** Eventos configurados
  - `pix.created`
  - `pix.paid`
  - `pix.expired`
  - `pix.canceled`
  - Evidência: Screenshot do painel da PushinPay

---

### **F) Testes em Sandbox**

- [ ] **F1.** Salvar integração (encrypt-token)
  - Resultado: Toast de sucesso, token mascarado
  - Evidência: Screenshot do frontend

- [ ] **F2.** Criar cobrança PIX (pushinpay-create-pix)
  - Resultado: QR Code gerado, resposta 200 OK
  - Evidência: Screenshot do QR Code e logs

- [ ] **F3.** Simular pagamento (webhook)
  - Resultado: Webhook recebido, status "paid"
  - Evidência: Screenshot dos logs e banco de dados

- [ ] **F4.** Consultar status (pushinpay-get-status)
  - Resultado: Status atualizado exibido no frontend
  - Evidência: Screenshot do frontend

- [ ] **F5.** Validar split de pagamento
  - Cálculo: 7.5% do valor total
  - Resultado: Split aplicado corretamente
  - Evidência: Screenshot do banco de dados ou API

- [ ] **F6.** Testar webhook de expiração
  - Resultado: Status "expired" após expiração
  - Evidência: Screenshot dos logs

- [ ] **F7.** Testar webhook de cancelamento
  - Resultado: Status "canceled" após cancelamento
  - Evidência: Screenshot dos logs

---

### **G) Segurança**

- [ ] **G1.** Token criptografado no banco de dados
  - Algoritmo: AES-256-GCM
  - Evidência: Registro no banco com token criptografado

- [ ] **G2.** Token mascarado na UI
  - Formato: `••••••••••••••••`
  - Evidência: Screenshot do frontend

- [ ] **G3.** RLS ativo no banco de dados
  - Tabelas: `payment_gateway_settings`, `payments_map`
  - Evidência: SQL das políticas RLS

- [ ] **G4.** Taxa da plataforma centralizada no backend
  - Vendedores não podem alterar
  - Evidência: Código da função e frontend

---

### **H) Performance**

- [ ] **H1.** Tempo de resposta < 3s para criar PIX
  - Medido: _____ segundos
  - Evidência: Screenshot do Network tab

- [ ] **H2.** Polling de status funcionando
  - Intervalo: 5 segundos
  - Evidência: Screenshot do Network tab

- [ ] **H3.** Webhook recebido em < 5s após pagamento
  - Medido: _____ segundos
  - Evidência: Logs com timestamps

---

## ✅ Critérios de Aceite

### **Mínimo para Produção (Obrigatório)**

- [ ] Todos os itens de **A) Código e Documentação** completos
- [ ] Todos os itens de **B) Configuração de Secrets** completos
- [ ] Todos os itens de **C) Deploy de Edge Functions** completos
- [ ] Todos os itens de **D) Configuração de CORS** completos
- [ ] Todos os itens de **E) Configuração de Webhook** completos
- [ ] Itens **F1, F2, F3, F4, F5** de **F) Testes em Sandbox** passando
- [ ] Todos os itens de **G) Segurança** completos
- [ ] Nenhum bug crítico encontrado

### **Recomendado para Produção**

- [ ] Todos os itens de **F) Testes em Sandbox** passando
- [ ] Todos os itens de **H) Performance** dentro dos limites
- [ ] Documentação revisada e aprovada
- [ ] Relatório de QA completo e assinado

### **Opcional (Nice to Have)**

- [ ] Testes de carga realizados
- [ ] Monitoramento configurado (alertas, dashboards)
- [ ] Backup e rollback planejados
- [ ] Documentação de troubleshooting expandida

---

## 🚦 Status de Aprovação

### **Resultado da Avaliação**

⬜ **APROVADO PARA PRODUÇÃO**
- Todos os critérios obrigatórios atendidos
- Nenhum bug crítico encontrado
- Performance dentro dos limites aceitáveis

⬜ **APROVADO COM RESSALVAS**
- Critérios obrigatórios atendidos
- Bugs menores encontrados (não bloqueantes)
- Plano de correção definido

⬜ **REPROVADO**
- Critérios obrigatórios não atendidos
- Bugs críticos encontrados
- Necessário correção antes de produção

---

## 📝 Observações e Pendências

### **Bugs Encontrados**

| ID | Descrição | Severidade | Status | Responsável |
|----|-----------|------------|--------|-------------|
| 1 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | ⬜ Aberto ⬜ Em Progresso ⬜ Resolvido | |
| 2 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | ⬜ Aberto ⬜ Em Progresso ⬜ Resolvido | |
| 3 | | ⬜ Crítico ⬜ Alto ⬜ Médio ⬜ Baixo | ⬜ Aberto ⬜ Em Progresso ⬜ Resolvido | |

### **Melhorias Sugeridas**

| ID | Descrição | Prioridade | Status |
|----|-----------|------------|--------|
| 1 | | ⬜ Alta ⬜ Média ⬜ Baixa | ⬜ Planejada ⬜ Em Progresso ⬜ Concluída |
| 2 | | ⬜ Alta ⬜ Média ⬜ Baixa | ⬜ Planejada ⬜ Em Progresso ⬜ Concluída |
| 3 | | ⬜ Alta ⬜ Média ⬜ Baixa | ⬜ Planejada ⬜ Em Progresso ⬜ Concluída |

### **Notas Adicionais**

_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

---

## 📅 Cronograma

| Etapa | Data Prevista | Data Realizada | Status |
|-------|---------------|----------------|--------|
| Configuração de Secrets | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Deploy de Edge Functions | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Configuração de Webhook | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Testes em Sandbox | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Revisão de Documentação | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Aprovação Final | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |
| Deploy em Produção | ___/___/___ | ___/___/___ | ⬜ Pendente ⬜ Concluído |

---

## ✍️ Assinaturas

### **Desenvolvedor**

Nome: _______________________  
Assinatura: _______________________  
Data: _______________________

### **QA/Tester**

Nome: _______________________  
Assinatura: _______________________  
Data: _______________________

### **Product Owner**

Nome: _______________________  
Assinatura: _______________________  
Data: _______________________

### **Tech Lead**

Nome: _______________________  
Assinatura: _______________________  
Data: _______________________

---

**Versão do Documento:** 1.0  
**Última Atualização:** 01/11/2025  
**Responsável:** Manus AI
