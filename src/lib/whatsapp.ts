// Utilitários para integração com WhatsApp

export function formatPhoneForWhatsApp(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não começar com 55 (Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export function generateAppointmentReminderMessage(
  clientName: string,
  date: string,
  time: string,
  clinicName?: string
): string {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let message = `Olá ${clientName}! 👋\n\n`;
  message += `Este é um lembrete do seu agendamento:\n\n`;
  message += `📅 *Data:* ${formattedDate}\n`;
  message += `⏰ *Horário:* ${time}\n`;
  
  if (clinicName) {
    message += `📍 *Local:* ${clinicName}\n`;
  }
  
  message += `\nPor favor, confirme sua presença respondendo esta mensagem.\n\n`;
  message += `Caso precise remarcar, entre em contato conosco.\n\n`;
  message += `Obrigado! 🦶`;

  return message;
}

export function generateAppointmentConfirmationMessage(
  clientName: string,
  date: string,
  time: string,
  clinicName?: string
): string {
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let message = `Olá ${clientName}! 👋\n\n`;
  message += `Seu agendamento foi confirmado! ✅\n\n`;
  message += `📅 *Data:* ${formattedDate}\n`;
  message += `⏰ *Horário:* ${time}\n`;
  
  if (clinicName) {
    message += `📍 *Local:* ${clinicName}\n`;
  }
  
  message += `\nEstamos aguardando você!\n\n`;
  message += `Obrigado pela preferência! 🦶`;

  return message;
}
