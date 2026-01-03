import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, User, Phone, MessageCircle, Edit2, Save, X, CheckCircle2, XCircle, Calendar, Clock, Footprints, FileText, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { useClientAppointments, useUpdateAppointment, PaymentStatus } from '@/hooks/useAppointments';
import { useProcedures } from '@/hooks/useProcedures';
import { useAnamnesis, useCreateAnamnesis, useUpdateAnamnesis } from '@/hooks/useAnamnesis';
import { AppointmentDetailCard } from '@/components/cliente/AppointmentDetailCard';
import { FinancialHistoryRow } from '@/components/cliente/FinancialHistoryRow';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { formatPhone } from '@/lib/phone';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const { data: appointments, isLoading: isLoadingAppointments } = useClientAppointments(id || '');
  const { data: anamnesis, isLoading: isLoadingAnamnesis } = useAnamnesis(id || '');
  const { data: procedures } = useProcedures();
  const createAnamnesis = useCreateAnamnesis();
  const updateAnamnesis = useUpdateAnamnesis();
  const updateAppointment = useUpdateAppointment();
  const updateClient = useUpdateClient();
  const { toast } = useToast();
  
  const client = clients?.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    whatsapp: client?.whatsapp || '',
    email: client?.email || '',
    address: client?.address || '',
    notes: client?.notes || '',
  });

  useEffect(() => {
    if (client && !isEditing) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    }
  }, [client, isEditing]);

  // Calcular estatísticas das consultas
  const clientStats = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        firstAppointment: null,
        lastAppointment: null,
        totalAppointments: 0,
        totalSpent: 0,
      };
    }

    const sortedAppointments = [...appointments].sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return a.appointment_time.localeCompare(b.appointment_time);
    });

    const firstAppointment = sortedAppointments[0];
    const lastAppointment = sortedAppointments[sortedAppointments.length - 1];
    const totalSpent = appointments
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + Number(a.price), 0);

    return {
      firstAppointment: firstAppointment.appointment_date,
      lastAppointment: lastAppointment.appointment_date,
      totalAppointments: appointments.length,
      totalSpent,
    };
  }, [appointments]);

  // Calcular estatísticas financeiras
  const financialStats = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      return {
        totalGasto: 0,
        totalPago: 0,
        totalPendente: 0,
        ticketMedio: 0,
        hasPendingPayments: false,
      };
    }

    const totalGasto = appointments.reduce((sum, a) => sum + Number(a.price), 0);
    const totalPago = appointments
      .filter(a => a.payment_status === 'paid')
      .reduce((sum, a) => sum + Number(a.price), 0);
    const totalPendente = appointments
      .filter(a => a.payment_status === 'pending' || a.payment_status === 'partial')
      .reduce((sum, a) => sum + Number(a.price), 0);
    const ticketMedio = totalGasto / appointments.length;
    const hasPendingPayments = appointments.some(a => a.payment_status === 'pending' || a.payment_status === 'partial');

    return {
      totalGasto,
      totalPago,
      totalPendente,
      ticketMedio,
      hasPendingPayments,
    };
  }, [appointments]);

  // Estado para edição de anamnese
  const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);
  const [anamnesisData, setAnamnesisData] = useState({
    main_complaint: '',
    problem_history: '',
    has_diabetes: false,
    has_circulatory_problems: false,
    has_hypertension: false,
    uses_continuous_medication: false,
    has_allergies: false,
    is_pregnant: false,
    skin_type: '',
    sensitivity: '',
    nail_condition: '',
    calluses_fissures: '',
    clinical_observations: '',
  });

  // Atualizar dados quando anamnese carregar
  useEffect(() => {
    if (anamnesis && !isEditingAnamnesis) {
      setAnamnesisData({
        main_complaint: anamnesis.main_complaint || '',
        problem_history: anamnesis.problem_history || '',
        has_diabetes: anamnesis.has_diabetes || false,
        has_circulatory_problems: anamnesis.has_circulatory_problems || false,
        has_hypertension: anamnesis.has_hypertension || false,
        uses_continuous_medication: anamnesis.uses_continuous_medication || false,
        has_allergies: anamnesis.has_allergies || false,
        is_pregnant: anamnesis.is_pregnant || false,
        skin_type: anamnesis.skin_type || '',
        sensitivity: anamnesis.sensitivity || '',
        nail_condition: anamnesis.nail_condition || '',
        calluses_fissures: anamnesis.calluses_fissures || '',
        clinical_observations: anamnesis.clinical_observations || '',
      });
    }
  }, [anamnesis, isEditingAnamnesis]);

  const hasAnamnesis = !!anamnesis;

  const handlePhoneChange = (field: 'phone' | 'whatsapp', value: string) => {
    const masked = formatPhone(value);
    setFormData({ ...formData, [field]: masked });
  };

  const handleEdit = () => {
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (client) {
      setFormData({
        name: client.name || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
      });
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const cleanPhone = formData.phone.replace(/\D/g, '') || null;
      const cleanWhatsApp = formData.whatsapp.replace(/\D/g, '') || null;

      await updateClient.mutateAsync({
        id,
        name: formData.name,
        phone: cleanPhone,
        whatsapp: cleanWhatsApp,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });

      toast({ title: 'Dados atualizados com sucesso!' });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar dados' });
    }
  };

  const handleCreateAnamnesis = () => {
    setIsEditingAnamnesis(true);
    setAnamnesisData({
      main_complaint: '',
      problem_history: '',
      has_diabetes: false,
      has_circulatory_problems: false,
      has_hypertension: false,
      uses_continuous_medication: false,
      has_allergies: false,
      is_pregnant: false,
      skin_type: '',
      sensitivity: '',
      nail_condition: '',
      calluses_fissures: '',
      clinical_observations: '',
    });
  };

  const handleEditAnamnesis = () => {
    if (anamnesis) {
      setAnamnesisData({
        main_complaint: anamnesis.main_complaint || '',
        problem_history: anamnesis.problem_history || '',
        has_diabetes: anamnesis.has_diabetes || false,
        has_circulatory_problems: anamnesis.has_circulatory_problems || false,
        has_hypertension: anamnesis.has_hypertension || false,
        uses_continuous_medication: anamnesis.uses_continuous_medication || false,
        has_allergies: anamnesis.has_allergies || false,
        is_pregnant: anamnesis.is_pregnant || false,
        skin_type: anamnesis.skin_type || '',
        sensitivity: anamnesis.sensitivity || '',
        nail_condition: anamnesis.nail_condition || '',
        calluses_fissures: anamnesis.calluses_fissures || '',
        clinical_observations: anamnesis.clinical_observations || '',
      });
    }
    setIsEditingAnamnesis(true);
  };

  const handleNavigateToAnamneseEdit = () => {
    setActiveTab('anamnese');
    // Usar setTimeout para garantir que a aba mude antes de habilitar edição
    setTimeout(() => {
      if (hasAnamnesis) {
        handleEditAnamnesis();
      } else {
        handleCreateAnamnesis();
      }
    }, 100);
  };

  const handleCancelAnamnesis = () => {
    setIsEditingAnamnesis(false);
    if (anamnesis) {
      setAnamnesisData({
        main_complaint: anamnesis.main_complaint || '',
        problem_history: anamnesis.problem_history || '',
        has_diabetes: anamnesis.has_diabetes || false,
        has_circulatory_problems: anamnesis.has_circulatory_problems || false,
        has_hypertension: anamnesis.has_hypertension || false,
        uses_continuous_medication: anamnesis.uses_continuous_medication || false,
        has_allergies: anamnesis.has_allergies || false,
        is_pregnant: anamnesis.is_pregnant || false,
        skin_type: anamnesis.skin_type || '',
        sensitivity: anamnesis.sensitivity || '',
        nail_condition: anamnesis.nail_condition || '',
        calluses_fissures: anamnesis.calluses_fissures || '',
        clinical_observations: anamnesis.clinical_observations || '',
      });
    }
  };

  const handleSaveAnamnesis = async () => {
    if (!id) return;

    try {
      if (hasAnamnesis && anamnesis) {
        // Atualizar anamnese existente
        await updateAnamnesis.mutateAsync({
          id: anamnesis.id,
          ...anamnesisData,
        });
        toast({ title: 'Anamnese atualizada com sucesso!' });
      } else {
        // Criar nova anamnese
        await createAnamnesis.mutateAsync({
          client_id: id,
          ...anamnesisData,
        });
        toast({ title: 'Anamnese criada com sucesso!' });
      }
      setIsEditingAnamnesis(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar anamnese' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <User className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Cliente não encontrado</h2>
          <p className="text-muted-foreground">O cliente que você está procurando não existe.</p>
          <Button onClick={() => navigate('/clientes')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/clientes')}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{client.name}</h1>
              <p className="text-muted-foreground">Detalhamento do cliente</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
            <TabsTrigger value="consultas">Consultas</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          </TabsList>

          {/* Tab: Dados */}
          <TabsContent value="dados" className="mt-6 space-y-6">
            {/* Ações Rápidas */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Ações Rápidas</h3>
                {!isEditing && (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar Dados
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {client.phone && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`tel:${client.phone}`)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                )}
                {client.whatsapp && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(generateWhatsAppLink(client.whatsapp!, 'Olá!'))}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>

            {/* Informações de Contato */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Informações de Contato</h3>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-foreground">{client.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    {isEditing ? (
                      <Input 
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone} 
                        onChange={e => handlePhoneChange('phone', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{formatPhone(client.phone) || 'Não informado'}</p>
                    )}
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    {isEditing ? (
                      <Input 
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp} 
                        onChange={e => handlePhoneChange('whatsapp', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-foreground">{formatPhone(client.whatsapp) || 'Não informado'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-foreground">{client.email || 'Não informado'}</p>
                  )}
                </div>

                <div>
                  <Label>Endereço</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-foreground">{client.address || 'Não informado'}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 mt-6">
                  <Button onClick={handleSave} className="gradient-primary">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>

            {/* Observações Gerais */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Observações gerais (não clínicas)</h3>
              {isEditing ? (
                <Textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Adicione observações sobre o paciente..."
                  className="min-h-[120px]"
                />
              ) : (
                <p className="text-foreground whitespace-pre-wrap">
                  {client.notes || 'Nenhuma observação registrada.'}
                </p>
              )}
            </div>

            {/* Informações de Contexto */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Informações de Contexto</h3>
              {isLoadingAppointments ? (
                <p className="text-muted-foreground">Carregando estatísticas...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Primeira Consulta</Label>
                    <p className="mt-1 text-foreground font-medium">
                      {clientStats.firstAppointment 
                        ? format(parseISO(clientStats.firstAppointment), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Nenhuma consulta'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Última Consulta</Label>
                    <p className="mt-1 text-foreground font-medium">
                      {clientStats.lastAppointment 
                        ? format(parseISO(clientStats.lastAppointment), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Nenhuma consulta'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total de Consultas</Label>
                    <p className="mt-1 text-foreground font-medium text-lg">
                      {clientStats.totalAppointments}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Gasto</Label>
                    <p className="mt-1 text-foreground font-medium text-lg">
                      R$ {clientStats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status da Anamnese */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Status da Anamnese</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasAnamnesis ? (
                    <>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Anamnese preenchida</span>
                      </div>
                      {anamnesis?.updated_at && (
                        <p className="text-sm text-muted-foreground">
                          Última atualização: {format(parseISO(anamnesis.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Anamnese pendente</span>
                      </div>
                    </>
                  )}
                </div>
                <Button 
                  variant={hasAnamnesis ? "outline" : "default"}
                  size="sm"
                  onClick={handleNavigateToAnamneseEdit}
                  className={hasAnamnesis ? "" : "gradient-primary"}
                >
                  {hasAnamnesis ? (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar anamnese
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Criar anamnese
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Anamnese */}
          <TabsContent value="anamnese" className="mt-6 space-y-6">
            {/* Status da Anamnese */}
            <div className="rounded-xl bg-card border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Status da Anamnese</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {hasAnamnesis ? (
                    <>
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Anamnese preenchida</span>
                      </div>
                      {anamnesis?.updated_at && (
                        <p className="text-sm text-muted-foreground">
                          Última atualização: {format(parseISO(anamnesis.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Anamnese pendente</span>
                      </div>
                    </>
                  )}
                </div>
                {!isEditingAnamnesis && (
                  <Button 
                    variant={hasAnamnesis ? "outline" : "default"}
                    size="sm"
                    onClick={hasAnamnesis ? handleEditAnamnesis : handleCreateAnamnesis}
                    className={hasAnamnesis ? "" : "gradient-primary"}
                  >
                    {hasAnamnesis ? (
                      <>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar anamnese
                      </>
                    ) : (
                      <>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Criar anamnese
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {isLoadingAnamnesis ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Queixa Principal */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Queixa Principal</h3>
                  {isEditingAnamnesis ? (
                    <Textarea
                      placeholder="Qual o principal motivo do atendimento?"
                      value={anamnesisData.main_complaint}
                      onChange={e => setAnamnesisData({...anamnesisData, main_complaint: e.target.value})}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">
                      {anamnesis?.main_complaint || 'Não informado.'}
                    </p>
                  )}
                </div>

                {/* Histórico do Problema */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Histórico do Problema</h3>
                  {isEditingAnamnesis ? (
                    <Textarea
                      placeholder="Há quanto tempo ocorre? Já fez tratamento antes?"
                      value={anamnesisData.problem_history}
                      onChange={e => setAnamnesisData({...anamnesisData, problem_history: e.target.value})}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">
                      {anamnesis?.problem_history || 'Não informado.'}
                    </p>
                  )}
                </div>

                {/* Condições de Saúde */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Condições de Saúde</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'has_diabetes', label: 'Diabetes' },
                      { key: 'has_circulatory_problems', label: 'Problemas circulatórios' },
                      { key: 'has_hypertension', label: 'Hipertensão' },
                      { key: 'uses_continuous_medication', label: 'Uso contínuo de medicamentos' },
                      { key: 'has_allergies', label: 'Alergias' },
                      { key: 'is_pregnant', label: 'Gestante' },
                    ].map(({ key, label }) => (
                      <div 
                        key={key} 
                        className={cn(
                          "flex items-center space-x-3 p-2 rounded-md transition-colors",
                          isEditingAnamnesis && "hover:bg-muted/50 cursor-pointer"
                        )}
                      >
                        <Checkbox
                          id={key}
                          checked={isEditingAnamnesis 
                            ? (anamnesisData[key as keyof typeof anamnesisData] as boolean)
                            : (anamnesis?.[key as keyof typeof anamnesis] as boolean) || false
                          }
                          onCheckedChange={(checked) => {
                            if (isEditingAnamnesis) {
                              setAnamnesisData({...anamnesisData, [key]: checked});
                            }
                          }}
                          disabled={!isEditingAnamnesis}
                        />
                        <Label 
                          htmlFor={key}
                          className={cn(
                            "text-sm font-normal flex-1 transition-colors",
                            isEditingAnamnesis && "cursor-pointer",
                            !isEditingAnamnesis && "cursor-default",
                            !isEditingAnamnesis && !anamnesis?.[key as keyof typeof anamnesis] && "text-muted-foreground",
                            isEditingAnamnesis && anamnesisData[key as keyof typeof anamnesisData] && "text-foreground font-medium"
                          )}
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Avaliação Podológica */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Avaliação Podológica</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Tipo de pele</Label>
                      {isEditingAnamnesis ? (
                        <Select
                          value={anamnesisData.skin_type}
                          onValueChange={(value) => setAnamnesisData({...anamnesisData, skin_type: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o tipo de pele" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seca">Seca</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="umida">Úmida</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 text-foreground">
                          {anamnesis?.skin_type ? anamnesis.skin_type.charAt(0).toUpperCase() + anamnesis.skin_type.slice(1) : 'Não informado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Sensibilidade</Label>
                      {isEditingAnamnesis ? (
                        <Select
                          value={anamnesisData.sensitivity}
                          onValueChange={(value) => setAnamnesisData({...anamnesisData, sensitivity: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione a sensibilidade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="reduzida">Reduzida</SelectItem>
                            <SelectItem value="aumentada">Aumentada</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="mt-1 text-foreground">
                          {anamnesis?.sensitivity ? anamnesis.sensitivity.charAt(0).toUpperCase() + anamnesis.sensitivity.slice(1) : 'Não informado'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Condição das unhas</Label>
                      {isEditingAnamnesis ? (
                        <Textarea
                          placeholder="Descreva a condição das unhas..."
                          value={anamnesisData.nail_condition}
                          onChange={e => setAnamnesisData({...anamnesisData, nail_condition: e.target.value})}
                          className="mt-1 min-h-[80px]"
                        />
                      ) : (
                        <p className="mt-1 text-foreground whitespace-pre-wrap">
                          {anamnesis?.nail_condition || 'Não informado.'}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Presença de calosidades / fissuras</Label>
                      {isEditingAnamnesis ? (
                        <Textarea
                          placeholder="Descreva calosidades e/ou fissuras presentes..."
                          value={anamnesisData.calluses_fissures}
                          onChange={e => setAnamnesisData({...anamnesisData, calluses_fissures: e.target.value})}
                          className="mt-1 min-h-[80px]"
                        />
                      ) : (
                        <p className="mt-1 text-foreground whitespace-pre-wrap">
                          {anamnesis?.calluses_fissures || 'Não informado.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações Clínicas */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Observações Clínicas</h3>
                  {isEditingAnamnesis ? (
                    <Textarea
                      placeholder="Cuidados recomendados, pontos de atenção, evolução esperada..."
                      value={anamnesisData.clinical_observations}
                      onChange={e => setAnamnesisData({...anamnesisData, clinical_observations: e.target.value})}
                      className="min-h-[150px]"
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">
                      {anamnesis?.clinical_observations || 'Nenhuma observação clínica registrada.'}
                    </p>
                  )}
                </div>

                {/* Botões de ação */}
                {isEditingAnamnesis && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveAnamnesis} className="gradient-primary">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Anamnese
                    </Button>
                    <Button variant="outline" onClick={handleCancelAnamnesis}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Tab: Consultas */}
          <TabsContent value="consultas" className="mt-6">
            {isLoadingAppointments ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : appointments && appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <AppointmentDetailCard
                    key={appointment.id}
                    appointment={appointment}
                    procedures={procedures || []}
                    onUpdate={updateAppointment}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-medium text-foreground mb-1">Nenhuma consulta</h3>
                <p className="text-sm text-muted-foreground">
                  Este cliente ainda não possui consultas registradas.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Financeiro */}
          <TabsContent value="financeiro" className="mt-6 space-y-6">
            {isLoadingAppointments ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Resumo Financeiro */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Resumo Financeiro
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs text-muted-foreground">Total Gasto</Label>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {financialStats.totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <Label className="text-xs text-muted-foreground">Total Pago</Label>
                      </div>
                      <p className="text-2xl font-bold text-success">
                        R$ {financialStats.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-warning" />
                        <Label className="text-xs text-muted-foreground">Total Pendente</Label>
                      </div>
                      <p className="text-2xl font-bold text-warning">
                        R$ {financialStats.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <Label className="text-xs text-muted-foreground">Ticket Médio</Label>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        R$ {financialStats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Indicadores de Comportamento */}
                <div className="rounded-xl bg-card border border-border p-4">
                  {financialStats.hasPendingPayments ? (
                    <div className="flex items-center gap-3 text-warning">
                      <AlertCircle className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-foreground">Possui pagamentos pendentes</p>
                        <p className="text-sm text-muted-foreground">
                          Este cliente possui {appointments?.filter(a => a.payment_status === 'pending' || a.payment_status === 'partial').length} consulta(s) com pagamento pendente ou parcial.
                        </p>
                      </div>
                    </div>
                  ) : appointments && appointments.length > 0 ? (
                    <div className="flex items-center gap-3 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <p className="font-semibold text-foreground">Cliente sem pendências</p>
                        <p className="text-sm text-muted-foreground">
                          Todas as consultas deste cliente estão com pagamento em dia.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <AlertCircle className="h-5 w-5" />
                      <p className="text-sm">Nenhuma consulta registrada ainda.</p>
                    </div>
                  )}
                </div>

                {/* Histórico Financeiro */}
                <div className="rounded-xl bg-card border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Histórico Financeiro</h2>
                  {appointments && appointments.length > 0 ? (
                    <div className="space-y-2">
                      {appointments
                        .sort((a, b) => {
                          const dateCompare = b.appointment_date.localeCompare(a.appointment_date);
                          if (dateCompare !== 0) return dateCompare;
                          return b.appointment_time.localeCompare(a.appointment_time);
                        })
                        .map((appointment) => (
                          <FinancialHistoryRow
                            key={appointment.id}
                            appointment={appointment}
                            onUpdatePaymentStatus={async (status) => {
                              try {
                                await updateAppointment.mutateAsync({
                                  id: appointment.id,
                                  payment_status: status,
                                });
                                toast({ 
                                  title: 'Status de pagamento atualizado!',
                                  description: 'As alterações foram salvas com sucesso.',
                                });
                              } catch (error) {
                                toast({ 
                                  variant: 'destructive', 
                                  title: 'Erro ao atualizar status',
                                  description: 'Não foi possível salvar as alterações. Tente novamente.',
                                });
                              }
                            }}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum histórico financeiro disponível.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
