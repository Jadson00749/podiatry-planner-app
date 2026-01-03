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

function generateConfirmationMessage(data: AppointmentData): string {
  const formattedDate = new Date(data.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  let message = `Olá ${data.client_name}! 👋\n\n`
  message += `✅ *AGENDAMENTO CONFIRMADO*\n\n`
  message += `Seu agendamento foi realizado com sucesso!\n\n`
  message += `📅 *Data:* ${formattedDate}\n`
  message += `⏰ *Horário:* ${data.appointment_time}\n`
  
  if (data.clinic_name) {
    message += `📍 *Local:* ${data.clinic_name}\n`
  }
  
  message += `\n📱 Você receberá um lembrete 1 hora antes da consulta.\n\n`
  message += `Se precisar remarcar ou cancelar, entre em contato conosco.\n\n`
  message += `Obrigado por escolher nossos serviços! 🦶✨`

  return message
}

/**
 * Envia mensagem WhatsApp via PastoriniAPI
 * Estrutura conforme documentação: https://github.com/JordanMenezes/PastoriniAPI
 */
async function sendWhatsAppViaPapi(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const API_URL = Deno.env.get('EVOLUTION_API_URL')!
    const API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
    const INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME')!

    const formattedPhone = formatPhoneForWhatsApp(phone)

    const response = await fetch(
      `${API_URL}/message/sendText/${INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_KEY,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      return { success: false, error: err }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    }
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

    console.log(`📱 Enviando confirmação de agendamento para ${appointment.client_name}...`)

    const message = generateConfirmationMessage(appointment)
    console.log('📝 Mensagem completa gerada:', JSON.stringify(message)) // Adicione esta linha
    console.log('📝 Dados recebidos:', JSON.stringify(appointment)) // E esta também
    const result = await sendWhatsAppViaPapi(appointment.client_whatsapp, message)

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Confirmação enviada com sucesso via P-API WhatsApp',
          appointment_id: appointment.id,
          client: appointment.client_name,
          provider: 'papi'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Não falha completamente se não conseguir enviar a confirmação
      // O agendamento já foi criado, apenas loga o erro
      console.warn(`⚠️ Não foi possível enviar confirmação: ${result.error}`)
      return new Response(
        JSON.stringify({ 
          success: false,
          warning: `Agendamento criado, mas confirmação não enviada: ${result.error}`,
          appointment_id: appointment.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

