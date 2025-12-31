import fetch from 'node-fetch';

console.log('📤 Testando envio de mensagem via bot no Render...\n');

const botUrl = 'https://podoagenda-whatsapp-bot.onrender.com/send-reminder';

const testAppointment = {
    appointment: {
        client_name: 'Jadson Santos',
        client_whatsapp: '5516997242367',
        appointment_date: '2025-12-31',
        appointment_time: '15:00',
        clinic_name: 'Clínica PodoAgenda Teste'
    }
};

console.log('🔄 Enviando requisição para:', botUrl);
console.log('📋 Dados:', JSON.stringify(testAppointment, null, 2), '\n');

fetch(botUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testAppointment)
})
.then(res => res.json())
.then(data => {
    console.log('✅ RESPOSTA DO BOT:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n📱 Verifique seu WhatsApp!');
})
.catch(error => {
    console.error('❌ ERRO:', error.message);
});


