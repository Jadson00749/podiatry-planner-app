-- Migration: Trigger para enviar confirmação de agendamento via WhatsApp
-- Envia mensagem automática quando um novo agendamento é criado

-- Habilita a extensão http (necessária para chamar Edge Functions)
CREATE EXTENSION IF NOT EXISTS http;

-- Função que envia confirmação de agendamento
CREATE OR REPLACE FUNCTION public.send_appointment_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  api_key TEXT;
  payload JSONB;
  response RECORD;
  client_record RECORD;
BEGIN
  -- Pega as configurações do Supabase
  SELECT current_setting('app.settings.confirmation_function_url', true) INTO edge_function_url;
  SELECT current_setting('app.settings.supabase_anon_key', true) INTO api_key;

  -- Se não configurado, usa o padrão
  IF edge_function_url IS NULL THEN
    edge_function_url := current_setting('app.settings.edge_function_url', true);
    -- Remove /send-whatsapp-reminder e adiciona /send-appointment-confirmation
    IF edge_function_url IS NOT NULL THEN
      edge_function_url := REPLACE(edge_function_url, '/send-whatsapp-reminder', '/send-appointment-confirmation');
    END IF;
  END IF;

  -- Se ainda não tem URL configurada, retorna sem erro (não bloqueia criação do agendamento)
  IF edge_function_url IS NULL OR api_key IS NULL THEN
    RAISE NOTICE 'Edge Function URL ou API Key não configurados. Pulando envio de confirmação.';
    RETURN NEW;
  END IF;

  -- Busca dados do cliente e perfil
  SELECT 
    c.name as client_name,
    c.whatsapp as client_whatsapp,
    p.clinic_name
  INTO client_record
  FROM public.clients c
  INNER JOIN public.profiles p ON p.id = NEW.profile_id
  WHERE c.id = NEW.client_id;

  -- Se cliente não tem WhatsApp, não envia
  IF client_record.client_whatsapp IS NULL OR client_record.client_whatsapp = '' THEN
    RAISE NOTICE 'Cliente não tem WhatsApp cadastrado. Pulando envio de confirmação.';
    RETURN NEW;
  END IF;

  -- Monta o payload JSON
  payload := json_build_object(
    'appointment', json_build_object(
      'id', NEW.id,
      'client_name', client_record.client_name,
      'client_whatsapp', client_record.client_whatsapp,
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time,
      'clinic_name', client_record.clinic_name
    )
  );

  -- Chama a Edge Function de forma assíncrona (não bloqueia)
  -- Usa PERFORM para não esperar resposta
  BEGIN
    PERFORM http((
      'POST',
      edge_function_url,
      ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer ' || api_key)
      ],
      'application/json',
      payload::text
    )::http_request);
    
    RAISE NOTICE 'Confirmação de agendamento enviada para: % (ID: %)', 
      client_record.client_name, NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log de erro mas não bloqueia criação do agendamento
    RAISE WARNING 'Erro ao enviar confirmação para agendamento ID %: %', 
      NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Cria o trigger que executa após inserção de agendamento
DROP TRIGGER IF EXISTS trigger_send_appointment_confirmation ON public.appointments;

CREATE TRIGGER trigger_send_appointment_confirmation
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'scheduled') -- Só envia se status for 'scheduled'
  EXECUTE FUNCTION public.send_appointment_confirmation();

-- Comentário
COMMENT ON FUNCTION public.send_appointment_confirmation() IS 
'Função que envia confirmação automática via WhatsApp quando um novo agendamento é criado';

-- Grant para execução
GRANT EXECUTE ON FUNCTION public.send_appointment_confirmation() TO postgres;



