import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Users, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Calendar } from '@/components/ui/calendar';
import { AppointmentCard } from '@/components/dashboard/AppointmentCard';
import { useProfile } from '@/hooks/useProfile';
import { useAppointments, useTodayStats, useMonthStats, useUpdateAppointment } from '@/hooks/useAppointments';
import { useClients } from '@/hooks/useClients';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { getHolidaysForMonth } from '@/lib/holidays';
import { isHolidayDate, disablePastDates } from '@/lib/calendar';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAppointments, isLoading: appointmentsLoading } = useAppointments(today);
  const { data: todayStats } = useTodayStats();
  const { data: monthStats } = useMonthStats();
  const { data: clients } = useClients();
  const updateAppointment = useUpdateAppointment();

  const appointmentDates = todayAppointments?.map(a => a.appointment_date) || [];
  
  // Calendar states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Calcular número de colunas baseado na quantidade de appointments
  const getGridCols = () => {
    const count = todayAppointments?.length || 0;
    if (count === 0) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'md:grid-cols-2';
    return 'md:grid-cols-2 xl:grid-cols-3';
  };


  // Obter feriados do mês atual
  const holidays = getHolidaysForMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      navigate(`/agenda?date=${format(date, 'yyyy-MM-dd')}`);
    }
  };

  const handleStatusChange = (id: string, status: 'completed' | 'cancelled' | 'scheduled' | 'no_show') => {
    updateAppointment.mutate({ id, status });
  };

  const handlePaymentChange = (id: string, payment_status: 'pending' | 'paid' | 'partial') => {
    updateAppointment.mutate({ id, payment_status });
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}! 👋
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={() => navigate('/agenda')}
            className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            + Novo Agendamento
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Consultas Hoje"
            value={todayStats?.total || 0}
            icon={<CalendarIcon className="h-5 w-5" />}
            description={`${todayStats?.completed || 0} concluídas`}
            variant="primary"
          />
          <StatCard
            title="Total de Clientes"
            value={clients?.length || 0}
            icon={<Users className="h-5 w-5" />}
            description="Cadastrados"
            variant="default"
          />
          <StatCard
            title="Recebido Hoje"
            value={`R$ ${(todayStats?.totalReceived || 0).toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Pendente Hoje"
            value={`R$ ${(todayStats?.totalPending || 0).toFixed(2)}`}
            icon={<AlertCircle className="h-5 w-5" />}
            description="Aguardando pagamento"
            variant="warning"
          />
        </div>

        {/* Month Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Consultas do Mês"
            value={monthStats?.total || 0}
            icon={<TrendingUp className="h-5 w-5" />}
            description={`${monthStats?.cancelled || 0} canceladas`}
          />
          <StatCard
            title="Recebido no Mês"
            value={`R$ ${(monthStats?.totalReceived || 0).toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Pendente no Mês"
            value={`R$ ${(monthStats?.totalPending || 0).toFixed(2)}`}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 w-full">
          {/* Today's Appointments */}
          <div className="flex-1 space-y-4 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Consultas de Hoje</h2>
            
            {appointmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : todayAppointments?.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border border-border text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">Nenhuma consulta hoje</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aproveite para organizar sua agenda!
                </p>
                <button
                  onClick={() => navigate('/agenda')}
                  className="text-sm text-primary hover:underline"
                >
                  Criar novo agendamento
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${getGridCols()} gap-4 auto-rows-fr`}>
                {todayAppointments?.map((appointment) => (
                  <div key={appointment.id} className="min-w-0 h-full flex">
                    <AppointmentCard
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onPaymentChange={handlePaymentChange}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="flex flex-col w-full sm:w-fit flex-shrink-0 sm:ml-auto">
            <h2 className="text-lg font-semibold text-foreground mb-4">Calendário</h2>
            <div className="p-4 rounded-xl bg-card border border-border w-fit">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ptBR}
                disabled={disablePastDates}
                modifiers={{
                  holiday: isHolidayDate,
                }}
                modifiersClassNames={{
                  holiday: 'border border-red-500 rounded-md',
                }}
                onMonthChange={setCurrentMonth}
              />
              
              {/* Feriados do mês */}
              {holidays.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Feriados do mês:</p>
                  <div className="space-y-1">
                    {holidays.map((h) => (
                      <div key={h.date} className="flex items-center gap-2 text-xs">
                        <span className="text-destructive font-medium">
                          {format(new Date(h.date + 'T00:00:00'), 'd')}
                        </span>
                        <span className="text-muted-foreground">{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
