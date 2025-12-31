/**
 * 🧪 Teste de Integração Twilio - PodoAgenda
 * 
 * Testa o envio de lembrete via Twilio WhatsApp através da Edge Function
 */

// Configurações do Supabase
const SUPABASE_URL = 'https://vztevzgvpymiviiboopp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGV2emd2cHltaXZpaWJvb3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjY2NDcsImV4cCI6MjA4MjcwMjY0N30.hG2vHaWjh_8moNrvMPhXzZ3ZqUxvsyBlR7DICZQBYlQ';

// Dados do teste
const TEST_PHONE = '5516997242367'; // Seu número
const TEST_CLIENT_NAME = 'Jadson Santos';
const TEST_CLINIC_NAME = 'Clínica PodoAgenda';

// Calcula horário de teste (daqui a 1 hora)
const now = new Date();
const testTime = new Date(now.getTime() + 60 * 60000);
const appointmentDate = testTime.toISOString().split('T')[0];
const appointmentTime = testTime.toTimeString().split(' ')[0].substring(0, 5);

console.log('🚀 TESTE DE INTEGRAÇÃO TWILIO + SUPABASE\n');
console.log('=' .repeat(60));
console.log(`📅 Data do agendamento: ${appointmentDate}`);
console.log(`⏰ Horário: ${appointmentTime}`);
console.log(`📱 WhatsApp: ${TEST_PHONE}`);
console.log(`👤 Cliente: ${TEST_CLIENT_NAME}`);
console.log('=' .repeat(60));
console.log('');

async function testTwilioIntegration() {
    try {
        const url = `${SUPABASE_URL}/functions/v1/send-whatsapp-reminder`;
        
        const payload = {
            appointment: {
                id: 'test-twilio-' + Date.now(),
                client_name: TEST_CLIENT_NAME,
                client_whatsapp: TEST_PHONE,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                clinic_name: TEST_CLINIC_NAME
            }
        };

        console.log('📤 Enviando requisição para Edge Function...');
        console.log(`   URL: ${url}`);
        console.log('');

        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - startTime;

        console.log(`⏱️  Tempo de resposta: ${duration}ms`);
        console.log(`📥 Status HTTP: ${response.status} ${response.statusText}`);
        console.log('');

        const responseText = await response.text();
        
        if (!response.ok) {
            console.error('❌ ERRO NA REQUISIÇÃO!\n');
            console.error('Resposta do servidor:');
            console.error(responseText);
            console.error('');
            
            if (response.status === 401) {
                console.error('💡 Possível problema: Token de autenticação inválido');
            } else if (response.status === 500) {
                console.error('💡 Possível problema: Erro na Edge Function ou credenciais Twilio incorretas');
            }
            
            return;
        }

        try {
            const data = JSON.parse(responseText);
            console.log('✅ SUCESSO!\n');
            console.log('📦 Resposta da Edge Function:');
            console.log(JSON.stringify(data, null, 2));
            console.log('');
            console.log('=' .repeat(60));
            console.log('🎉 INTEGRAÇÃO FUNCIONANDO PERFEITAMENTE!');
            console.log('📱 Verifique seu WhatsApp para ver a mensagem!');
            console.log('=' .repeat(60));
        } catch (e) {
            console.log('✅ Requisição bem-sucedida!');
            console.log('Resposta:', responseText);
        }

    } catch (error) {
        console.error('❌ ERRO AO EXECUTAR TESTE:\n');
        console.error(error.message);
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
    }
}

console.log('🔄 Iniciando teste...\n');
testTwilioIntegration();


