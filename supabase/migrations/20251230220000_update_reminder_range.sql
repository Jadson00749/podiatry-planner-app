-- Atualiza a função de lembretes para buscar entre 30min e 1h30min antes do agendamento
CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  appointment_record RECORD;
  edge_function_url TEXT;
  api_key TEXT;
  payload JSONB;
  response RECORD;
BEGIN
  -- Pega as configurações do Supabase
  SELECT current_setting('app.settings.edge_function_url', true) INTO edge_function_url;
  SELECT current_setting('app.settings.supabase_anon_key', true) INTO api_key;

  IF edge_function_url IS NULL OR api_key IS NULL THEN
    RAISE WARNING 'Edge Function URL ou API Key não configurados. Pulando lembretes.';
    RETURN;
  END IF;

  -- Busca agendamentos que precisam de lembrete
  -- Critérios:
  -- 1. Status = 'scheduled' (agendado)
  -- 2. Data = hoje
  -- 3. Horário entre 30min e 1h30min a partir de agora (AJUSTADO!)
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
      -- Verifica se está entre 30min e 1h30min antes do horário (AJUSTADO!)
      AND (a.appointment_time::time - CURRENT_TIME::time) BETWEEN INTERVAL '30 minutes' AND INTERVAL '1 hour 30 minutes'
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

      -- Marca como enviado se sucesso
      IF response.status = 200 THEN
        UPDATE public.appointments
        SET reminder_sent = true
        WHERE id = appointment_record.id;
        
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

-- Atualiza o comentário
COMMENT ON FUNCTION public.send_appointment_reminders() IS 
'Função que busca agendamentos do dia e envia lembretes via WhatsApp entre 30min e 1h30min antes';


