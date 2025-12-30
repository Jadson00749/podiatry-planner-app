import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAppointments, useMonthStats, useUpdateAppointment } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Financeiro() {
  const { data: appointments } = useAppointments();
  const { data: monthStats } = useMonthStats();
  const updateAppointment = useUpdateAppointment();

  const pendingAppointments = appointments?.filter(a => a.payment_status === 'pending' && a.status === 'completed') || [];

  const handleMarkAsPaid = (id: string) => {
    updateAppointment.mutate({ id, payment_status: 'paid' });
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle de recebimentos - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Recebido no Mês" value={`R$ ${(monthStats?.totalReceived || 0).toFixed(2)}`} icon={<CheckCircle className="h-5 w-5" />} variant="success" />
          <StatCard title="Pendente no Mês" value={`R$ ${(monthStats?.totalPending || 0).toFixed(2)}`} icon={<Clock className="h-5 w-5" />} variant="warning" />
          <StatCard title="Total de Consultas" value={monthStats?.total || 0} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard title="Consultas Concluídas" value={monthStats?.completed || 0} icon={<DollarSign className="h-5 w-5" />} variant="primary" />
        </div>

        <div className="rounded-xl bg-card border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pagamentos Pendentes</h2>
          {pendingAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum pagamento pendente!</p>
          ) : (
            <div className="space-y-3">
              {pendingAppointments.map(apt => (
                <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">{apt.clients?.name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(apt.appointment_date + 'T00:00:00'), "d 'de' MMM", { locale: ptBR })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-foreground">R$ {Number(apt.price).toFixed(2)}</span>
                    <Button size="sm" onClick={() => handleMarkAsPaid(apt.id)} className="bg-success hover:bg-success/90">Marcar Pago</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
