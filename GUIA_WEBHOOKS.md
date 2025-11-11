# 🎯 Guia de Uso - Sistema de Webhooks RiseCheckout

**Data:** 11 de Novembro de 2025
**Versão:** 1.0

## 📋 Resumo da Implementação

O sistema completo de webhooks foi implementado com sucesso no RiseCheckout! Agora você pode automatizar a entrega de produtos e outras ações através de notificações em tempo real para seu servidor N8n ou qualquer outro endpoint.

## ✅ O que foi Implementado

### Backend (Supabase Edge Functions)

**1. Nova Edge Function: `trigger-webhooks`**
- Localização: `supabase/functions/trigger-webhooks/index.ts`
- Responsabilidade: Processar eventos e enviar webhooks para endpoints configurados
- Funcionalidades:
  - Busca webhooks ativos do vendedor para o evento específico
  - Constrói payload JSON detalhado com dados do pedido, cliente e produto
  - Gera assinatura HMAC-SHA256 para segurança
  - Envia requisição POST para o endpoint configurado
  - Registra cada tentativa na tabela `webhook_deliveries`

**2. Modificação: `pushinpay-get-status`**
- Localização: `supabase/functions/pushinpay-get-status/index.ts`
- Modificação: Dispara webhook automaticamente após confirmação de pagamento
- Evento disparado: `purchase_approved`

### Frontend (React + TypeScript)

**1. Componente Principal: `WebhooksConfig`**
- Localização: `src/components/webhooks/WebhooksConfig.tsx`
- Funcionalidades:
  - Lista todos os webhooks configurados
  - Permite criar, editar e excluir webhooks
  - Mostra status (ativo/inativo) e eventos assinados
  - Integrado na página de Integrações

**2. Componente de Formulário: `WebhookForm`**
- Localização: `src/components/webhooks/WebhookForm.tsx`
- Funcionalidades:
  - Formulário para adicionar/editar webhooks
  - Validação de URL
  - Seleção de eventos via checkboxes
  - Geração automática de secret para novos webhooks
  - Switch para ativar/desativar

**3. Componente de Lista: `WebhooksList`**
- Localização: `src/components/webhooks/WebhooksList.tsx`
- Funcionalidades:
  - Tabela com todos os webhooks configurados
  - Ações de editar e excluir
  - Confirmação antes de excluir
  - Máscara de URL para segurança

## 🚀 Como Usar

### Passo 1: Acessar a Página de Integrações

1. Faça login no RiseCheckout
2. Acesse o menu **Integrações**
3. Role até a seção **Webhooks**

### Passo 2: Criar um Novo Webhook

1. Clique no botão **"Novo Webhook"**
2. Preencha os campos:
   - **URL do Webhook**: O endpoint que receberá as notificações (ex: `https://seu-n8n.com/webhook/rise`)
   - **Secret**: Será gerado automaticamente - **copie e guarde em local seguro**
   - **Eventos**: Selecione os eventos que deseja receber:
     - ✅ **PIX Gerado**: Notificação quando um PIX é criado
     - ✅ **Compra Aprovada**: Notificação quando o pagamento é confirmado
   - **Ativo**: Deixe marcado para ativar imediatamente
3. Clique em **"Criar Webhook"**

### Passo 3: Configurar o N8n para Receber Webhooks

#### Estrutura do Payload Recebido

Quando um evento ocorre, seu endpoint receberá uma requisição POST com o seguinte formato:

```json
{
  "event_id": "evt_12345-67890-abcde",
  "event_type": "purchase_approved",
  "created_at": "2025-11-11T10:00:00Z",
  "data": {
    "order": {
      "id": "ord_67890-abcde-12345",
      "status": "paid",
      "amount_cents": 5000,
      "currency": "BRL",
      "paid_at": "2025-11-11T09:59:58Z",
      "created_at": "2025-11-11T09:50:00Z",
      "gateway": "pushinpay",
      "payment_method": "pix"
    },
    "customer": {
      "name": "João da Silva",
      "email": "joao.silva@example.com"
    },
    "product": {
      "id": "prod_abcde-12345",
      "name": "Curso de N8n Avançado",
      "description": "Aprenda automação com N8n",
      "price": 5000
    }
  }
}
```

#### Headers Importantes

- **`X-Rise-Signature`**: Assinatura HMAC-SHA256 do payload (use para validar autenticidade)
- **`X-Rise-Event`**: Tipo do evento (ex: `purchase_approved`)
- **`X-Rise-Event-Id`**: ID único do evento
- **`Content-Type`**: `application/json`

### Passo 4: Validar a Assinatura (Segurança)

Para garantir que a requisição veio realmente do RiseCheckout, valide a assinatura:

**Exemplo em Node.js (N8n):**

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

// No seu workflow N8n:
const payload = $json; // Payload recebido
const signature = $node["Webhook"].json["headers"]["x-rise-signature"];
const secret = "whsec_seu_secret_aqui";

if (validateWebhook(payload, signature, secret)) {
  // Requisição válida - processar
  return payload;
} else {
  // Requisição inválida - rejeitar
  throw new Error("Assinatura inválida");
}
```

### Passo 5: Criar Workflow de Automação no N8n

**Exemplo de Workflow para Envio de Email:**

1. **Webhook Node** (Trigger)
   - Recebe a notificação do RiseCheckout
   - Valida a assinatura

2. **Function Node** (Validação)
   - Valida a assinatura HMAC
   - Extrai dados do pedido

3. **Switch Node** (Roteamento)
   - Roteia baseado no tipo de evento (`purchase_approved`, `pix_generated`)

4. **HTTP Request Node** (Buscar Produto)
   - Opcional: Buscar informações adicionais do produto

5. **Email Node** (Envio)
   - Envia email com acesso ao produto
   - Usa dados do cliente e produto do payload

## 📧 Configuração de Email (Próximo Passo)

Para enviar emails profissionais, você precisará configurar um serviço SMTP. Recomendações:

### Opção 1: SendGrid (Recomendado para Iniciantes)
- ✅ **Prós**: Fácil configuração, 100 emails/dia grátis, boa entregabilidade
- ❌ **Contras**: Limite no plano gratuito
- 🔗 **Site**: https://sendgrid.com
- 💰 **Preço**: Grátis até 100 emails/dia, depois $19.95/mês

### Opção 2: Amazon SES (Recomendado para Escala)
- ✅ **Prós**: Muito barato ($0.10 por 1000 emails), escalável, confiável
- ❌ **Contras**: Configuração mais técnica, requer validação de domínio
- 🔗 **Site**: https://aws.amazon.com/ses
- 💰 **Preço**: $0.10 por 1000 emails

### Configuração DNS (wisecheckout.com)

Para evitar que seus emails caiam em spam, configure os registros DNS no Hostinger:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:sendgrid.net ~all
```
(Ou `include:amazonses.com` se usar Amazon SES)

**DKIM Record:**
Será fornecido pelo SendGrid/Amazon SES após configuração

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@wisecheckout.com
```

## 🔍 Monitoramento e Debug

### Visualizar Entregas de Webhooks

As entregas são registradas na tabela `webhook_deliveries` do Supabase:

```sql
SELECT 
  event_type,
  status,
  attempts,
  response_status,
  created_at
FROM webhook_deliveries
WHERE webhook_id = 'seu_webhook_id'
ORDER BY created_at DESC;
```

### Logs da Edge Function

Para ver logs de execução:
1. Acesse o painel do Supabase
2. Vá em **Edge Functions**
3. Selecione `trigger-webhooks`
4. Visualize os logs em tempo real

## 🎯 Eventos Disponíveis

| Evento | Descrição | Quando é Disparado |
|--------|-----------|-------------------|
| `pix_generated` | PIX foi gerado | Após criação do QR Code PIX |
| `purchase_approved` | Compra aprovada | Após confirmação do pagamento |

## ⚠️ Importante

1. **Secret é exibido apenas uma vez**: Ao criar um webhook, copie e guarde o secret em local seguro
2. **Validação de assinatura**: Sempre valide a assinatura para garantir segurança
3. **Resposta do endpoint**: Seu endpoint deve responder com status 2xx (200-299) para confirmar recebimento
4. **Timeout**: O webhook tem timeout de 10 segundos - garanta que seu endpoint responda rapidamente

## 🚀 Próximos Passos

1. ✅ **Implementação concluída** - Sistema de webhooks está pronto
2. ⏳ **Configurar N8n** - Criar workflow para receber webhooks
3. ⏳ **Configurar SMTP** - Escolher entre SendGrid ou Amazon SES
4. ⏳ **Configurar DNS** - Adicionar registros SPF, DKIM e DMARC
5. ⏳ **Testar fluxo completo** - Fazer uma compra teste e verificar automação

## 📞 Suporte

Se precisar de ajuda ou tiver dúvidas sobre a implementação, estou à disposição!

---

**Desenvolvido por:** Manus AI
**Versão:** 1.0
**Data:** 11 de Novembro de 2025
