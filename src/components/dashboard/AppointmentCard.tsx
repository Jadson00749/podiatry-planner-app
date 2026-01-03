import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, DollarSign, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/hooks/useAppointments';
import { generateWhatsAppLink, generateAppointmentReminderMessage } from '@/lib/whatsapp';
import { useProfile } from '@/hooks/useProfile';

interface AppointmentCardProps {
  appointment: Appointment;
  onStatusChange?: (id: string, status: Appointment['status']) => void;
  onPaymentChange?: (id: string, status: Appointment['payment_status']) => void;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  onStatusChange,
  onPaymentChange,
  compact = false,
}: AppointmentCardProps) {
  const { data: profile } = useProfile();

  const statusConfig = {
    scheduled: { label: 'Agendado', variant: 'default' as const, bg: 'bg-primary/10 text-primary' },
    completed: { label: 'Concluído', variant: 'default' as const, bg: 'bg-success/10 text-success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' as const, bg: 'bg-destructive/10 text-destructive' },
    no_show: { label: 'Não compareceu', variant: 'secondary' as const, bg: 'bg-warning/10 text-warning' },
  };

  const paymentConfig = {
    pending: { label: 'Pendente', bg: 'bg-warning/10 text-warning' },
    paid: { label: 'Pago', bg: 'bg-success/10 text-success' },
    partial: { label: 'Parcial', bg: 'bg-primary/10 text-primary' },
  };

  const status = statusConfig[appointment.status];
  const payment = paymentConfig[appointment.payment_status];

  const handleWhatsAppReminder = () => {
    if (!appointment.clients?.whatsapp && !appointment.clients?.phone) return;
    
    const phone = appointment.clients.whatsapp || appointment.clients.phone || '';
    const message = generateAppointmentReminderMessage(
      appointment.clients.name,
      appointment.appointment_date,
      appointment.appointment_time,
      profile?.clinic_name || undefined
    );
    
    window.open(generateWhatsAppLink(phone, message), '_blank');
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">
              {appointment.clients?.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {appointment.appointment_time.slice(0, 5)}
            </p>
          </div>
        </div>
        <Badge className={cn('text-xs', status.bg)}>
          {status.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border hover:shadow-lg transition-all duration-300 h-full flex flex-col w-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              {appointment.clients?.name}
            </h4>
            {appointment.procedures?.name && (
              <p className="text-sm text-muted-foreground">
                {appointment.procedures.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={cn('text-xs', status.bg)}>
            {status.label}
          </Badge>
          <Badge className={cn('text-xs', payment.bg)}>
            {payment.label}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{appointment.appointment_time.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          <span>R$ {Number(appointment.price).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto">
        {appointment.status === 'scheduled' && onStatusChange && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-success hover:text-success hover:bg-success/10"
              onClick={() => onStatusChange(appointment.id, 'completed')}
            >
              Concluir
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onStatusChange(appointment.id, 'cancelled')}
            >
              Cancelar
            </Button>
          </>
        )}
        
        {appointment.payment_status === 'pending' && appointment.status === 'completed' && onPaymentChange && (
          <Button
            size="sm"
            variant="outline"
            className="text-success hover:text-success hover:bg-success/10"
            onClick={() => onPaymentChange(appointment.id, 'paid')}
          >
            Marcar Pago
          </Button>
        )}

        {(appointment.clients?.whatsapp || appointment.clients?.phone) && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleWhatsAppReminder}
            className="text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
