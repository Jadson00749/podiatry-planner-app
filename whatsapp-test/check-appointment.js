/**
 * Verifica se o agendamento está no banco e se será encontrado pelo cron
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjY2NDcsImV4cCI6MjA4MjcwMjY0N30.hG2vHaWjh_8moNrvMPhXzZ3ZqUxvsyBlR7DICZQBYlQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAppointment() {
    console.log('🔍 Verificando agendamento para 22:30...\n');
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    console.log(`📅 Data de hoje: ${today}`);
    console.log(`⏰ Horário atual: ${now.toTimeString().split(' ')[0]}\n`);
    
    try {
        // Busca agendamentos de hoje
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                reminder_sent,
                clients (
                    name,
                    whatsapp
                )
            `)
            .eq('appointment_date', today)
            .eq('status', 'scheduled')
            .order('appointment_time', { ascending: true });
        
        if (error) {
            console.error('❌ Erro ao buscar agendamentos:', error);
            return;
        }
        
        console.log(`📋 Total de agendamentos encontrados: ${appointments?.length || 0}\n`);
        
        if (!appointments || appointments.length === 0) {
            console.log('⚠️  Nenhum agendamento encontrado para hoje!');
            return;
        }
        
        // Filtra o agendamento de 22:30
        const targetAppointment = appointments.find(a => 
            a.appointment_time?.startsWith('22:30') || 
            a.appointment_time === '22:30:00'
        );
        
        if (targetAppointment) {
            console.log('✅ AGENDAMENTO ENCONTRADO:\n');
            console.log(`   ID: ${targetAppointment.id}`);
            console.log(`   Data: ${targetAppointment.appointment_date}`);
            console.log(`   Horário: ${targetAppointment.appointment_time}`);
            console.log(`   Status: ${targetAppointment.status}`);
            console.log(`   Lembrete enviado: ${targetAppointment.reminder_sent ? '✅ SIM' : '❌ NÃO'}`);
            console.log(`   Cliente: ${targetAppointment.clients?.name || 'N/A'}`);
            console.log(`   WhatsApp: ${targetAppointment.clients?.whatsapp || 'N/A'}\n`);
            
            // Calcula se está no range do cron
            const appointmentTime = new Date(`${targetAppointment.appointment_date}T${targetAppointment.appointment_time}`);
            const diffMs = appointmentTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            
            console.log('⏱️  ANÁLISE DO CRON:\n');
            console.log(`   Diferença: ${diffHours.toFixed(2)} horas`);
            console.log(`   Range do cron: 1h a 1h30min`);
            
            if (diffHours >= 1 && diffHours <= 1.5) {
                console.log(`   ✅ ESTÁ NO RANGE! O cron DEVE encontrar este agendamento.\n`);
            } else if (diffHours < 1) {
                console.log(`   ⚠️  MUITO PRÓXIMO! O cron pode não pegar ainda.\n`);
            } else {
                console.log(`   ⏳ AINDA NÃO ESTÁ NO RANGE. Aguarde mais um pouco.\n`);
            }
            
        } else {
            console.log('❌ Agendamento para 22:30 NÃO encontrado!\n');
            console.log('📋 Agendamentos de hoje:');
            appointments.forEach(a => {
                console.log(`   - ${a.appointment_time} (${a.clients?.name || 'N/A'}) - Lembrete: ${a.reminder_sent ? '✅' : '❌'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

checkAppointment();


