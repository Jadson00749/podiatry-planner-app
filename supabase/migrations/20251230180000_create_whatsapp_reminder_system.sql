-- Migration: Sistema de lembretes automáticos via WhatsApp
-- Executa a cada 30 minutos e envia lembretes 1 hora antes da consulta

-- Habilita a extensão pg_cron (necessária para agendamento de jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilita a extensão http (necessária para chamar Edge Functions)
CREATE EXTENSION IF NOT EXISTS http;

-- Função que busca e processa agendamentos para enviar lembretes
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  appointment_record RECORD;
  edge_function_url TEXT;
  api_key TEXT;
  response http_response;
  payload JSON;
BEGIN
  -- URL da Edge Function (ajuste conforme seu projeto)
  edge_function_url := current_setting('app.settings.edge_function_url', true);
  api_key := current_setting('app.settings.supabase_anon_key', true);

  -- Se não configurado, use valores padrão (IMPORTANTE: configurar depois!)
  IF edge_function_url IS NULL THEN
    edge_function_url := 'https://seu-projeto.supabase.co/functions/v1/send-whatsapp-reminder';
  END IF;

  -- Busca agendamentos que precisam de lembrete
  -- Critérios:
  -- 1. Status = 'scheduled' (agendado)
  -- 2. Data = hoje
  -- 3. Horário entre 1h e 1h30min a partir de agora
  -- 4. reminder_sent = false (ainda não enviado)
  -- 5. Cliente tem WhatsApp cadastrado
  FOR appointment_record IN
    SELECT 
      a.id,
      c.name as client_name,
      c.whatsapp as client_whatsapp,
      a.appointment_date,
      a.appointment_time,
      p.clinic_name
    FROM public.appointments a
    INNER JOIN public.clients c ON c.id = a.client_id
    INNER JOIN public.profiles p ON p.id = a.profile_id
    WHERE 
      a.status = 'scheduled'
      AND a.appointment_date = CURRENT_DATE
      AND a.reminder_sent = false
      AND c.whatsapp IS NOT NULL
      AND c.whatsapp != ''
      -- Verifica se está entre 1h e 1h30min antes do horário
      AND (a.appointment_time::time - CURRENT_TIME::time) BETWEEN INTERVAL '1 hour' AND INTERVAL '1 hour 30 minutes'
  LOOP
    BEGIN
      -- Monta o payload JSON
      payload := json_build_object(
        'appointment', json_build_object(
          'id', appointment_record.id,
          'client_name', appointment_record.client_name,
          'client_whatsapp', appointment_record.client_whatsapp,
          'appointment_date', appointment_record.appointment_date,
          'appointment_time', appointment_record.appointment_time,
          'clinic_name', appointment_record.clinic_name
        )
      );

      -- Chama a Edge Function
      SELECT * INTO response
      FROM http((
        'POST',
        edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || api_key)
        ],
        'application/json',
        payload::text
      )::http_request);

      -- Log do resultado
      IF response.status = 200 THEN
        RAISE NOTICE 'Lembrete enviado com sucesso para: % (ID: %)', 
          appointment_record.client_name, appointment_record.id;
      ELSE
        RAISE WARNING 'Falha ao enviar lembrete para: % (Status: %)', 
          appointment_record.client_name, response.status;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log de erro mas continua processando outros
      RAISE WARNING 'Erro ao processar agendamento ID %: %', 
        appointment_record.id, SQLERRM;
    END;
  END LOOP;

END;
$$;

-- Cria o job do cron para executar a cada 30 minutos
-- Remove job anterior se existir (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('send-whatsapp-reminders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Cria novo job
SELECT cron.schedule(
  'send-whatsapp-reminders',                    -- Nome do job
  '*/30 * * * *',                               -- A cada 30 minutos
  'SELECT public.send_appointment_reminders();' -- Função a executar
);

-- Configurações do job (opcional - ajuste conforme necessário)
COMMENT ON FUNCTION public.send_appointment_reminders() IS 
'Função que busca agendamentos do dia e envia lembretes via WhatsApp 1 hora antes';

-- Grant para execução
GRANT EXECUTE ON FUNCTION public.send_appointment_reminders() TO postgres;

-- Tabela de logs (opcional - para auditoria)
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL, -- 'success' ou 'error'
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilita RLS na tabela de logs
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Policy para logs (remove antiga se existir)
DROP POLICY IF EXISTS "Users can view their own reminder logs" ON public.reminder_logs;
CREATE POLICY "Users can view their own reminder logs" ON public.reminder_logs
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM public.appointments 
      WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_check 
ON public.appointments(appointment_date, appointment_time, status, reminder_sent)
WHERE status = 'scheduled' AND reminder_sent = false;

-- Comentário final
COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler para PostgreSQL';

