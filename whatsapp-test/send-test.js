import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

console.log('🚀 Enviando mensagem de teste...\n');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'podoagenda'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', async () => {
    console.log('✅ WhatsApp conectado!\n');
    
    // Seu número (com código do país - 55 para Brasil)
    const numero = '5516997242367@c.us';
    
    // Mensagem de teste do PodoAgenda
    const mensagem = `🦶 *PodoAgenda - Teste de Lembrete*

Olá! 👋

Este é um teste do sistema de lembretes automáticos do PodoAgenda.

📅 *Data:* Amanhã
⏰ *Horário:* 15:00
📍 *Local:* Clínica Exemplo

Por favor, confirme sua presença respondendo esta mensagem.

Caso precise remarcar, entre em contato conosco.

Obrigado! 🦶✨`;

    try {
        console.log('📤 Enviando mensagem...\n');
        await client.sendMessage(numero, mensagem);
        console.log('✅ Mensagem enviada com sucesso!\n');
        console.log('📱 Verifique seu WhatsApp!\n');
    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
    }
    
    // Aguarda 3 segundos e fecha
    setTimeout(() => {
        console.log('👋 Encerrando...\n');
        process.exit(0);
    }, 3000);
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado!');
});

client.initialize();


