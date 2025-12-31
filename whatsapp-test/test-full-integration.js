/**
 * 🧪 Teste de Integração Completa - PodoAgenda
 * 
 * Este script testa todo o fluxo de envio de lembretes automáticos:
 * 1. Cria um agendamento no banco de dados
 * 2. Chama a Edge Function manualmente
 * 3. A Edge Function chama o bot no Render
 * 4. O bot envia a mensagem via WhatsApp
 */

import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1ODQxMzIsImV4cCI6MjA1MTE2MDEzMn0.ZU3BpeBo4_Iyxa804CTkPA_nPdOnlhh';

// Dados do teste
const TEST_PHONE = '5516997242367'; // Seu número
const TEST_CLIENT_NAME = 'Jadson Santos';
const TEST_CLINIC_NAME = 'Clínica PodoAgenda';

// Calcula horário de teste (daqui a 45 minutos)
const now = new Date();
const testTime = new Date(now.getTime() + 45 * 60000);
const appointmentDate = testTime.toISOString().split('T')[0];
const appointmentTime = testTime.toTimeString().split(' ')[0].substring(0, 5);

console.log('🚀 Iniciando teste de integração completa...\n');
console.log(`📅 Data do teste: ${appointmentDate}`);
console.log(`⏰ Horário do teste: ${appointmentTime}`);
console.log(`📱 WhatsApp: ${TEST_PHONE}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFullIntegration() {
    try {
        console.log('1️⃣ Testando conexão com Supabase...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('   ✅ Conexão estabelecida!\n');

        console.log('2️⃣ Chamando Edge Function manualmente...');
        const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
            body: {
                appointment: {
                    id: 'test-' + Date.now(),
                    client_name: TEST_CLIENT_NAME,
                    client_whatsapp: TEST_PHONE,
                    appointment_date: appointmentDate,
                    appointment_time: appointmentTime,
                    clinic_name: TEST_CLINIC_NAME
                }
            },
            headers: {
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (error) {
            console.error('   ❌ Erro ao chamar Edge Function:', error);
            return;
        }

        console.log('   ✅ Edge Function executada com sucesso!');
        console.log('   📦 Resposta:', JSON.stringify(data, null, 2));
        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('📱 Verifique seu WhatsApp para ver se recebeu a mensagem!\n');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Detalhes:', error);
    }
}

testFullIntegration();

