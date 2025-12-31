/**
 * Verifica status do bot WhatsApp no Render
 */

const BOT_URL = 'https://podoagenda-whatsapp-bot.onrender.com';

async function checkStatus() {
    console.log('🔍 Verificando status do bot no Render...\n');
    
    try {
        // Check health
        const healthResponse = await fetch(`${BOT_URL}/health`);
        const healthData = await healthResponse.json();
        
        console.log('📊 Status do Bot:');
        console.log(`   ├─ Status: ${healthData.status}`);
        console.log(`   ├─ WhatsApp: ${healthData.whatsapp}`);
        console.log(`   ├─ Número: ${healthData.phoneNumber || 'N/A'}`);
        console.log(`   └─ Timestamp: ${healthData.timestamp}\n`);
        
        if (healthData.whatsapp !== 'connected') {
            console.log('⚠️  WhatsApp está DESCONECTADO!');
            console.log('📱 Precisamos reconectar...\n');
            
            // Try to get QR code
            console.log('🔄 Tentando obter QR Code...');
            const qrResponse = await fetch(`${BOT_URL}/qr`);
            const qrData = await qrResponse.json();
            
            if (qrData.qr) {
                console.log('✅ QR Code disponível!');
                console.log('\n📋 Abra este link no navegador para ver o QR Code:');
                console.log(`   ${BOT_URL}/qr\n`);
                console.log('Ou acesse os logs do Render para ver o QR Code no terminal.');
            } else {
                console.log('⏳', qrData.message);
                console.log('\n💡 Solução: Reinicie o serviço no Render para gerar um novo QR Code.');
                console.log('   https://dashboard.render.com/');
            }
        } else {
            console.log('✅ WhatsApp está conectado e funcionando!');
            console.log(`📱 Número conectado: ${healthData.phoneNumber}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error.message);
    }
}

checkStatus();


