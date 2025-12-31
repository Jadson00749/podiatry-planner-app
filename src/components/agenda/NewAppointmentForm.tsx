import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useProcedures } from '@/hooks/useProcedures';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useToast } from '@/hooks/use-toast';

const appointmentSchema = z.object({
  client_id: z.string().min(1, 'Selecione um cliente'),
  procedure_id: z.string().optional(),
  appointment_date: z.string().min(1, 'Selecione uma data'),
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
          <Input
            type="date"
            {...appointmentForm.register('appointment_date')}
          />
          {appointmentForm.formState.errors.appointment_date && (
            <p className="text-xs text-destructive">{appointmentForm.formState.errors.appointment_date.message}</p>
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
          type="number"
          step="0.01"
          placeholder="0.00"
          {...appointmentForm.register('price')}
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
