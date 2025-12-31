import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

console.log('🚀 Iniciando PodoAgenda WhatsApp...\n');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'podoagenda'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('📱 ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n✅ QR Code gerado! Aponte a câmera do WhatsApp aqui!\n');
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso!\n');
    console.log('📱 Número conectado:', client.info.wid.user);
    console.log('\n🎉 Pronto para enviar mensagens!\n');
    console.log('Mantenha este terminal aberto para o WhatsApp ficar conectado.\n');
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp desconectado:', reason);
});

console.log('⏳ Aguardando QR Code...\n');
client.initialize();


