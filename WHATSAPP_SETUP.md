# 📱 Configuração de Lembretes Automáticos via WhatsApp

Este documento explica como configurar e ativar o sistema de lembretes automáticos do PodoAgenda.

## 📋 Índice

1. [Como Funciona](#como-funciona)
2. [Requisitos](#requisitos)
3. [Configuração Passo a Passo](#configuração-passo-a-passo)
4. [Opções de API WhatsApp](#opções-de-api-whatsapp)
5. [Deploy](#deploy)
6. [Testes](#testes)
7. [Monitoramento](#monitoramento)
8. [Troubleshooting](#troubleshooting)

---

## 🔄 Como Funciona

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO SISTEMA                         │
└─────────────────────────────────────────────────────────────┘

1. ⏰ A cada 30 minutos, o pg_cron executa a função SQL
      └─> Horários: 00:00, 00:30, 01:00, 01:30, etc.

2. 🔍 A função SQL busca agendamentos que atendem:
      ✓ Data = hoje
      ✓ Status = 'scheduled'
      ✓ Horário entre 1h e 1h30min a partir de agora
      ✓ reminder_sent = false
      ✓ Cliente tem WhatsApp cadastrado

3. 📤 Para cada agendamento encontrado:
      └─> Chama a Edge Function com os dados
      └─> Edge Function envia WhatsApp via API
      └─> Marca reminder_sent = true no banco

4. ✅ Cliente recebe mensagem no WhatsApp!
```

**Exemplo prático:**
- Agora são **14:00**
- Cliente tem consulta às **15:15**
- Job roda às **14:00** e **14:30**
- Na execução das **14:30**, detecta que falta **45min** (entre 1h e 1h30min)
- Envia o lembrete! 🎉

---

## 📦 Requisitos

### 1. Supabase CLI instalado
```bash
# Instalar Supabase CLI
npm install -g supabase

# ou
brew install supabase/tap/supabase
```

### 2. Uma API de WhatsApp
Escolha uma das opções:
- **Evolution API** (Gratuito, Open Source) ⭐ Recomendado para começar
- **Twilio** (Pago, ~$0.005 por mensagem)
- **WhatsApp Business API** (Oficial, requer aprovação)

---

## 🚀 Configuração Passo a Passo

### Passo 1: Deploy da Edge Function

```bash
# Navegue até a pasta do projeto
cd c:/Users/santo/Documentos/React/podiatry-planner-pro

# Faça login no Supabase
supabase login

# Linke com seu projeto
supabase link --project-ref seu-projeto-id

# Deploy da função
supabase functions deploy send-whatsapp-reminder
```

### Passo 2: Execute a Migration

```bash
# Execute a migration para criar o cron job
supabase db push

# ou via SQL Editor no dashboard do Supabase
# Cole o conteúdo do arquivo: supabase/migrations/20251230_create_reminder_job.sql
```

### Passo 3: Configure as Variáveis de Ambiente

No **Dashboard do Supabase** → **Settings** → **Edge Functions** → **Add Secrets**:

#### Para Evolution API:
```bash
EVOLUTION_API_URL=https://sua-url-evolution.com
EVOLUTION_API_KEY=sua-chave-api
EVOLUTION_INSTANCE=nome-da-instancia
```

#### Para Twilio (alternativa):
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Passo 4: Configure as URLs no Banco

Execute no **SQL Editor**:

```sql
-- Substitua os valores pelos seus
ALTER DATABASE postgres SET "app.settings.edge_function_url" = 
  'https://seu-projeto.supabase.co/functions/v1/send-whatsapp-reminder';

ALTER DATABASE postgres SET "app.settings.supabase_anon_key" = 
  'sua-anon-key-aqui';
```

---

## 📱 Opções de API WhatsApp

### Opção 1: Evolution API (Recomendado) 🌟

**Vantagens:**
- ✅ Gratuito e Open Source
- ✅ Fácil de instalar
- ✅ Suporta múltiplas instâncias
- ✅ Webhook integrado

**Instalação:**

```bash
# Docker Compose (mais fácil)
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
docker-compose up -d
```

**Ou use serviço hospedado:**
- https://evolution-api.com (Managed)
- https://evo.w3pro.cloud (Brasileiro)

**Configuração:**
1. Acesse o painel web
2. Crie uma instância
3. Escaneie o QR Code com seu WhatsApp
4. Copie a API Key e URL
5. Configure no Supabase

### Opção 2: Twilio

**Vantagens:**
- ✅ Muito confiável
- ✅ Documentação excelente
- ✅ Suporte 24/7

**Desvantagens:**
- ❌ Pago (~$0.005/mensagem)
- ❌ Precisa de aprovação para template

**Configuração:**
1. Crie conta em https://www.twilio.com
2. Ative WhatsApp Business API
3. Configure templates de mensagem
4. Obtenha credenciais
5. Configure no Supabase

---

## 🧪 Testes

### Teste Manual da Edge Function

```bash
# Teste via curl
curl -X POST \
  'https://seu-projeto.supabase.co/functions/v1/send-whatsapp-reminder' \
  -H 'Authorization: Bearer sua-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "appointment": {
      "id": "uuid-do-agendamento",
      "client_name": "João Silva",
      "client_whatsapp": "11999999999",
      "appointment_date": "2024-12-30",
      "appointment_time": "15:00",
      "clinic_name": "Clínica Teste"
    }
  }'
```

### Teste do Cron Job

```sql
-- Execute manualmente a função
SELECT public.send_appointment_reminders();

-- Verifique os logs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-whatsapp-reminders')
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 📊 Monitoramento

### Ver Jobs Agendados

```sql
SELECT * FROM cron.job WHERE jobname = 'send-whatsapp-reminders';
```

### Ver Execuções Recentes

```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-whatsapp-reminders')
ORDER BY start_time DESC
LIMIT 20;
```

### Ver Logs de Lembretes

```sql
SELECT 
  rl.*,
  a.appointment_date,
  a.appointment_time,
  c.name as client_name
FROM public.reminder_logs rl
JOIN public.appointments a ON a.id = rl.appointment_id
JOIN public.clients c ON c.id = a.client_id
ORDER BY rl.created_at DESC
LIMIT 50;
```

---

## 🔧 Troubleshooting

### Lembretes não estão sendo enviados

**Verifique:**

1. **O cron está rodando?**
```sql
SELECT * FROM cron.job WHERE jobname = 'send-whatsapp-reminders';
```

2. **Há agendamentos elegíveis?**
```sql
SELECT 
  a.*,
  c.whatsapp,
  (a.appointment_time::time - CURRENT_TIME::time) as time_until
FROM public.appointments a
JOIN public.clients c ON c.id = a.client_id
WHERE 
  a.status = 'scheduled'
  AND a.appointment_date = CURRENT_DATE
  AND a.reminder_sent = false
  AND c.whatsapp IS NOT NULL;
```

3. **A Edge Function está funcionando?**
```bash
supabase functions serve send-whatsapp-reminder
# Teste localmente
```

4. **As credenciais da API WhatsApp estão corretas?**
- Verifique as secrets no dashboard
- Teste a API diretamente

### Mensagens duplicadas

```sql
-- Marca todos os lembretes antigos como enviados
UPDATE public.appointments 
SET reminder_sent = true 
WHERE appointment_date < CURRENT_DATE;
```

### Desativar temporariamente

```sql
-- Desativa o job
SELECT cron.unschedule('send-whatsapp-reminders');

-- Reativa depois
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/30 * * * *',
  'SELECT public.send_appointment_reminders();'
);
```

---

## ⚙️ Customizações

### Mudar o intervalo do job

```sql
-- A cada 15 minutos
SELECT cron.unschedule('send-whatsapp-reminders');
SELECT cron.schedule(
  'send-whatsapp-reminders',
  '*/15 * * * *',
  'SELECT public.send_appointment_reminders();'
);
```

### Mudar o tempo de antecedência

Edite em `20251230_create_reminder_job.sql`:

```sql
-- Para 2 horas antes
AND (a.appointment_time::time - CURRENT_TIME::time) 
    BETWEEN INTERVAL '2 hours' AND INTERVAL '2 hours 30 minutes'
```

### Customizar a mensagem

Edite em `supabase/functions/send-whatsapp-reminder/index.ts`:

```typescript
function generateReminderMessage(data: AppointmentData): string {
  // Sua mensagem personalizada aqui
}
```

---

## 💰 Custos Estimados

### Evolution API (Self-hosted)
- **Servidor:** ~$5-10/mês (VPS básico)
- **Mensagens:** Gratuitas (sem limite)
- **Total:** ~$5-10/mês

### Twilio
- **Mensagens:** $0.005 cada
- **100 mensagens/mês:** $0.50
- **1000 mensagens/mês:** $5.00

### WhatsApp Business API
- **Setup:** Gratuito
- **Mensagens:** Gratuito (até 1000/mês de conversas iniciadas pela empresa)
- **Depois:** $0.005-0.015 por conversa

---

## ✅ Checklist Final

- [ ] Edge Function deployada
- [ ] Migration executada
- [ ] Variáveis de ambiente configuradas
- [ ] API WhatsApp testada
- [ ] Teste manual funcionando
- [ ] Cron job ativo
- [ ] Logs sendo gerados
- [ ] Cliente recebeu teste com sucesso

**Tudo pronto! Seu sistema está automatizado! 🎉**

---

## 📚 Recursos Adicionais

- [Documentação Evolution API](https://doc.evolution-api.com/)
- [Documentação Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)

---

**Desenvolvido por Jadson Santos © 2024**

