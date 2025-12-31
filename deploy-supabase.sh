#!/bin/bash

# Script de Deploy Automatizado - PodoAgenda WhatsApp Reminders
# Autor: Jadson Santos
# Data: 30/12/2024

echo "🚀 Deploy do Sistema de Lembretes WhatsApp - PodoAgenda"
echo "========================================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para verificar erros
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro: $1${NC}"
        exit 1
    fi
}

# Passo 1: Verificar se o token está configurado
echo -e "${YELLOW}📝 Passo 1: Verificando configuração...${NC}"
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ SUPABASE_ACCESS_TOKEN não está configurado!${NC}"
    echo ""
    echo "Por favor, execute primeiro:"
    echo "  export SUPABASE_ACCESS_TOKEN=\"seu-token-aqui\""
    echo ""
    echo "Obtenha seu token em: https://supabase.com/dashboard/account/tokens"
    exit 1
fi
echo -e "${GREEN}✅ Token configurado${NC}"
echo ""

# Passo 2: Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Execute este script na pasta raiz do projeto!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Pasta correta${NC}"
echo ""

# Passo 3: Solicitar Project ID
echo -e "${YELLOW}📝 Passo 2: Configuração do Projeto${NC}"
echo ""
read -p "Digite seu Supabase Project ID (ex: abcdefghijklmnop): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Project ID é obrigatório!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Linkando com o projeto $PROJECT_ID...${NC}"
npx supabase link --project-ref "$PROJECT_ID"
check_error "Falha ao linkar projeto"
echo -e "${GREEN}✅ Projeto linkado com sucesso${NC}"
echo ""

# Passo 4: Deploy da Edge Function
echo -e "${YELLOW}📦 Passo 3: Deploy da Edge Function...${NC}"
echo "Isso pode levar alguns minutos..."
npx supabase functions deploy send-whatsapp-reminder --no-verify-jwt
check_error "Falha no deploy da Edge Function"
echo -e "${GREEN}✅ Edge Function deployada${NC}"
echo ""

# Passo 5: Executar Migration
echo -e "${YELLOW}🗄️  Passo 4: Executando Migration (Criando Cron Job)...${NC}"
npx supabase db push
check_error "Falha ao executar migration"
echo -e "${GREEN}✅ Migration executada - Cron Job criado${NC}"
echo ""

# Passo 6: Configurar URLs no banco
echo -e "${YELLOW}🔧 Passo 5: Configurando URLs no banco...${NC}"
echo ""
echo "Execute os seguintes comandos no SQL Editor do Supabase:"
echo "https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
echo ""
echo -e "${YELLOW}-- Cole este SQL:${NC}"
echo ""
cat << EOF
-- Configure a URL da Edge Function
ALTER DATABASE postgres SET "app.settings.edge_function_url" = 
  'https://$PROJECT_ID.supabase.co/functions/v1/send-whatsapp-reminder';

-- Configure a Anon Key (pegue em Settings -> API)
ALTER DATABASE postgres SET "app.settings.supabase_anon_key" = 
  'COLE-SUA-ANON-KEY-AQUI';
EOF
echo ""
read -p "Pressione ENTER depois de executar o SQL acima..."
echo -e "${GREEN}✅ URLs configuradas${NC}"
echo ""

# Passo 7: Configurar Secrets
echo -e "${YELLOW}🔐 Passo 6: Configurar Secrets da API WhatsApp${NC}"
echo ""
echo "Acesse: https://supabase.com/dashboard/project/$PROJECT_ID/functions"
echo "Clique em 'Manage secrets' e adicione:"
echo ""
echo -e "${YELLOW}Para Evolution API (Gratuito):${NC}"
echo "  EVOLUTION_API_URL = https://sua-url-evolution.com"
echo "  EVOLUTION_API_KEY = sua-chave-api"
echo "  EVOLUTION_INSTANCE = nome-da-instancia"
echo ""
echo -e "${YELLOW}OU Para Twilio (Pago):${NC}"
echo "  TWILIO_ACCOUNT_SID = ACxxxxxxxx"
echo "  TWILIO_AUTH_TOKEN = xxxxxxxx"
echo "  TWILIO_WHATSAPP_FROM = whatsapp:+14155238886"
echo ""
read -p "Pressione ENTER depois de configurar os secrets..."
echo -e "${GREEN}✅ Secrets configurados${NC}"
echo ""

# Passo 8: Teste
echo -e "${YELLOW}🧪 Passo 7: Teste da Configuração${NC}"
echo ""
echo "Testando a Edge Function..."
echo ""

# Gerar dados de teste
TEST_DATA='{
  "appointment": {
    "id": "00000000-0000-0000-0000-000000000000",
    "client_name": "Teste Deploy",
    "client_whatsapp": "11999999999",
    "appointment_date": "'$(date +%Y-%m-%d)'",
    "appointment_time": "15:00",
    "clinic_name": "Clínica Teste"
  }
}'

echo "Dados de teste:"
echo "$TEST_DATA"
echo ""
read -p "Digite sua Supabase ANON KEY para testar: " ANON_KEY

if [ ! -z "$ANON_KEY" ]; then
    echo ""
    echo "Enviando requisição de teste..."
    curl -X POST \
      "https://$PROJECT_ID.supabase.co/functions/v1/send-whatsapp-reminder" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d "$TEST_DATA"
    echo ""
    echo ""
    echo -e "${YELLOW}⚠️  Se recebeu um erro de API WhatsApp, é normal (ainda precisa configurar Evolution/Twilio)${NC}"
    echo -e "${GREEN}✅ Se a função respondeu, está tudo certo!${NC}"
else
    echo -e "${YELLOW}⚠️  Teste manual pulado${NC}"
fi
echo ""

# Resumo Final
echo ""
echo "========================================================="
echo -e "${GREEN}🎉 DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo "========================================================="
echo ""
echo "✅ Edge Function deployada"
echo "✅ Cron Job criado (roda a cada 30min)"
echo "✅ Migration executada"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Configure a API WhatsApp (Evolution ou Twilio)"
echo "2. Teste criando um agendamento para hoje em 1h"
echo "3. Aguarde 30min e veja o lembrete chegar!"
echo ""
echo -e "${YELLOW}📚 Documentação completa:${NC}"
echo "  - DEPLOY_GUIDE.md"
echo "  - WHATSAPP_SETUP.md"
echo ""
echo -e "${YELLOW}🔍 Monitoramento:${NC}"
echo "SQL Editor: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;"
echo ""
echo "Desenvolvido por Jadson Santos © 2024"
echo "========================================================="


