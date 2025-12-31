/**
 * 🧪 Teste Direto da Edge Function - PodoAgenda
 */

// Configurações
const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjY2NDcsImV4cCI6MjA4MjcwMjY0N30.hG2vHaWjh_8moNrvMPhXzZ3ZqUxvsyBlR7DICZQBYlQ';

const TEST_PHONE = '5516997242367';
const TEST_CLIENT_NAME = 'Jadson Santos';
const TEST_CLINIC_NAME = 'Clínica PodoAgenda';

const now = new Date();
const testTime = new Date(now.getTime() + 45 * 60000);
const appointmentDate = testTime.toISOString().split('T')[0];
const appointmentTime = testTime.toTimeString().split(' ')[0].substring(0, 5);

console.log('🚀 Testando Edge Function via fetch direto...\n');
console.log(`📅 Data: ${appointmentDate}`);
console.log(`⏰ Horário: ${appointmentTime}`);
console.log(`📱 WhatsApp: ${TEST_PHONE}\n`);

async function testEdgeFunction() {
    try {
        const url = `${SUPABASE_URL}/functions/v1/send-whatsapp-reminder`;
        
        const payload = {
            appointment: {
                id: 'test-' + Date.now(),
                client_name: TEST_CLIENT_NAME,
                client_whatsapp: TEST_PHONE,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                clinic_name: TEST_CLINIC_NAME
            }
        };

        console.log('📤 Enviando requisição para:', url);
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        console.log('');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        console.log(`📥 Status da resposta: ${response.status} ${response.statusText}`);

        const responseText = await response.text();
        console.log('📄 Resposta (texto):', responseText);

        if (!response.ok) {
            console.error('\n❌ Erro na requisição!');
            return;
        }

        try {
            const data = JSON.parse(responseText);
            console.log('\n✅ Resposta (JSON):', JSON.stringify(data, null, 2));
        } catch (e) {
            // Resposta não é JSON, mas está OK
        }

        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('📱 Verifique seu WhatsApp para ver se recebeu a mensagem!\n');

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Detalhes completos:', error);
    }
}

testEdgeFunction();

