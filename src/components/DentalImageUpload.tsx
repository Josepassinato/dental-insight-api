import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, X, FileImage } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UploadFile extends File {
  id: string;
  preview?: string;
}

interface DentalImageUploadProps {
  onUploadComplete?: (examId: string) => void;
}

export function DentalImageUpload({ onUploadComplete }: DentalImageUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [patientId, setPatientId] = useState('');
  const [examType, setExamType] = useState('radiografia');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      ...file,
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file)
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    // Show preview for images
    newFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, preview: reader.result as string } : f
          ));
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.tiff', '.dcm']
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
      files.forEach(file => {
        formData.append('files', file);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Upload de Imagens Dentais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient and Exam Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">ID do Paciente</Label>
            <Input
              id="patientId"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Digite o ID do paciente"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="examType">Tipo de Exame</Label>
            <Select value={examType} onValueChange={setExamType} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radiografia">Radiografia</SelectItem>
                <SelectItem value="fotografia">Fotografia</SelectItem>
                <SelectItem value="scan">Scan 3D</SelectItem>
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
                Suporte: JPG, PNG, TIFF, DICOM
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
  );
}