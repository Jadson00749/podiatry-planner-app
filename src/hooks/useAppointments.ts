import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'partial';

export interface Appointment {
  id: string;
  profile_id: string;
  client_id: string;
  procedure_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  price: number;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  clients?: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
  };
  procedures?: {
    id: string;
    name: string;
  } | null;
}

export function useAppointments(date?: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['appointments', profile?.id, date],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          clients (id, name, phone, whatsapp),
          procedures (id, name)
        `)
        .eq('profile_id', profile.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (date) {
        query = query.eq('appointment_date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!profile?.id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'profile_id' | 'created_at' | 'updated_at' | 'clients' | 'procedures'>) => {
      if (!profile?.id) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('appointments')
        .insert({ ...appointment, profile_id: profile.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useTodayStats() {
  const { data: profile } = useProfile();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['today-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('appointment_date', today);

      if (error) throw error;

      const total = appointments?.length || 0;
      const completed = appointments?.filter(a => a.status === 'completed').length || 0;
      const pending = appointments?.filter(a => a.status === 'scheduled').length || 0;
      const totalReceived = appointments
        ?.filter(a => a.payment_status === 'paid')
        .reduce((sum, a) => sum + Number(a.price), 0) || 0;
      const totalPending = appointments
        ?.filter(a => a.payment_status === 'pending')
        .reduce((sum, a) => sum + Number(a.price), 0) || 0;

      return { total, completed, pending, totalReceived, totalPending };
    },
    enabled: !!profile?.id,
  });
}

export function useMonthStats(month?: number, year?: number) {
  const { data: profile } = useProfile();
  const currentDate = new Date();
  const targetMonth = month ?? currentDate.getMonth();
  const targetYear = year ?? currentDate.getFullYear();
  
  const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
  const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['month-stats', profile?.id, targetMonth, targetYear],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (error) throw error;

      const total = appointments?.length || 0;
      const completed = appointments?.filter(a => a.status === 'completed').length || 0;
      const cancelled = appointments?.filter(a => a.status === 'cancelled').length || 0;
      const totalReceived = appointments
        ?.filter(a => a.payment_status === 'paid')
        .reduce((sum, a) => sum + Number(a.price), 0) || 0;
      const totalPending = appointments
        ?.filter(a => a.payment_status === 'pending')
        .reduce((sum, a) => sum + Number(a.price), 0) || 0;

      return { total, completed, cancelled, totalReceived, totalPending };
    },
    enabled: !!profile?.id,
  });
}
