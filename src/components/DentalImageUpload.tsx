import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, X, FileImage, User, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UploadFile extends File {
  id: string;
  preview?: string;
}

interface DentalImageUploadProps {
  onUploadComplete?: (examId: string) => void;
  onClose?: () => void;
}

interface Patient {
  id: string;
  patient_ref: string;
  age?: number;
  cpf?: string;
}

export function DentalImageUpload({ onUploadComplete, onClose }: DentalImageUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [patientId, setPatientId] = useState('');
  const [examType, setExamType] = useState('panoramic');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  // Carregar pacientes
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, patient_ref, age, cpf')
          .order('patient_ref');

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
      }
    };

    loadPatients();
  }, []);

  // Filtrar pacientes com base na busca
  const filteredPatients = patients.filter(patient => 
    patient.patient_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectPatient = (patient: Patient) => {
    setPatientId(patient.id);
    setSearchTerm(patient.patient_ref);
    setShowPatientList(false);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => {
      const f = file as UploadFile;
      f.id = crypto.randomUUID();
      f.preview = URL.createObjectURL(file);
      return f;
    });
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    multiple: true
  });


  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleUpload = async () => {
    if (!patientId.trim()) {
      toast.error('ID do paciente é obrigatório');
      return;
    }

    if (files.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get current user and tenant info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('Perfil de usuário não encontrado');
      }

      // Prepare form data
      const formData = new FormData();
      files.forEach((file, i) => {
        formData.append('files', file, file.name || `image-${i + 1}.jpg`);
      });
      formData.append('patientId', patientId);
      formData.append('examType', examType);
      formData.append('tenantId', profile.tenant_id);

      // Upload files
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://blwnzwkkykaobmclsvxg.supabase.co/functions/v1/process-dental-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro no upload');
      }

      const result = await response.json();
      
      setUploadProgress(100);
      toast.success(`Upload concluído! ${result.uploadedImages} imagens processadas.`);
      
      // Clear form
      setFiles([]);
      setPatientId('');
      setUploadProgress(0);
      
      // Notify parent component
      if (onUploadComplete && result.examId) {
        onUploadComplete(result.examId);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Erro no upload: ${error.message}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              Upload de Imagens Dentais
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient and Exam Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <Label htmlFor="patientSearch">Selecionar Paciente</Label>
            <div className="relative">
              <Input
                id="patientSearch"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowPatientList(true);
                }}
                onFocus={() => setShowPatientList(true)}
                placeholder="Buscar por nome, CPF ou ID..."
                disabled={uploading}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Lista de pacientes */}
            {showPatientList && searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => selectPatient(patient)}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{patient.patient_ref}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ID: {patient.id.slice(0, 8)}...</span>
                            {patient.age && <span>• {patient.age} anos</span>}
                            {patient.cpf && <span>• {patient.cpf}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Nenhum paciente encontrado
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="examType">Tipo de Exame</Label>
            <Select value={examType} onValueChange={setExamType} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="panoramic">Radiografia Panorâmica</SelectItem>
                <SelectItem value="periapical">Periapical</SelectItem>
                <SelectItem value="bitewing">Bitewing (Interproximal)</SelectItem>
                <SelectItem value="cephalometric">Cefalométrica</SelectItem>
                <SelectItem value="cbct">CBCT / Tomografia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p>Solte as imagens aqui...</p>
          ) : (
            <div>
              <p className="text-lg font-medium mb-2">
                Arraste e solte imagens ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Suporte: JPG, PNG, WEBP
              </p>
            </div>
          )}
        </div>

        {/* File Preview */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Imagens Selecionadas ({files.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    disabled={uploading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-xs text-center mt-1 truncate" title={file.name}>
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fazendo upload...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0 || !patientId.trim()}
          className="w-full"
          size="lg"
        >
          {uploading ? 'Fazendo Upload...' : `Fazer Upload (${files.length} imagem${files.length !== 1 ? 's' : ''})`}
        </Button>
      </CardContent>
    </Card>
    </div>
  );
}