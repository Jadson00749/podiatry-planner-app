import { useState } from 'react';
import { Search, Plus, Phone, MessageCircle, User, MoreVertical } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients, useCreateClient, useDeleteClient } from '@/hooks/useClients';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { generateWhatsAppLink } from '@/lib/whatsapp';

export default function Clientes() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.whatsapp?.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient.mutateAsync({
        name: formData.name,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });
      toast({ title: 'Cliente cadastrado!' });
      setIsOpen(false);
      setFormData({ name: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar cliente' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">{clients?.length || 0} clientes cadastrados</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label>Nome *</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Telefone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                  <div><Label>WhatsApp</Label><Input value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div><Label>Endereço</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                <div><Label>Observações</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                <Button type="submit" className="w-full gradient-primary">Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients?.map(client => (
            <div key={client.id} className="p-4 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>
                  <div><h3 className="font-semibold text-foreground">{client.name}</h3>{client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuItem onClick={() => deleteClient.mutate(client.id)} className="text-destructive">Excluir</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 mt-4">
                {client.phone && <Button variant="outline" size="sm" onClick={() => window.open(`tel:${client.phone}`)}><Phone className="h-4 w-4 mr-1" />Ligar</Button>}
                {client.whatsapp && <Button variant="outline" size="sm" onClick={() => window.open(generateWhatsAppLink(client.whatsapp!, 'Olá!'))}><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
