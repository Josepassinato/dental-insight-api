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
        `https://blwnzwkkykaobmclsvxg.supabase.co/functions/v1/dental-analysis-v2`,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileImage className="h-5 w-5" />
              <span className="hidden sm:inline">Upload de Imagens Dentais</span>
              <span className="sm:hidden">Upload Dental</span>
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Patient and Exam Info */}
        <div className="space-y-4">
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
          
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold text-foreground">Tipo de Análise Radiográfica</Label>
              <p className="text-sm text-muted-foreground mt-1">Selecione o tipo de exame para análise de IA especializada</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: "panoramic",
                  title: "Radiografia Panorâmica",
                  description: "Análise completa da arcada dentária, ATM e estruturas anatômicas",
                  icon: "🦷"
                },
                {
                  value: "periapical",
                  title: "Periapical",
                  description: "Análise detalhada da raiz dentária e região periapical",
                  icon: "🔍"
                },
                {
                  value: "bitewing",
                  title: "Bitewing (Interproximal)",
                  description: "Detecção de cáries proximais e nível ósseo alveolar",
                  icon: "📏"
                },
                {
                  value: "cephalometric",
                  title: "Cefalométrica",
                  description: "Análise ortodôntica e cefalométrica",
                  icon: "📐"
                },
                {
                  value: "cbct",
                  title: "CBCT / Tomografia",
                  description: "Análise 3D para implantes, cirurgias e endodontia",
                  icon: "🏗️"
                }
              ].map((option) => (
                <div
                  key={option.value}
                  className={`relative cursor-pointer rounded-lg border-2 p-3 sm:p-4 transition-all duration-200 hover:shadow-md ${
                    examType === option.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => !uploading && setExamType(option.value)}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className="text-xl sm:text-2xl flex-shrink-0">{option.icon}</div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground text-sm sm:text-base">{option.title}</h3>
                        {examType === option.value && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
                    </div>
                  </div>
                  
                  <input
                    type="radio"
                    name="examType"
                    value={option.value}
                    checked={examType === option.value}
                    onChange={() => setExamType(option.value)}
                    className="absolute top-3 sm:top-4 right-3 sm:right-4 h-4 w-4 text-primary focus:ring-primary"
                    disabled={uploading}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm sm:text-base">Solte as imagens aqui...</p>
          ) : (
            <div>
              <p className="text-base sm:text-lg font-medium mb-1 sm:mb-2">
                <span className="hidden sm:inline">Arraste e solte imagens ou clique para selecionar</span>
                <span className="sm:hidden">Toque para selecionar imagens</span>
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Suporte: JPG, PNG, WEBP
              </p>
            </div>
          )}
        </div>

        {/* File Preview */}
        {files.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-medium text-sm sm:text-base">Imagens Selecionadas ({files.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
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
                        <FileImage className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-destructive text-destructive-foreground opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center touch-manipulation"
                    disabled={uploading}
                  >
                    <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </button>
                  <p className="text-xs text-center mt-1 truncate px-1" title={file.name}>
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
          className="w-full min-h-[48px] touch-manipulation"
          size="lg"
        >
          <span className="text-sm sm:text-base">
            {uploading ? 'Fazendo Upload...' : `Fazer Upload (${files.length} imagem${files.length !== 1 ? 's' : ''})`}
          </span>
        </Button>
      </CardContent>
    </Card>
    </div>
  );
}