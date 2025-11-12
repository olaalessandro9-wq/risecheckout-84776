#!/bin/bash

# Script de Deploy Completo - Integração PushinPay
# RiseCheckout - Valores Reais Pré-configurados
# Data: 01/11/2025

set -e

PROJECT_REF="wivbtmtgpsxupfjwwovf"

echo "=================================================="
echo "  Deploy Completo - Integração PushinPay"
echo "  Projeto: RiseCheckout"
echo "  Tempo Estimado: 1h55min"
echo "=================================================="
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Erro: Supabase CLI não está instalado"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado
if ! supabase projects list &> /dev/null; then
    echo "❌ Erro: Você não está logado no Supabase CLI"
    echo "Faça login com: supabase login"
    exit 1
fi

echo "✅ Supabase CLI detectado e autenticado"
echo ""

# ==================================================
# ETAPA 1: CONFIGURAR SECRETS (15 min)
# ==================================================

echo "=================================================="
echo "  ETAPA 1/5: Configurar Secrets"
echo "  Tempo Estimado: 15 minutos"
echo "=================================================="
echo ""

echo "Configurando 6 secrets no Supabase..."
echo ""

# 1. ENCRYPTION_KEY
echo "1/6 Configurando ENCRYPTION_KEY..."
supabase secrets set ENCRYPTION_KEY="Q1Z6U1VqZEdhV05GYzNsaFpXdz09" --project-ref "$PROJECT_REF"
echo "✅ ENCRYPTION_KEY configurada"
echo ""

# 2. PLATFORM_PUSHINPAY_ACCOUNT_ID
echo "2/6 Configurando PLATFORM_PUSHINPAY_ACCOUNT_ID..."
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID="9c83ed8a-2e48-4bdb-bfb5-4863a527f108" --project-ref "$PROJECT_REF"
echo "✅ PLATFORM_PUSHINPAY_ACCOUNT_ID configurada"
echo ""

# 3. PLATFORM_FEE_PERCENT
echo "3/6 Configurando PLATFORM_FEE_PERCENT..."
supabase secrets set PLATFORM_FEE_PERCENT="7.5" --project-ref "$PROJECT_REF"
echo "✅ PLATFORM_FEE_PERCENT configurada"
echo ""

# 4. PUSHINPAY_BASE_URL_PROD
echo "4/6 Configurando PUSHINPAY_BASE_URL_PROD..."
supabase secrets set PUSHINPAY_BASE_URL_PROD="https://api.pushinpay.com.br/api" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_BASE_URL_PROD configurada"
echo ""

# 5. PUSHINPAY_BASE_URL_SANDBOX
echo "5/6 Configurando PUSHINPAY_BASE_URL_SANDBOX..."
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX="https://api-sandbox.pushinpay.com.br/api" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_BASE_URL_SANDBOX configurada"
echo ""

# 6. PUSHINPAY_WEBHOOK_TOKEN
echo "6/6 Configurando PUSHINPAY_WEBHOOK_TOKEN..."
supabase secrets set PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_WEBHOOK_TOKEN configurada"
echo ""

echo "✅ Todas as secrets configuradas com sucesso!"
echo ""

# ==================================================
# ETAPA 2: DEPLOY DAS EDGE FUNCTIONS (30 min)
# ==================================================

echo "=================================================="
echo "  ETAPA 2/5: Deploy das Edge Functions"
echo "  Tempo Estimado: 30 minutos"
echo "=================================================="
echo ""

echo "Deployando 4 Edge Functions..."
echo ""

# 1. encrypt-token
echo "1/4 Deployando encrypt-token..."
echo "    Função: Criptografar tokens antes de salvar"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy encrypt-token --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ encrypt-token deployada"
echo ""

# 2. pushinpay-create-pix
echo "2/4 Deployando pushinpay-create-pix..."
echo "    Função: Criar cobrança PIX na PushinPay"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ pushinpay-create-pix deployada"
echo ""

# 3. pushinpay-get-status
echo "3/4 Deployando pushinpay-get-status..."
echo "    Função: Consultar status de pagamento PIX"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ pushinpay-get-status deployada"
echo ""

# 4. pushinpay-webhook
echo "4/4 Deployando pushinpay-webhook..."
echo "    Função: Receber notificações da PushinPay"
echo "    Acesso: Server-to-server (COM verificação JWT)"
echo ""
supabase functions deploy pushinpay-webhook --project-ref "$PROJECT_REF"
echo "✅ pushinpay-webhook deployada"
echo ""

echo "✅ Todas as Edge Functions deployadas com sucesso!"
echo ""

# ==================================================
# ETAPA 3: INSTRUÇÕES DE CONFIGURAÇÃO DO WEBHOOK
# ==================================================

echo "=================================================="
echo "  ETAPA 3/5: Configurar Webhook na PushinPay"
echo "  Tempo Estimado: 10 minutos"
echo "=================================================="
echo ""

echo "Acesse o painel da PushinPay e configure o webhook:"
echo ""
echo "URL:"
echo "  https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
echo ""
echo "Token:"
echo "  rise_secure_token_123"
echo ""
echo "Eventos:"
echo "  - pix.created"
echo "  - pix.paid"
echo "  - pix.expired"
echo "  - pix.canceled"
echo ""

read -p "Pressione ENTER após configurar o webhook na PushinPay..."
echo ""

# ==================================================
# ETAPA 4: TESTES
# ==================================================

echo "=================================================="
echo "  ETAPA 4/5: Testes em Sandbox"
echo "  Tempo Estimado: 40 minutos"
echo "=================================================="
echo ""

echo "Teste 1: Criptografia (encrypt-token)"
echo ""
echo "Execute o comando abaixo para testar:"
echo ""
echo "curl -X POST https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpdmJ0bXRncHN4dXBmand3b3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0Njk2MjcsImV4cCI6MjA0NjA0NTYyN30.Uh9Uw8lNJOqvZwDdLLfmLEkPF5pJMqH_K2mG_7wdQJQ\" \\"
echo "  -d '{\"token\":\"teste123\"}'"
echo ""

read -p "Pressione ENTER para continuar..."
echo ""

echo "Teste 2: Salvar Integração no Frontend"
echo ""
echo "1. Acesse: https://risecheckout.com/financeiro"
echo "2. Cole o token de Sandbox da PushinPay"
echo "3. Selecione \"Sandbox (testes)\""
echo "4. Clique em \"Salvar integração\""
echo ""
echo "Resultado esperado: Toast de sucesso, sem erro 500"
echo ""

read -p "Pressione ENTER após salvar a integração..."
echo ""

echo "Teste 3: Criar Cobrança PIX"
echo ""
echo "1. Crie um pedido de teste (mínimo R$ 0,50)"
echo "2. Selecione PIX como método de pagamento"
echo "3. Aguarde a geração do QR Code"
echo ""
echo "Resultado esperado: QR Code exibido, status \"created\""
echo ""

read -p "Pressione ENTER após gerar o QR Code..."
echo ""

echo "Teste 4: Simular Pagamento"
echo ""
echo "1. Acesse o painel da PushinPay Sandbox"
echo "2. Localize a transação criada"
echo "3. Clique em \"Simular Pagamento\""
echo "4. Aguarde a notificação do webhook"
echo ""
echo "Resultado esperado: Status \"paid\", webhook recebido"
echo ""

read -p "Pressione ENTER após simular o pagamento..."
echo ""

echo "Teste 5: Validar Split de Pagamento"
echo ""
echo "1. Acesse o banco de dados (tabela payments_map)"
echo "2. Verifique o campo split_rules"
echo ""
echo "Resultado esperado: Split de 7.5% aplicado"
echo "Account ID da plataforma: 9c83ed8a-2e48-4bdb-bfb5-4863a527f108"
echo ""

read -p "Pressione ENTER após validar o split..."
echo ""

# ==================================================
# ETAPA 5: VALIDAÇÃO FINAL
# ==================================================

echo "=================================================="
echo "  ETAPA 5/5: Validação Final"
echo "  Tempo Estimado: 20 minutos"
echo "=================================================="
echo ""

echo "Checklist de Validação:"
echo ""
echo "[ ] 6 secrets configuradas"
echo "[ ] 4 Edge Functions deployadas"
echo "[ ] Webhook configurado na PushinPay"
echo "[ ] Teste encrypt-token (200 OK)"
echo "[ ] Salvar integração (sem erro 500)"
echo "[ ] Criar cobrança PIX (QR Code gerado)"
echo "[ ] Simular pagamento (webhook recebido)"
echo "[ ] Split de 7.5% aplicado"
echo ""

read -p "Todos os itens foram validados? (s/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "=================================================="
    echo "  ✅ DEPLOY CONCLUÍDO COM SUCESSO!"
    echo "=================================================="
    echo ""
    echo "Integração PushinPay 100% funcional!"
    echo ""
    echo "URLs das funções:"
    echo "  - encrypt-token: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token"
    echo "  - pushinpay-create-pix: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-create-pix"
    echo "  - pushinpay-get-status: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-get-status"
    echo "  - pushinpay-webhook: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
    echo ""
    echo "Webhook configurado:"
    echo "  - URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
    echo "  - Token: rise_secure_token_123"
    echo ""
    echo "Split de pagamento:"
    echo "  - Taxa da plataforma: 7.5%"
    echo "  - Account ID: 9c83ed8a-2e48-4bdb-bfb5-4863a527f108"
    echo ""
    echo "Próximos passos:"
    echo "  1. Teste em produção com token real da PushinPay"
    echo "  2. Monitore logs: supabase functions logs --project-ref $PROJECT_REF --tail"
    echo "  3. Preencha o checklist de conclusão: CHECKLIST_CONCLUSAO.md"
    echo ""
else
    echo ""
    echo "⚠️  Alguns itens ainda precisam ser validados"
    echo "Revise o checklist e execute novamente"
    echo ""
fi
