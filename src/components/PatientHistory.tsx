import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  CalendarIcon, 
  Edit, 
  Eye, 
  FileText, 
  Clock,
  User,
  Heart,
  Pill,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Patient {
  id: string;
  patient_ref: string;
  allergies?: string;
  current_medications?: string;
  medical_conditions?: string;
}

interface HistoryEntry {
  id: string;
  visit_date: string;
  visit_type: string;
  chief_complaint?: string;
  diagnosis?: string;
  treatment_performed?: string;
  treatment_plan?: string;
  next_appointment?: string;
  dentist_notes?: string;
  created_at: string;
}

interface PatientHistoryProps {
  patient: Patient;
  onClose: () => void;
}

export function PatientHistory({ patient, onClose }: PatientHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [formData, setFormData] = useState({
    visit_date: '',
    visit_type: 'consulta',
    chief_complaint: '',
    diagnosis: '',
    treatment_performed: '',
    treatment_plan: '',
    next_appointment: '',
    dentist_notes: ''
  });
  const [visitDate, setVisitDate] = useState<Date>();
  const [nextAppointment, setNextAppointment] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const visitTypes = [
    { value: 'consulta', label: 'Consulta' },
    { value: 'emergencia', label: 'Emergência' },
    { value: 'profilaxia', label: 'Profilaxia' },
    { value: 'restauracao', label: 'Restauração' },
    { value: 'extracao', label: 'Extração' },
    { value: 'canal', label: 'Tratamento de Canal' },
    { value: 'ortodontia', label: 'Ortodontia' },
    { value: 'periodontia', label: 'Periodontia' },
    { value: 'cirurgia', label: 'Cirurgia' },
    { value: 'protese', label: 'Prótese' },
    { value: 'implante', label: 'Implante' },
    { value: 'retorno', label: 'Retorno' }
  ];

  useEffect(() => {
    loadHistory();
  }, [patient.id]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_history')
        .select('*')
        .eq('patient_id', patient.id)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visit_date: '',
      visit_type: 'consulta',
      chief_complaint: '',
      diagnosis: '',
      treatment_performed: '',
      treatment_plan: '',
      next_appointment: '',
      dentist_notes: ''
    });
    setVisitDate(undefined);
    setNextAppointment(undefined);
    setSelectedEntry(null);
  };

  const handleNewEntry = () => {
    resetForm();
    setVisitDate(new Date());
    setFormData(prev => ({
      ...prev,
      visit_date: format(new Date(), 'yyyy-MM-dd')
    }));
    setShowForm(true);
  };

  const handleEditEntry = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setFormData({
      visit_date: entry.visit_date,
      visit_type: entry.visit_type,
      chief_complaint: entry.chief_complaint || '',
      diagnosis: entry.diagnosis || '',
      treatment_performed: entry.treatment_performed || '',
      treatment_plan: entry.treatment_plan || '',
      next_appointment: entry.next_appointment || '',
      dentist_notes: entry.dentist_notes || ''
    });
    setVisitDate(new Date(entry.visit_date));
    if (entry.next_appointment) {
      setNextAppointment(new Date(entry.next_appointment));
    }
    setShowForm(true);
  };

  const handleVisitDateChange = (date: Date | undefined) => {
    setVisitDate(date);
    if (date) {
      setFormData(prev => ({
        ...prev,
        visit_date: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  const handleNextAppointmentChange = (date: Date | undefined) => {
    setNextAppointment(date);
    if (date) {
      setFormData(prev => ({
        ...prev,
        next_appointment: format(date, 'yyyy-MM-dd')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        next_appointment: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get user's tenant_id first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        toast.error("Erro ao obter informações do usuário");
        return;
      }

      const historyData = {
        patient_id: patient.id,
        tenant_id: profile.tenant_id,
        ...formData,
        next_appointment: formData.next_appointment || null
      };

      if (selectedEntry) {
        // For updates, remove tenant_id as it shouldn't change
        const { tenant_id, ...updateData } = historyData;
        const { error } = await supabase
          .from('patient_history')
          .update(updateData)
          .eq('id', selectedEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patient_history')
          .insert(historyData);

        if (error) throw error;
      }

      toast.success("Entrada salva com sucesso!");
      setShowForm(false);
      resetForm();
      loadHistory();
    } catch (error) {
      console.error('Error saving history entry:', error);
      toast.error("Erro ao salvar entrada");
    } finally {
      setSaving(false);
    }
  };

  const getVisitTypeLabel = (type: string) => {
    return visitTypes.find(vt => vt.value === type)?.label || type;
  };

  const getVisitTypeBadge = (type: string) => {
    const urgentTypes = ['emergencia', 'cirurgia'];
    const routineTypes = ['profilaxia', 'retorno', 'consulta'];
    
    if (urgentTypes.includes(type)) {
      return <Badge variant="destructive">{getVisitTypeLabel(type)}</Badge>;
    }
    if (routineTypes.includes(type)) {
      return <Badge variant="secondary">{getVisitTypeLabel(type)}</Badge>;
    }
    return <Badge>{getVisitTypeLabel(type)}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alergias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {patient.allergies || "Nenhuma alergia registrada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4 text-info" />
              Medicamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {patient.current_medications || "Nenhum medicamento registrado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              Condições Médicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {patient.medical_conditions || "Nenhuma condição registrada"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Histórico de Visitas</h3>
        <Button onClick={handleNewEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      {/* History Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Queixa Principal</TableHead>
                <TableHead>Diagnóstico</TableHead>
                <TableHead>Próxima Consulta</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(entry.visit_date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>{getVisitTypeBadge(entry.visit_type)}</TableCell>
                  <TableCell>
                    <p className="max-w-xs truncate">
                      {entry.chief_complaint || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-xs truncate">
                      {entry.diagnosis || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {entry.next_appointment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.next_appointment), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEntry(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada no histórico
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry ? "Editar Entrada" : "Nova Entrada no Histórico"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Data da Visita *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !visitDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {visitDate ? format(visitDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={visitDate}
                      onSelect={handleVisitDateChange}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Tipo de Visita *</Label>
                <Select
                  value={formData.visit_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, visit_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visitTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="chief_complaint">Queixa Principal</Label>
              <Textarea
                id="chief_complaint"
                value={formData.chief_complaint}
                onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
                placeholder="Descreva a queixa do paciente..."
              />
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Diagnóstico realizado..."
              />
            </div>

            <div>
              <Label htmlFor="treatment_performed">Tratamento Realizado</Label>
              <Textarea
                id="treatment_performed"
                value={formData.treatment_performed}
                onChange={(e) => setFormData(prev => ({ ...prev, treatment_performed: e.target.value }))}
                placeholder="Descreva o tratamento realizado..."
              />
            </div>

            <div>
              <Label htmlFor="treatment_plan">Plano de Tratamento</Label>
              <Textarea
                id="treatment_plan"
                value={formData.treatment_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
                placeholder="Plano para próximas consultas..."
              />
            </div>

            <div>
              <Label>Próxima Consulta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !nextAppointment && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextAppointment ? format(nextAppointment, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar (opcional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={nextAppointment}
                    onSelect={handleNextAppointmentChange}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="dentist_notes">Observações do Dentista</Label>
              <Textarea
                id="dentist_notes"
                value={formData.dentist_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, dentist_notes: e.target.value }))}
                placeholder="Observações adicionais..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}