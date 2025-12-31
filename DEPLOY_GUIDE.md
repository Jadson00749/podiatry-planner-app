# 🚀 Guia Rápido de Deploy - PodoAgenda

## 📋 Pré-requisitos

- ✅ Node.js instalado
- ✅ Git Bash ou terminal
- ✅ Conta no Supabase (https://supabase.com)

---

## 🔐 Passo 1: Obter seu Access Token do Supabase

### 1.1 Acesse o Dashboard
1. Vá em: https://supabase.com/dashboard/account/tokens
2. Faça login na sua conta

### 1.2 Gere um Access Token
1. Clique em **"Generate new token"**
2. Dê um nome: `CLI Token - PodoAgenda`
3. Copie o token gerado (guarde bem!)

### 1.3 Configure o token
No seu terminal Git Bash:

```bash
# Configure o token (cole o seu token aqui)
export SUPABASE_ACCESS_TOKEN="seu-token-aqui"
```

---

## 📦 Passo 2: Linkar com seu Projeto

### 2.1 Obtenha o Project ID
1. Acesse: https://supabase.com/dashboard/projects
2. Clique no seu projeto
3. Vá em **Settings** → **General**
4. Copie o **Reference ID** (ex: `abcdefghijklmnop`)

### 2.2 Linke o projeto
No terminal:

```bash
# Entre na pasta do projeto
cd c:/Users/santo/Documentos/React/podiatry-planner-pro

# Linke com seu projeto (substitua pelo seu ID)
npx supabase link --project-ref SEU-PROJECT-ID

# Exemplo:
# npx supabase link --project-ref abcdefghijklmnop
```

---

## 🚀 Passo 3: Deploy da Edge Function

```bash
# Deploy da função de WhatsApp
npx supabase functions deploy send-whatsapp-reminder --no-verify-jwt
```

**Explicação:**
- Essa função vai enviar os lembretes de WhatsApp
- Ela roda no servidor do Supabase (não no seu computador)
- `--no-verify-jwt` permite que o cron job chame a função

---

## 🗄️ Passo 4: Executar a Migration (Criar Cron Job)

```bash
# Aplica a migration que cria o cron job
npx supabase db push
```

**Explicação:**
- Cria a tabela de logs
- Cria a função SQL que busca agendamentos
- Configura o cron job para rodar a cada 30 minutos
- Habilita extensões necessárias (pg_cron, http)

---

## 🔑 Passo 5: Configurar Secrets (Variáveis de Ambiente)

### 5.1 No Dashboard do Supabase:
1. Vá em **Edge Functions** → **Manage secrets**
2. Adicione os seguintes secrets:

```bash
# Para Evolution API (gratuito)
EVOLUTION_API_URL=https://sua-url-evolution.com
EVOLUTION_API_KEY=sua-chave-api
EVOLUTION_INSTANCE=nome-da-instancia

# OU Para Twilio (pago)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 5.2 Configure as URLs no Banco

No **SQL Editor** do Supabase, execute:

```sql
-- Substitua pela URL do seu projeto
ALTER DATABASE postgres SET "app.settings.edge_function_url" = 
  'https://SEU-PROJECT-ID.supabase.co/functions/v1/send-whatsapp-reminder';

-- Pegue a anon key em Settings → API
ALTER DATABASE postgres SET "app.settings.supabase_anon_key" = 
  'SUA-ANON-KEY-AQUI';
```

---

## 📱 Passo 6: Configurar API WhatsApp

### Opção A: Evolution API (Gratuito) ⭐ Recomendado

#### 6.1 Usando serviço hospedado:
1. Acesse: https://evolution-api.com
2. Crie uma conta gratuita
3. Crie uma instância
4. Escaneie o QR Code com seu WhatsApp
5. Copie:
   - URL da API
   - API Key
   - Nome da instância

#### 6.2 Auto-hospedado (Docker):
```bash
# Clone o repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Suba com Docker
docker-compose up -d

# Acesse http://localhost:8080
```

### Opção B: Twilio (Pago, mas confiável)
1. Acesse: https://www.twilio.com/try-twilio
2. Crie uma conta
3. Ative WhatsApp API
4. Configure templates de mensagem
5. Copie suas credenciais

---

## 🧪 Passo 7: Testar

### Teste 1: Edge Function (Manual)

No terminal:

```bash
# Teste a função diretamente
curl -X POST \
  'https://SEU-PROJECT.supabase.co/functions/v1/send-whatsapp-reminder' \
  -H 'Authorization: Bearer SUA-ANON-KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "appointment": {
      "id": "00000000-0000-0000-0000-000000000000",
      "client_name": "Teste",
      "client_whatsapp": "11999999999",
      "appointment_date": "2024-12-31",
      "appointment_time": "15:00",
      "clinic_name": "Clínica Teste"
    }
  }'
```

### Teste 2: Cron Job (Automático)

No **SQL Editor**:

```sql
-- Execute a função manualmente
SELECT public.send_appointment_reminders();

-- Veja os logs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-whatsapp-reminders')
ORDER BY start_time DESC 
LIMIT 10;
```

### Teste 3: Criar agendamento real

1. Abra o app local: `npm run dev`
2. Faça login
3. Crie um agendamento para **hoje** em **1 hora**
4. Coloque um número de WhatsApp válido
5. Aguarde 30 minutos
6. O lembrete deve chegar! 🎉

---

## ✅ Checklist Final

- [ ] Token do Supabase configurado
- [ ] Projeto linkado (`npx supabase link`)
- [ ] Edge Function deployada
- [ ] Migration executada (cron job criado)
- [ ] Secrets configurados no dashboard
- [ ] URLs configuradas no banco
- [ ] API WhatsApp testada
- [ ] Teste manual funcionou
- [ ] Teste de agendamento real criado

---

## 🐛 Troubleshooting

### Erro: "Cannot find project"
```bash
# Verifique se está linkado
npx supabase projects list

# Relinke
npx supabase link --project-ref SEU-ID
```

### Erro: "Permission denied"
```bash
# Configure o token novamente
export SUPABASE_ACCESS_TOKEN="seu-token"
```

### Lembretes não chegam
1. Verifique se o cron está rodando:
```sql
SELECT * FROM cron.job WHERE jobname = 'send-whatsapp-reminders';
```

2. Verifique os logs:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

3. Verifique se há agendamentos elegíveis:
```sql
SELECT 
  a.*,
  c.whatsapp,
  (a.appointment_time::time - CURRENT_TIME::time) as tempo_restante
FROM appointments a
JOIN clients c ON c.id = a.client_id
WHERE 
  a.status = 'scheduled'
  AND a.appointment_date = CURRENT_DATE
  AND a.reminder_sent = false
  AND c.whatsapp IS NOT NULL;
```

---

## 📚 Recursos

- [Documentação Supabase CLI](https://supabase.com/docs/guides/cli)
- [Evolution API Docs](https://doc.evolution-api.com/)
- [Documentação pg_cron](https://github.com/citusdata/pg_cron)
- [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) - Guia completo

---

## 🎯 Próximos Passos

Após tudo configurado:

1. **Monitore os logs** nos primeiros dias
2. **Ajuste o horário** de envio se necessário (1h antes, 2h antes, etc.)
3. **Customize a mensagem** se quiser
4. **Configure backup** do banco de dados
5. **Implemente política de privacidade** (LGPD)

---

**Desenvolvido por Jadson Santos © 2024**

🎉 **Parabéns! Seu sistema está automatizado!**


