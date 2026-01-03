import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, addDays, addMonths, startOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { AppointmentCard } from '@/components/dashboard/AppointmentCard';
import { useAppointments, useUpdateAppointment } from '@/hooks/useAppointments';
import { isHoliday } from '@/lib/holidays';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAppointmentForm } from '@/components/agenda/NewAppointmentForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type ViewMode = 'day' | 'week' | 'month';
type StatusFilter = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
type PaymentFilter = 'pending' | 'paid' | 'partial';

export default function Agenda() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState(dateParam ? parseISO(dateParam) : new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  
  // Filtros de status
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilter[]>([]);

  const { data: appointments, isLoading } = useAppointments();
  const updateAppointment = useUpdateAppointment();

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSearchParams({ date: format(date, 'yyyy-MM-dd') });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date;
    
    if (viewMode === 'month') {
      // Navegar mês a mês
      newDate = direction === 'next' 
        ? addMonths(selectedDate, 1)
        : addMonths(selectedDate, -1);
    } else if (viewMode === 'week') {
      // Navegar semana a semana
      newDate = direction === 'next' 
        ? addDays(selectedDate, 7)
        : addDays(selectedDate, -7);
    } else {
      // Navegar dia a dia
      newDate = direction === 'next' 
        ? addDays(selectedDate, 1)
        : addDays(selectedDate, -1);
    }
    
    handleDateChange(newDate);
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [selectedDate]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    
    let filtered = appointments;
    
    // Filtro por data (dia, semana ou mês)
    if (viewMode === 'day') {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.appointment_date === dateStr);
    } else if (viewMode === 'week') {
      const dates = weekDays.map(d => format(d, 'yyyy-MM-dd'));
      filtered = filtered.filter(a => dates.includes(a.appointment_date));
    } else if (viewMode === 'month') {
      // Filtrar por mês: pegar primeiro e último dia do mês selecionado
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      
      filtered = filtered.filter(a => {
        const appointmentDate = parseISO(a.appointment_date);
        return isWithinInterval(appointmentDate, { start: monthStart, end: monthEnd });
      });
    }
    
    // Filtro por status
    if (statusFilters.length > 0) {
      filtered = filtered.filter(a => statusFilters.includes(a.status as StatusFilter));
    }
    
    // Filtro por payment_status
    if (paymentFilters.length > 0) {
      filtered = filtered.filter(a => paymentFilters.includes(a.payment_status as PaymentFilter));
    }
    
    return filtered;
  }, [appointments, selectedDate, viewMode, weekDays, statusFilters, paymentFilters]);

  const holiday = isHoliday(format(selectedDate, 'yyyy-MM-dd'));

  const handleStatusChange = (id: string, status: 'completed' | 'cancelled' | 'scheduled' | 'no_show') => {
    updateAppointment.mutate({ id, status });
  };

  const handlePaymentChange = (id: string, payment_status: 'pending' | 'paid' | 'partial') => {
    updateAppointment.mutate({ id, payment_status });
  };

  // Handlers para filtros
  const handleStatusFilterChange = (status: StatusFilter, checked: boolean) => {
    if (checked) {
      setStatusFilters([...statusFilters, status]);
    } else {
      setStatusFilters(statusFilters.filter(s => s !== status));
    }
  };

  const handlePaymentFilterChange = (payment: PaymentFilter, checked: boolean) => {
    if (checked) {
      setPaymentFilters([...paymentFilters, payment]);
    } else {
      setPaymentFilters(paymentFilters.filter(p => p !== payment));
    }
  };

  const clearFilters = () => {
    setStatusFilters([]);
    setPaymentFilters([]);
  };

  const hasActiveFilters = statusFilters.length > 0 || paymentFilters.length > 0;


  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie seus agendamentos
            </p>
          </div>
          
          <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
              </DialogHeader>
              <NewAppointmentForm 
                defaultDate={format(selectedDate, 'yyyy-MM-dd')}
                onSuccess={() => setIsNewAppointmentOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center min-w-[200px]">
                <h2 className="font-semibold text-foreground capitalize">
                  {viewMode === 'day' && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  {viewMode === 'week' && `Semana de ${format(weekDays[0], 'd MMM', { locale: ptBR })} - ${format(weekDays[6], 'd MMM', { locale: ptBR })}`}
                  {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                {holiday && (
                  <p className="text-xs text-destructive font-medium">{holiday.name}</p>
                )}
              </div>
              
              <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    viewMode === mode
                      ? 'bg-background text-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'day' && 'Dia'}
                  {mode === 'week' && 'Semana'}
                  {mode === 'month' && 'Mês'}
                </button>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "gap-2",
                    hasActiveFilters && "border-primary bg-primary/5"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtrar
                  {hasActiveFilters && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                      {statusFilters.length + paymentFilters.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filtros</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  {/* Status Filters */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-scheduled"
                          checked={statusFilters.includes('scheduled')}
                          onCheckedChange={(checked) => handleStatusFilterChange('scheduled', checked as boolean)}
                        />
                        <Label
                          htmlFor="status-scheduled"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Agendado
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-completed"
                          checked={statusFilters.includes('completed')}
                          onCheckedChange={(checked) => handleStatusFilterChange('completed', checked as boolean)}
                        />
                        <Label
                          htmlFor="status-completed"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Concluído
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-cancelled"
                          checked={statusFilters.includes('cancelled')}
                          onCheckedChange={(checked) => handleStatusFilterChange('cancelled', checked as boolean)}
                        />
                        <Label
                          htmlFor="status-cancelled"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Cancelado
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="status-no_show"
                          checked={statusFilters.includes('no_show')}
                          onCheckedChange={(checked) => handleStatusFilterChange('no_show', checked as boolean)}
                        />
                        <Label
                          htmlFor="status-no_show"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Não compareceu
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Payment Filters */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Pagamento</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="payment-pending"
                          checked={paymentFilters.includes('pending')}
                          onCheckedChange={(checked) => handlePaymentFilterChange('pending', checked as boolean)}
                        />
                        <Label
                          htmlFor="payment-pending"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Pendente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="payment-paid"
                          checked={paymentFilters.includes('paid')}
                          onCheckedChange={(checked) => handlePaymentFilterChange('paid', checked as boolean)}
                        />
                        <Label
                          htmlFor="payment-paid"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Pago
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="payment-partial"
                          checked={paymentFilters.includes('partial')}
                          onCheckedChange={(checked) => handlePaymentFilterChange('partial', checked as boolean)}
                        />
                        <Label
                          htmlFor="payment-partial"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Parcial
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'day' && (
          <div className="space-y-2">
            {filteredAppointments.length === 0 ? (
              <div className="p-8 rounded-xl bg-card border border-border text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">Nenhum agendamento</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Não há consultas marcadas para este dia
                </p>
                <Button onClick={() => setIsNewAppointmentOpen(true)}>
                  Criar agendamento
                </Button>
              </div>
            ) : (
              filteredAppointments
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onStatusChange={handleStatusChange}
                    onPaymentChange={handlePaymentChange}
                  />
                ))
            )}
          </div>
        )}

        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayAppointments = appointments?.filter(a => a.appointment_date === dateStr) || [];
              const dayHoliday = isHoliday(dateStr);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'p-3 rounded-xl border min-h-[200px] transition-colors cursor-pointer',
                    isToday ? 'border-primary bg-primary/5' : 'border-border bg-card',
                    'hover:border-primary/50'
                  )}
                  onClick={() => {
                    handleDateChange(day);
                    setViewMode('day');
                  }}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isToday ? 'text-primary' : 'text-foreground',
                      dayHoliday && 'text-destructive'
                    )}>
                      {format(day, 'd')}
                    </p>
                    {dayHoliday && (
                      <p className="text-xs text-destructive truncate">{dayHoliday.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className="p-2 rounded bg-primary/10 text-xs"
                      >
                        <p className="font-medium text-foreground truncate">
                          {apt.appointment_time.slice(0, 5)} - {apt.clients?.name}
                        </p>
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'month' && (
          <>
            {filteredAppointments.length === 0 ? (() => {
              // Verificar se o mês selecionado é no passado ou futuro
              const currentMonth = startOfMonth(new Date());
              const selectedMonth = startOfMonth(selectedDate);
              const isPastMonth = selectedMonth < currentMonth;
              
              return (
                <div className="p-8 rounded-xl bg-card border border-border text-center">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium text-foreground mb-1">Nenhum agendamento</h3>
                  <p className="text-sm text-muted-foreground">
                    {isPastMonth 
                      ? 'Não houve consultas para este mês'
                      : 'Não há consultas para este mês'
                    }
                  </p>
                </div>
              );
            })() : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAppointments
                  .sort((a, b) => {
                    const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
                    if (dateCompare !== 0) return dateCompare;
                    return a.appointment_time.localeCompare(b.appointment_time);
                  })
                  .map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onStatusChange={handleStatusChange}
                      onPaymentChange={handlePaymentChange}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
