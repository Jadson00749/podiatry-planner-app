# 📱 PodoAgenda WhatsApp Bot

Bot de WhatsApp para envio automático de lembretes de consultas.

## 🚀 Deploy no Render

### 1. Criar Web Service no Render

1. Acesse: https://render.com/
2. Faça login ou crie uma conta
3. Clique em **"New +" → "Web Service"**
4. Conecte seu repositório GitHub: `Jadson00749/podiatry-planner-app`
5. Configure:
   - **Name**: `podoagenda-whatsapp-bot`
   - **Region**: `Oregon (US West)` (mais próximo)
   - **Branch**: `main`
   - **Root Directory**: `whatsapp-bot`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2. Conectar WhatsApp

Após o deploy:

1. Acesse os logs do serviço no Render
2. Procure pelo QR Code no terminal (ASCII art)
3. Escaneie com seu WhatsApp
4. Aguarde a mensagem "✅ WhatsApp conectado com sucesso!"

**OU** acesse: `https://seu-app.onrender.com/qr` para pegar o QR Code via API

### 3. Configurar Supabase Edge Function

Atualize a URL da Edge Function no Supabase para apontar para:

```
https://podoagenda-whatsapp-bot.onrender.com/send-reminder
```

## 📡 Endpoints Disponíveis

### GET /health
Verifica status do bot

```bash
curl https://seu-app.onrender.com/health
```

### GET /qr
Retorna QR Code para conectar WhatsApp (se desconectado)

```bash
curl https://seu-app.onrender.com/qr
```

### POST /send-message
Envia mensagem simples

```bash
curl -X POST https://seu-app.onrender.com/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5516997242367",
    "message": "Olá! Teste do PodoAgenda"
  }'
```

### POST /send-reminder
Envia lembrete de consulta (usado pelo Supabase)

```bash
curl -X POST https://seu-app.onrender.com/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "appointment": {
      "client_name": "João Silva",
      "client_whatsapp": "5516997242367",
      "appointment_date": "2025-01-15",
      "appointment_time": "14:00",
      "clinic_name": "Clínica PodoAgenda"
    }
  }'
```

## 🔧 Variáveis de Ambiente

Nenhuma variável obrigatória! O bot funciona out-of-the-box.

Opcionais:
- `PORT` - Porta do servidor (padrão: 3000, Render define automaticamente)

## 📝 Notas Importantes

- **Primeira vez**: Você precisa escanear o QR Code
- **Sessão salva**: Após conectar, a sessão fica salva e o bot reconecta automaticamente
- **Render Free**: Pode "dormir" após 15min de inatividade. Primeira requisição vai demorar ~30s

## 🆘 Troubleshooting

### Bot desconectou
1. Acesse `/qr` para pegar novo QR Code
2. Escaneie novamente
3. Aguarde reconexão

### Render "sleeping"
- Primeira mensagem do dia pode demorar ~30s
- Configure um cron job para manter acordado (opcional)

## 📞 Suporte

Desenvolvido por Jadson Santos


