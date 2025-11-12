#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Script de Deploy Final - Integração PushinPay
# RiseCheckout - Valores Reais Pré-configurados
# Data: 01/11/2025
# ============================================

PROJECT_REF="wivbtmtgpsxupfjwwovf"

# === Valores DA SUA CONTA (preenchidos) ===
PLATFORM_PUSHINPAY_ACCOUNT_ID="9F73D854-4DA8-45E1-AFB6-9A8F803EFB7A"
PLATFORM_FEE_PERCENT="7.5"
PUSHINPAY_BASE_URL_PROD="https://api.pushinpay.com.br/api"
PUSHINPAY_BASE_URL_SANDBOX="https://api-sandbox.pushinpay.com.br/api"
PUSHINPAY_WEBHOOK_TOKEN="rise_secure_token_123"

echo "=============================================="
echo "  Deploy Final - Integração PushinPay"
echo "  Projeto: RiseCheckout"
echo "  Project Ref: $PROJECT_REF"
echo "=============================================="
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

# ============================================
# ETAPA 1: GERAR E CONFIGURAR SECRETS
# ============================================

echo "=============================================="
echo "  ETAPA 1/3: Configurar Secrets"
echo "=============================================="
echo ""

echo ">> Gerando ENCRYPTION_KEY forte (32 bytes base64)..."
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "✅ ENCRYPTION_KEY gerada: ${ENCRYPTION_KEY:0:20}..."
echo ""

echo ">> Gravando secrets no Supabase ($PROJECT_REF)..."
echo ""

echo "1/6 Configurando ENCRYPTION_KEY..."
supabase secrets set ENCRYPTION_KEY="$ENCRYPTION_KEY" --project-ref "$PROJECT_REF"
echo "✅ ENCRYPTION_KEY configurada"
echo ""

echo "2/6 Configurando PLATFORM_PUSHINPAY_ACCOUNT_ID..."
supabase secrets set PLATFORM_PUSHINPAY_ACCOUNT_ID="$PLATFORM_PUSHINPAY_ACCOUNT_ID" --project-ref "$PROJECT_REF"
echo "✅ PLATFORM_PUSHINPAY_ACCOUNT_ID configurada"
echo ""

echo "3/6 Configurando PLATFORM_FEE_PERCENT..."
supabase secrets set PLATFORM_FEE_PERCENT="$PLATFORM_FEE_PERCENT" --project-ref "$PROJECT_REF"
echo "✅ PLATFORM_FEE_PERCENT configurada"
echo ""

echo "4/6 Configurando PUSHINPAY_BASE_URL_PROD..."
supabase secrets set PUSHINPAY_BASE_URL_PROD="$PUSHINPAY_BASE_URL_PROD" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_BASE_URL_PROD configurada"
echo ""

echo "5/6 Configurando PUSHINPAY_BASE_URL_SANDBOX..."
supabase secrets set PUSHINPAY_BASE_URL_SANDBOX="$PUSHINPAY_BASE_URL_SANDBOX" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_BASE_URL_SANDBOX configurada"
echo ""

echo "6/6 Configurando PUSHINPAY_WEBHOOK_TOKEN..."
supabase secrets set PUSHINPAY_WEBHOOK_TOKEN="$PUSHINPAY_WEBHOOK_TOKEN" --project-ref "$PROJECT_REF"
echo "✅ PUSHINPAY_WEBHOOK_TOKEN configurada"
echo ""

echo "✅ Todas as secrets configuradas com sucesso!"
echo ""

# ============================================
# ETAPA 2: DEPLOY DAS EDGE FUNCTIONS
# ============================================

echo "=============================================="
echo "  ETAPA 2/3: Deploy das Edge Functions"
echo "=============================================="
echo ""

echo ">> Deploy das Edge Functions (ordem correta)..."
echo ""

echo "1/4 Deployando encrypt-token..."
echo "    Função: Criptografar tokens antes de salvar"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy encrypt-token --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ encrypt-token deployada"
echo ""

echo "2/4 Deployando pushinpay-create-pix..."
echo "    Função: Criar cobrança PIX na PushinPay"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy pushinpay-create-pix --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ pushinpay-create-pix deployada"
echo ""

echo "3/4 Deployando pushinpay-get-status..."
echo "    Função: Consultar status de pagamento PIX"
echo "    Acesso: Frontend (--no-verify-jwt)"
echo ""
supabase functions deploy pushinpay-get-status --no-verify-jwt --project-ref "$PROJECT_REF"
echo "✅ pushinpay-get-status deployada"
echo ""

echo "4/4 Deployando pushinpay-webhook..."
echo "    Função: Receber notificações da PushinPay"
echo "    Acesso: Server-to-server (COM verificação JWT)"
echo ""
supabase functions deploy pushinpay-webhook --project-ref "$PROJECT_REF"
echo "✅ pushinpay-webhook deployada"
echo ""

echo "✅ Todas as Edge Functions deployadas com sucesso!"
echo ""

# ============================================
# ETAPA 3: INSTRUÇÕES FINAIS
# ============================================

echo "=============================================="
echo "  ETAPA 3/3: Configuração Final"
echo "=============================================="
echo ""

echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 PRÓXIMOS PASSOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣  Configurar Webhook na PushinPay:"
echo ""
echo "    Acesse: https://app.pushinpay.com.br/settings/webhooks"
echo ""
echo "    URL:"
echo "      https://$PROJECT_REF.supabase.co/functions/v1/pushinpay-webhook"
echo ""
echo "    Header:"
echo "      x-pushinpay-token: $PUSHINPAY_WEBHOOK_TOKEN"
echo ""
echo "    Eventos:"
echo "      - pix.created"
echo "      - pix.paid"
echo "      - pix.expired"
echo "      - pix.canceled"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2️⃣  Testar encrypt-token:"
echo ""
echo "    curl -X POST \"https://$PROJECT_REF.supabase.co/functions/v1/encrypt-token\" \\"
echo "      -H \"Content-Type: application/json\" \\"
echo "      -H \"apikey: <SUPABASE_ANON_KEY>\" \\"
echo "      -d '{\"token\":\"token_teste_123\"}'"
echo ""
echo "    Resultado esperado: {\"encrypted\":\"...\"}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "3️⃣  Testar no Frontend:"
echo ""
echo "    1. Acesse: https://risecheckout.com/financeiro"
echo "    2. Cole o token de Sandbox da PushinPay"
echo "    3. Selecione \"Sandbox (testes)\""
echo "    4. Clique em \"Salvar integração\""
echo ""
echo "    Resultado esperado: Toast de sucesso, sem erro 500"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 RESUMO DA CONFIGURAÇÃO:"
echo ""
echo "  Project Ref:        $PROJECT_REF"
echo "  Account ID:         $PLATFORM_PUSHINPAY_ACCOUNT_ID"
echo "  Taxa da Plataforma: $PLATFORM_FEE_PERCENT%"
echo "  Webhook Token:      $PUSHINPAY_WEBHOOK_TOKEN"
echo ""

echo "📚 DOCUMENTAÇÃO COMPLETA:"
echo ""
echo "  - DEPLOY_IMEDIATO.md         (comandos prontos)"
echo "  - CHECKLIST_RAPIDO.md        (referência rápida)"
echo "  - RESUMO_EXECUTIVO_FINAL.md  (visão geral)"
echo "  - GUIA_QA_SANDBOX.md         (testes detalhados)"
echo ""

echo "=============================================="
echo "  ✅ INTEGRAÇÃO PUSHINPAY PRONTA!"
echo "=============================================="
