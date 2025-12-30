import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface Procedure {
  id: string;
  profile_id: string;
  name: string;
  default_price: number;
  duration_minutes: number | null;
  description: string | null;
  created_at: string;
}

export function useProcedures() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['procedures', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('profile_id', profile.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Procedure[];
    },
    enabled: !!profile?.id,
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (procedure: Omit<Procedure, 'id' | 'profile_id' | 'created_at'>) => {
      if (!profile?.id) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('procedures')
        .insert({ ...procedure, profile_id: profile.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Procedure> & { id: string }) => {
      const { data, error } = await supabase
        .from('procedures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
}

export function useDeleteProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
}
