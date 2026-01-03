import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, CalendarIcon } from 'lucide-react';
import { getHolidaysForMonth } from '@/lib/holidays';
import { isHolidayDate, disablePastDates } from '@/lib/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useProcedures } from '@/hooks/useProcedures';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  procedure_id: z.string().optional(),
  appointment_date: z.string().min(1, 'Selecione uma data').refine((date) => {
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, {
    message: 'Não é possível agendar em datas passadas',
  }),
  appointment_time: z.string().min(1, 'Selecione um horário'),
  price: z.string().min(1, 'Informe o valor'),
  notes: z.string().optional(),
});

const newClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type NewClientFormData = z.infer<typeof newClientSchema>;

interface NewAppointmentFormProps {
  defaultDate?: string;
  onSuccess: () => void;
}

export function NewAppointmentForm({ defaultDate, onSuccess }: NewAppointmentFormProps) {
  const [isNewClient, setIsNewClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(defaultDate ? new Date(defaultDate) : new Date());
  const { data: clients } = useClients();
  const { data: procedures } = useProcedures();
  const createAppointment = useCreateAppointment();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const appointmentForm = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointment_date: defaultDate || new Date().toISOString().split('T')[0],
      appointment_time: '',
      price: '',
      notes: '',
    },
  });

  const clientForm = useForm<NewClientFormData>({
    resolver: zodResolver(newClientSchema),
    defaultValues: { name: '', phone: '', whatsapp: '' },
  });

  const handleProcedureChange = (procedureId: string) => {
    const procedure = procedures?.find(p => p.id === procedureId);
    if (procedure) {
      appointmentForm.setValue('price', procedure.default_price.toString());
    }
    appointmentForm.setValue('procedure_id', procedureId);
  };

  const handleSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true);
    
    try {
      let clientId = data.client_id;

      // If new client, create first  
      if (isNewClient) {
        const clientData = clientForm.getValues();
        const newClient = await createClient.mutateAsync({
          name: clientData.name,
          phone: clientData.phone || null,
          whatsapp: clientData.whatsapp || null,
          email: null,
          address: null,
          notes: null,
        });
        clientId = newClient.id;
      }

      await createAppointment.mutateAsync({
        client_id: clientId,
        procedure_id: data.procedure_id || null,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        price: parseFloat(data.price),
        notes: data.notes || null,
        status: 'scheduled',
        payment_status: 'pending',
        reminder_sent: false,
      });

      toast({
        title: 'Agendamento criado!',
        description: 'O agendamento foi criado com sucesso.',
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível criar o agendamento.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots (7:00 até 23:30)
  const timeSlots = [];
  for (let hour = 7; hour <= 23; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Date handling
  const selectedDate = appointmentForm.watch('appointment_date')
    ? new Date(appointmentForm.watch('appointment_date') + 'T00:00:00')
    : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      appointmentForm.setValue('appointment_date', dateString);
      setCalendarOpen(false);
    }
  };

  // Atualizar mês atual quando o calendário abrir
  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (open && selectedDate) {
      setCurrentMonth(selectedDate);
    } else if (open) {
      setCurrentMonth(new Date());
    }
  };


  // Obter feriados do mês atual
  const holidays = getHolidaysForMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  // Função para formatar valor como dinheiro brasileiro (para exibição)
  const formatCurrencyDisplay = (value: string): string => {
    if (!value || value === '0') return '';
    const numValue = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  // Função para extrair apenas números do input e converter para formato numérico
  const parseCurrencyInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    
    // Converte para número e divide por 100 para ter centavos
    const amount = Number(numbers) / 100;
    return amount.toFixed(2);
  };

  // Handler para mudança no campo de preço
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseCurrencyInput(e.target.value);
    appointmentForm.setValue('price', numericValue, { shouldValidate: true });
  };

  return (
    <form onSubmit={appointmentForm.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Client Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cliente</Label>
          <button
            type="button"
            onClick={() => setIsNewClient(!isNewClient)}
            className="text-xs text-primary hover:underline"
          >
            {isNewClient ? 'Selecionar existente' : 'Novo cliente'}
          </button>
        </div>

        {isNewClient ? (
          <div className="space-y-3 p-3 rounded-lg bg-muted">
            <div>
              <Input
                placeholder="Nome do cliente"
                {...clientForm.register('name')}
              />
              {clientForm.formState.errors.name && (
                <p className="text-xs text-destructive mt-1">{clientForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Telefone"
                {...clientForm.register('phone')}
              />
              <Input
                placeholder="WhatsApp"
                {...clientForm.register('whatsapp')}
              />
            </div>
          </div>
        ) : (
          <Select
            value={appointmentForm.watch('client_id')}
            onValueChange={(value) => appointmentForm.setValue('client_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!isNewClient && appointmentForm.formState.errors.client_id && (
          <p className="text-xs text-destructive">{appointmentForm.formState.errors.client_id.message}</p>
        )}
      </div>

      {/* Procedure */}
      <div className="space-y-2">
        <Label>Procedimento (opcional)</Label>
        <Select onValueChange={handleProcedureChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um procedimento" />
          </SelectTrigger>
          <SelectContent>
            {procedures?.map((procedure) => (
              <SelectItem key={procedure.id} value={procedure.id}>
                {procedure.name} - R$ {procedure.default_price.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  initialFocus
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
            </PopoverContent>
          </Popover>
          {appointmentForm.formState.errors.appointment_date && (
            <p className="text-xs text-destructive">
              {appointmentForm.formState.errors.appointment_date.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Horário</Label>
          <Select
            value={appointmentForm.watch('appointment_time')}
            onValueChange={(value) => appointmentForm.setValue('appointment_time', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Horário" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {appointmentForm.formState.errors.appointment_time && (
            <p className="text-xs text-destructive">{appointmentForm.formState.errors.appointment_time.message}</p>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input
          type="text"
          placeholder="R$ 0,00"
          value={appointmentForm.watch('price') ? formatCurrencyDisplay(appointmentForm.watch('price')) : ''}
          onChange={handlePriceChange}
        />
        {appointmentForm.formState.errors.price && (
          <p className="text-xs text-destructive">{appointmentForm.formState.errors.price.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Textarea
          placeholder="Adicione observações sobre a consulta..."
          {...appointmentForm.register('notes')}
        />
      </div>

      <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando...
          </>
        ) : (
          'Criar Agendamento'
        )}
      </Button>
    </form>
  );
}
