import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  ArrowLeft,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Heart,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { PatientForm } from "@/components/PatientForm";
import { PatientHistory } from "@/components/PatientHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Patient {
  id: string;
  patient_ref: string;
  age?: number;
  gender?: string;
  cpf?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  allergies?: string;
  current_medications?: string;
  medical_conditions?: string;
  last_visit?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const Patients = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setSession(session);
      setUser(session.user);
      await loadPatients();
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      } else {
        setSession(session);
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPatients(data || []);
      setFilteredPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error("Erro ao carregar pacientes");
    }
  };

  // Filter patients based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient => 
      patient.patient_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredPatients(filtered);
  }, [patients, searchTerm]);

  const handlePatientSaved = () => {
    setShowForm(false);
    setSelectedPatient(null);
    loadPatients();
    toast.success("Paciente salvo com sucesso!");
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowForm(true);
  };

  const handleViewHistory = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowHistory(true);
  };

  const getStatusBadge = (patient: Patient) => {
    const hasUrgentConditions = patient.medical_conditions?.toLowerCase().includes('urgente') ||
                              patient.allergies?.toLowerCase().includes('grave');
    
    if (hasUrgentConditions) {
      return <Badge variant="destructive" className="text-xs">Atenção</Badge>;
    }
    
    if (patient.last_visit) {
      const lastVisit = new Date(patient.last_visit);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (lastVisit < sixMonthsAgo) {
        return <Badge variant="outline" className="text-xs">Revisão</Badge>;
      }
    }
    
    return <Badge variant="secondary" className="text-xs">Ativo</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <UserIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Gestão de Pacientes</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredPatients.length} pacientes cadastrados
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Última Visita</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                     <TableCell>
                       <div className="flex flex-col">
                         <span className="font-medium">{patient.patient_ref}</span>
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                           <span className="font-mono text-xs">ID: {patient.id.slice(0, 8)}...</span>
                           {patient.age && <span>• {patient.age} anos</span>}
                           {patient.gender && <span>• {patient.gender}</span>}
                           {patient.cpf && <span>• {patient.cpf}</span>}
                         </div>
                       </div>
                     </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {patient.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </div>
                        )}
                        {patient.insurance_provider && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {patient.insurance_provider}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.city && patient.state && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {patient.city}, {patient.state}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.last_visit ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(patient.last_visit), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(patient)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(patient)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPatient(patient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Patient Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPatient ? "Editar Paciente" : "Novo Paciente"}
            </DialogTitle>
          </DialogHeader>
          <PatientForm
            patient={selectedPatient}
            onSaved={handlePatientSaved}
            onCancel={() => {
              setShowForm(false);
              setSelectedPatient(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Patient History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Histórico do Paciente - {selectedPatient?.patient_ref}
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <PatientHistory
              patient={selectedPatient}
              onClose={() => setShowHistory(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients;