import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock, Eye } from "lucide-react";

interface Exam {
  id: string;
  exam_type: string;
  status: string;
  created_at: string;
  patient: {
    patient_ref: string;
  };
  tenant: {
    name: string;
  };
}

export function AdminSupport() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProblematicExams();
  }, []);

  const loadProblematicExams = async () => {
    try {
      // Get failed or pending exams
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          patients (patient_ref),
          tenants (name)
        `)
        .in('status', ['failed', 'pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setExams(data.map(e => ({
        ...e,
        patient: e.patients?.[0] || { patient_ref: 'Desconhecido' },
        tenant: e.tenants?.[0] || { name: 'Desconhecido' }
      })) as any);
    } catch (error) {
      console.error("Error loading exams:", error);
      toast.error("Erro ao carregar exames");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredExams = exams.filter(e =>
    e.patient.patient_ref.toLowerCase().includes(search.toLowerCase()) ||
    e.tenant.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Carregando exames...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suporte e Troubleshooting</CardTitle>
        <CardDescription>Exames com problemas ou pendentes</CardDescription>
        <div className="mt-4">
          <Input
            placeholder="Buscar por paciente ou clínica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Clínica</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-mono text-xs">
                  {exam.id.slice(0, 8)}...
                </TableCell>
                <TableCell>{exam.tenant.name}</TableCell>
                <TableCell>{exam.patient.patient_ref}</TableCell>
                <TableCell>
                  <Badge variant="outline">{exam.exam_type}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(exam.status)}</TableCell>
                <TableCell>
                  {new Date(exam.created_at).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredExams.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum exame com problemas encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
