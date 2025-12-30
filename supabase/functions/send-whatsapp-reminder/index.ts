// Edge Function para enviar lembretes automáticos via WhatsApp
// Deploy: supabase functions deploy send-whatsapp-reminder

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AppointmentData {
  id: string
  client_name: string
  client_whatsapp: string
  appointment_date: string
  appointment_time: string
  clinic_name?: string
}

/**
 * Formata número de telefone para padrão brasileiro (mesmo padrão do frontend)
 */
function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned.startsWith('55')) {
    return `55${cleaned}`
  }
  return cleaned
}

/**
 * Gera mensagem de lembrete (baseado na função do frontend)
 */
function generateReminderMessage(data: AppointmentData): string {
  const formattedDate = new Date(data.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  let message = `Olá ${data.client_name}! 👋\n\n`
  message += `🔔 *LEMBRETE DE CONSULTA*\n\n`
  message += `Sua consulta está próxima!\n\n`
  message += `📅 *Data:* ${formattedDate}\n`
  message += `⏰ *Horário:* ${data.appointment_time}\n`
  
  if (data.clinic_name) {
    message += `📍 *Local:* ${data.clinic_name}\n`
  }
  
  message += `\n⚠️ Por favor, chegue com 10 minutos de antecedência.\n\n`
  message += `Se precisar remarcar, entre em contato conosco o quanto antes.\n\n`
  message += `Até breve! 🦶`

  return message
}

/**
 * Envia mensagem via API do WhatsApp
 * Você pode usar: Evolution API (gratuito), Twilio, WhatsApp Business API, etc.
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    // OPÇÃO 1: Evolution API (Open Source - Recomendado para começar)
    // https://github.com/EvolutionAPI/evolution-api
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')
    const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')

    if (EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE) {
      const formattedPhone = formatPhoneForWhatsApp(phone)

      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
          delay: 1200,
        }),
      })

      if (response.ok) {
        console.log(`✅ WhatsApp enviado para ${formattedPhone}`)
        return true
      }
    }

    // OPÇÃO 2: Twilio (Pago, mas muito confiável)
    // Descomente se quiser usar Twilio
    /*
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
      const formattedPhone = formatPhoneForWhatsApp(phone)
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: TWILIO_WHATSAPP_FROM,
            To: `whatsapp:+${formattedPhone}`,
            Body: message,
          }),
        }
      )

      if (response.ok) {
        console.log(`✅ WhatsApp enviado via Twilio para ${formattedPhone}`)
        return true
      }
    }
    */

    console.error('❌ Nenhuma API de WhatsApp configurada')
    return false

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cria cliente Supabase com service role (acesso total)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { appointment } = await req.json() as { appointment: AppointmentData }

    // Validação
    if (!appointment || !appointment.client_whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Dados de agendamento inválidos ou WhatsApp ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📱 Enviando lembrete para ${appointment.client_name}...`)

    // Gera e envia mensagem
    const message = generateReminderMessage(appointment)
    const sent = await sendWhatsAppMessage(appointment.client_whatsapp, message)

    if (sent) {
      // Marca como enviado no banco
      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointment.id)

      if (updateError) {
        console.error('❌ Erro ao atualizar reminder_sent:', updateError)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lembrete enviado com sucesso',
          appointment_id: appointment.id,
          client: appointment.client_name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Falha ao enviar mensagem WhatsApp')
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
