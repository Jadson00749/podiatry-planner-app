/**
 * Verifica TODOS os agendamentos (usando service role para bypass RLS)
 */

// Usando service role key para ver tudo
const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNjY0NywiZXhwIjoyMDgyNzAyNjQ3fQ.sJ07wd4Q79dojQdx9PTUyqMu5sDQ_VjgW4nkei_AGTg';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkAll() {
    console.log('🔍 Verificando TODOS os agendamentos...\n');
    
    try {
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
                ),
                profiles (
                    full_name
                )
            `)
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('❌ Erro:', error);
            return;
        }
        
        console.log(`📋 Total encontrado: ${appointments?.length || 0}\n`);
        
        if (!appointments || appointments.length === 0) {
            console.log('⚠️  NENHUM agendamento no banco!');
            return;
        }
        
        console.log('📅 ÚLTIMOS AGENDAMENTOS:\n');
        appointments.forEach((a, i) => {
            const isToday = a.appointment_date === new Date().toISOString().split('T')[0];
            const isTarget = a.appointment_time?.startsWith('22:30');
            
            console.log(`${i + 1}. ${a.appointment_date} ${a.appointment_time}`);
            console.log(`   Cliente: ${a.clients?.name || 'N/A'}`);
            console.log(`   WhatsApp: ${a.clients?.whatsapp || 'N/A'}`);
            console.log(`   Status: ${a.status} | Lembrete: ${a.reminder_sent ? '✅' : '❌'}`);
            if (isToday) console.log(`   🟢 HOJE!`);
            if (isTarget) console.log(`   🎯 AGENDAMENTO DE 22:30!`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

checkAll();

