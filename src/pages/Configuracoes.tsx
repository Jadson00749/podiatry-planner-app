import { AppLayout } from '@/components/AppLayout';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Configuracoes() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ full_name: '', clinic_name: '', phone: '' });

  useEffect(() => {
    if (profile) {
      setFormData({ 
        full_name: profile.full_name || '', 
        clinic_name: profile.clinic_name || '', 
        phone: profile.phone || '' 
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(formData);
      toast({ title: 'Perfil atualizado!' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
        </div>

        <div className="rounded-xl bg-card border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Perfil</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input 
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
              />
            </div>
            <div>
              <Label>Nome da clínica</Label>
              <Input 
                value={formData.clinic_name} 
                onChange={e => setFormData({...formData, clinic_name: e.target.value})} 
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
            <Button type="submit" className="gradient-primary">Salvar alterações</Button>
          </form>
        </div>

        <div className="rounded-xl bg-card border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Aparência</h2>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">Tema</p><p className="text-sm text-muted-foreground">Alternar entre claro e escuro</p></div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
