#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Script de Deploy Rápido - Integração PushinPay
# RiseCheckout - Execução Simplificada
# ============================================

echo "🚀 DEPLOY RÁPIDO - Integração PushinPay"
echo "========================================"
echo ""

# Verificar se está no diretório correto
if [ ! -d "supabase/functions" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto RiseCheckout"
    exit 1
fi

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

echo "✅ Ambiente validado"
echo ""

# ============================================
# ETAPA 1: CONFIGURAR SECRETS
# ============================================

echo "📦 ETAPA 1/2: Configurando Secrets..."
echo ""

echo "Gerando ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

echo "Configurando 6 secrets no Supabase..."
supabase secrets set ENCRYPTION_KEY="$ENCRYPTION_KEY" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID="9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PLATFORM_FEE_PERCENT="7.5" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_BASE_URL_PROD="https://api.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX="https://api-sandbox.pushinpay.com.br/api" --project-ref wivbtmtgpsxupfjwwovf
supabase secrets set PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123" --project-ref wivbtmtgpsxupfjwwovf

echo ""
echo "✅ Secrets configuradas"
echo ""

# ============================================
# ETAPA 2: DEPLOY DAS EDGE FUNCTIONS
# ============================================

echo "🚀 ETAPA 2/2: Deploy das Edge Functions..."
echo ""

echo "1/4 encrypt-token..."
supabase functions deploy encrypt-token --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

echo "2/4 pushinpay-create-pix..."
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

echo "3/4 pushinpay-get-status..."
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref wivbtmtgpsxupfjwwovf

echo "4/4 pushinpay-webhook..."
supabase functions deploy pushinpay-webhook --project-ref wivbtmtgpsxupfjwwovf

echo ""
echo "✅ Todas as Edge Functions deployadas"
echo ""

# ============================================
# INSTRUÇÕES FINAIS
# ============================================

echo "========================================"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "========================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configurar Webhook na PushinPay:"
echo "   URL: https://wivbtmtgpsxupfjwwovf.supabase.co/functions/v1/pushinpay-webhook"
echo "   Token: rise_secure_token_123"
echo "   Eventos: pix.created, pix.paid, pix.expired, pix.canceled"
echo ""
echo "2. Testar no frontend:"
echo "   https://risecheckout.com/financeiro"
echo ""
echo "3. Criar cobrança PIX de teste (≥ R$0,50)"
echo ""
echo "📚 Documentação completa: PLANO_FINAL_DEPLOY.md"
echo ""
