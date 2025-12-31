/**
 * Verifica agendamento considerando timezone do Brasil (UTC-3)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNjY0NywiZXhwIjoyMDgyNzAyNjQ3fQ.sJ07wd4Q79dojQdx9PTUyqMu5sDQ_VjgW4nkei_AGTg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAppointmentBR() {
    console.log('🔍 Verificando agendamento (Timezone Brasil UTC-3)...\n');
    
    // Data de hoje no Brasil (UTC-3)
    const nowBR = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const todayBR = nowBR.toISOString().split('T')[0];
    const timeBR = nowBR.toTimeString().split(' ')[0];
    
    console.log(`📅 Data de hoje (Brasil): ${todayBR}`);
    console.log(`⏰ Horário atual (Brasil): ${timeBR}\n`);
    
    try {
        // Busca agendamentos de hoje (30/12)
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
            .eq('appointment_date', '2025-12-30') // Data fixa de hoje no Brasil
            .eq('status', 'scheduled')
            .order('appointment_time', { ascending: true });
        
        if (error) {
            console.error('❌ Erro:', error);
            return;
        }
        
        console.log(`📋 Agendamentos encontrados para 30/12: ${appointments?.length || 0}\n`);
        
        if (!appointments || appointments.length === 0) {
            console.log('⚠️  Nenhum agendamento encontrado!');
            return;
        }
        
        appointments.forEach(a => {
            console.log(`📅 ${a.appointment_date} ${a.appointment_time}`);
            console.log(`   Cliente: ${a.clients?.name || 'N/A'}`);
            console.log(`   WhatsApp: ${a.clients?.whatsapp || 'N/A'}`);
            console.log(`   Status: ${a.status}`);
            console.log(`   Lembrete enviado: ${a.reminder_sent ? '✅ SIM' : '❌ NÃO'}`);
            
            // Verifica se está no range do cron
            if (a.appointment_time?.startsWith('22:30')) {
                const appointmentTime = new Date(`2025-12-30T${a.appointment_time}`);
                const now = new Date();
                const diffMs = appointmentTime.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                
                console.log(`\n   ⏱️  ANÁLISE DO CRON:`);
                console.log(`   Diferença: ${diffHours.toFixed(2)} horas`);
                console.log(`   Range necessário: 1h a 1h30min`);
                
                if (diffHours >= 1 && diffHours <= 1.5) {
                    console.log(`   ✅ ESTÁ NO RANGE! O cron DEVE encontrar.\n`);
                } else if (diffHours < 1) {
                    console.log(`   ⚠️  MUITO PRÓXIMO! Aguarde mais um pouco.\n`);
                } else {
                    console.log(`   ⏳ AINDA NÃO ESTÁ NO RANGE. Aguarde.\n`);
                }
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

checkAppointmentBR();


