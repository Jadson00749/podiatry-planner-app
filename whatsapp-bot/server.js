import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando PodoAgenda WhatsApp Bot...\n');

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'podoagenda'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

let isReady = false;
let qrCodeData = null;

// Eventos WhatsApp
client.on('qr', (qr) => {
    console.log('📱 QR CODE GERADO!\n');
    qrcode.generate(qr, { small: true });
    qrCodeData = qr;
    console.log('\n✅ QR Code disponível em: http://localhost:' + PORT + '/qr\n');
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso!\n');
    console.log('📱 Número conectado:', client.info.wid.user);
    console.log('🎉 Bot pronto para enviar mensagens!\n');
    isReady = true;
    qrCodeData = null;
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp desconectado:', reason);
    isReady = false;
});

// Inicializa cliente
console.log('⏳ Inicializando cliente WhatsApp...\n');
client.initialize();

// ====================
// API HTTP ENDPOINTS
// ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        whatsapp: isReady ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// QR Code endpoint
app.get('/qr', (req, res) => {
    if (qrCodeData) {
        res.json({
            success: true,
            qr: qrCodeData,
            message: 'Escaneie este QR Code com seu WhatsApp'
        });
    } else if (isReady) {
        res.json({
            success: true,
            message: 'WhatsApp já está conectado!'
        });
    } else {
        res.json({
            success: false,
            message: 'Aguardando geração do QR Code...'
        });
    }
});

// Enviar mensagem (chamado pelo Supabase)
app.post('/send-message', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp não está conectado'
            });
        }

        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros "phone" e "message" são obrigatórios'
            });
        }

        // Formata número (adiciona @c.us)
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;

        console.log(`📤 Enviando mensagem para: ${phone}`);

        await client.sendMessage(formattedPhone, message);

        console.log(`✅ Mensagem enviada com sucesso para: ${phone}`);

        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            to: phone,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para lembretes (compatível com Supabase Edge Function)
app.post('/send-reminder', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp não está conectado'
            });
        }

        const { appointment } = req.body;

        if (!appointment) {
            return res.status(400).json({
                success: false,
                error: 'Dados do agendamento são obrigatórios'
            });
        }

        const {
            client_name,
            client_whatsapp,
            appointment_date,
            appointment_time,
            clinic_name
        } = appointment;

        // Formata a mensagem
        const formattedDate = new Date(appointment_date + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

        const message = `🦶 *PodoAgenda - Lembrete de Consulta*

Olá ${client_name}! 👋

Este é um lembrete do seu agendamento:

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${appointment_time}
${clinic_name ? `📍 *Local:* ${clinic_name}\n` : ''}
Por favor, confirme sua presença respondendo esta mensagem.

Caso precise remarcar, entre em contato conosco.

Obrigado! 🦶✨`;

        // Formata número
        const formattedPhone = client_whatsapp.includes('@c.us') 
            ? client_whatsapp 
            : `${client_whatsapp.replace(/\D/g, '')}@c.us`;

        console.log(`📤 Enviando lembrete para: ${client_name} (${client_whatsapp})`);

        await client.sendMessage(formattedPhone, message);

        console.log(`✅ Lembrete enviado com sucesso!`);

        res.json({
            success: true,
            message: 'Lembrete enviado com sucesso',
            to: client_name,
            phone: client_whatsapp,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao enviar lembrete:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Inicia servidor
app.listen(PORT, () => {
    console.log(`\n🌐 Servidor HTTP rodando na porta ${PORT}`);
    console.log(`📡 Endpoints disponíveis:`);
    console.log(`   - GET  /health       - Status do bot`);
    console.log(`   - GET  /qr           - QR Code (se desconectado)`);
    console.log(`   - POST /send-message - Enviar mensagem`);
    console.log(`   - POST /send-reminder- Enviar lembrete\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n👋 Encerrando bot...');
    await client.destroy();
    process.exit(0);
});

