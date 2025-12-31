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

function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned.startsWith('55')) {
    return `55${cleaned}`
  }
  return cleaned
}

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

async function sendWhatsAppViaTwilio(phone: string, message: string): Promise<boolean> {
  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886'

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error('❌ Credenciais Twilio não configuradas')
      return false
    }

    const formattedPhone = `whatsapp:+${formatPhoneForWhatsApp(phone)}`
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

    // Basic Auth para Twilio
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

    const body = new URLSearchParams({
      From: TWILIO_WHATSAPP_NUMBER,
      To: formattedPhone,
      Body: message,
    })

    console.log(`📱 Enviando WhatsApp via Twilio para ${formattedPhone}...`)

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Mensagem enviada com sucesso! SID: ${data.sid}`)
      return true
    } else {
      const errorData = await response.text()
      console.error(`❌ Erro Twilio (${response.status}):`, errorData)
      return false
    }

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp via Twilio:', error)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    if (!appointment || !appointment.client_whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Dados de agendamento inválidos ou WhatsApp ausente' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📱 Enviando lembrete para ${appointment.client_name}...`)

    const message = generateReminderMessage(appointment)
    const sent = await sendWhatsAppViaTwilio(appointment.client_whatsapp, message)

    if (sent) {
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
          message: 'Lembrete enviado com sucesso via Twilio WhatsApp',
          appointment_id: appointment.id,
          client: appointment.client_name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Falha ao enviar mensagem WhatsApp via Twilio')
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
