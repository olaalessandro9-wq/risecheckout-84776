#!/bin/bash

# Script de Deploy das Edge Functions
# Integração PushinPay - RiseCheckout
# Data: 01/11/2025

set -e

PROJECT_REF="wivbtmtgpsxupfjwwovf"

echo "=================================================="
echo "  Deploy de Edge Functions - Integração PushinPay"
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

# Verificar se as secrets estão configuradas
echo "Verificando secrets configuradas..."
echo ""

SECRETS_OK=true

# Listar secrets (se o comando estiver disponível)
if supabase secrets list --project-ref "$PROJECT_REF" &> /dev/null; then
    echo "✅ Secrets configuradas no projeto"
else
    echo "⚠️  Não foi possível verificar secrets"
    echo "Certifique-se de que as seguintes secrets estão configuradas:"
    echo "  - ENCRYPTION_KEY"
    echo "  - PLATFORM_PUSHINPAY_ACCOUNT_ID"
    echo "  - PLATFORM_FEE_PERCENT"
    echo "  - PUSHINPAY_BASE_URL_PROD"
    echo "  - PUSHINPAY_BASE_URL_SANDBOX"
    echo ""
    read -p "Deseja continuar? (s/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Deploy cancelado"
        exit 1
    fi
fi

echo ""

# Deploy das Edge Functions na ordem correta
echo "=================================================="
echo "  Iniciando Deploy das Edge Functions"
echo "=================================================="
echo ""

# 1. encrypt-token (chamada pelo frontend - SEM JWT)
echo "1/4 Deployando encrypt-token..."
echo "    Função: Criptografar tokens antes de salvar"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""

supabase functions deploy encrypt-token \
  --no-verify-jwt \
  --project-ref "$PROJECT_REF"

echo "✅ encrypt-token deployada"
echo ""

# 2. pushinpay-create-pix (chamada pelo frontend - SEM JWT)
echo "2/4 Deployando pushinpay-create-pix..."
echo "    Função: Criar cobrança PIX na PushinPay"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""

supabase functions deploy pushinpay-create-pix \
  --no-verify-jwt \
  --project-ref "$PROJECT_REF"

echo "✅ pushinpay-create-pix deployada"
echo ""

# 3. pushinpay-get-status (chamada pelo frontend - SEM JWT)
echo "3/4 Deployando pushinpay-get-status..."
echo "    Função: Consultar status de pagamento PIX"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""

supabase functions deploy pushinpay-get-status \
  --no-verify-jwt \
  --project-ref "$PROJECT_REF"

echo "✅ pushinpay-get-status deployada"
echo ""

# 4. pushinpay-webhook (chamada pela PushinPay - COM JWT)
echo "4/4 Deployando pushinpay-webhook..."
echo "    Função: Receber notificações da PushinPay"
echo "    Acesso: Server-to-server (COM verificação JWT)"
echo ""

supabase functions deploy pushinpay-webhook \
  --project-ref "$PROJECT_REF"

echo "✅ pushinpay-webhook deployada"
echo ""

# Resumo
echo "=================================================="
echo "  ✅ Deploy Concluído com Sucesso!"
echo "=================================================="
echo ""
echo "Edge Functions deployadas:"
echo "  ✅ encrypt-token (--no-verify-jwt)"
echo "  ✅ pushinpay-create-pix (--no-verify-jwt)"
echo "  ✅ pushinpay-get-status (--no-verify-jwt)"
echo "  ✅ pushinpay-webhook (com JWT)"
echo ""
echo "URLs das funções:"
echo "  https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/encrypt-token"
echo "  https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-create-pix"
echo "  https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-get-status"
echo "  https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
echo ""
echo "Próximos passos:"
echo "  1. Configurar webhook na PushinPay:"
echo "     URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
echo "     Eventos: pix.created, pix.paid, pix.expired, pix.canceled"
echo ""
echo "  2. Testar integração em Sandbox:"
echo "     - Acesse: https://risecheckout.com/financeiro"
echo "     - Configure token de Sandbox"
echo "     - Crie um pedido de teste (mínimo R$ 0,50)"
echo "     - Gere QR Code e simule pagamento"
echo ""
echo "  3. Verificar logs:"
echo "     supabase functions logs --project-ref $PROJECT_REF --tail"
echo ""
