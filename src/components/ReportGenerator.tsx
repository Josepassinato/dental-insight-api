import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, FileText, Download, RefreshCw, Settings, Eye, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Exam {
  id: string;
  patient?: {
    patient_ref: string;
  };
  metadata?: any;
}

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  template_data: any;
  is_default: boolean;
}

interface ReportGeneratorProps {
  exam: Exam;
  onReportGenerated?: (reportUrl: string) => void;
}

export function ReportGenerator({ exam, onReportGenerated }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(
    exam?.metadata?.report_generated_at || null
  );
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customizations, setCustomizations] = useState({
    showImages: true,
    showFindings: true,
    showConfidence: true,
    showOverlays: true,
    showPatientInfo: true,
    showInsurance: false,
    showSignature: true,
    clinicName: '',
    dentistName: '',
    croNumber: '',
    customNotes: ''
  });
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      
      setTemplates(data || []);
      
      // Select default template if available
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.id);
        loadTemplateCustomizations(defaultTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadTemplateCustomizations = (template: ReportTemplate) => {
    const templateData = template.template_data;
    setCustomizations({
      showImages: templateData.exam_section?.show_images ?? true,
      showFindings: templateData.exam_section?.show_findings ?? true,
      showConfidence: templateData.exam_section?.show_confidence ?? true,
      showOverlays: templateData.exam_section?.show_overlays ?? true,
      showPatientInfo: templateData.patient_section?.show_patient_info ?? true,
      showInsurance: templateData.patient_section?.show_insurance ?? false,
      showSignature: templateData.footer?.show_signature ?? true,
      clinicName: templateData.header?.clinic_name?.replace('{{clinic_name}}', '') || '',
      dentistName: templateData.footer?.signature_text?.replace('Dr. {{dentist_name}}', '').replace('Dr. ', '') || '',
      croNumber: templateData.footer?.cro_number?.replace('{{cro_number}}', '') || '',
      customNotes: ''
    });
  };

  const generateReport = async () => {
    if (!selectedTemplate) {
      toast.error("Selecione um template antes de gerar o relatório");
      return;
    }

    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { 
          examId: exam.id,
          templateId: selectedTemplate,
          customizations: customizations
        }
      });

      if (error) throw error;

      if (data?.reportUrl) {
        setReportUrl(data.reportUrl);
        setLastGenerated(new Date().toISOString());
        
        toast.success("Relatório gerado com sucesso!");
        
        if (onReportGenerated) {
          onReportGenerated(data.reportUrl);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  const previewReport = () => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Gerador de Relatórios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Template do Relatório</Label>
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={(value) => {
              setSelectedTemplate(value);
              const template = templates.find(t => t.id === value);
              if (template) loadTemplateCustomizations(template);
            }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Personalizar Relatório</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Conteúdo</TabsTrigger>
                    <TabsTrigger value="header">Cabeçalho</TabsTrigger>
                    <TabsTrigger value="signature">Assinatura</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showImages">Mostrar Imagens</Label>
                        <Switch
                          id="showImages"
                          checked={customizations.showImages}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showImages: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showFindings">Mostrar Achados</Label>
                        <Switch
                          id="showFindings"
                          checked={customizations.showFindings}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showFindings: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showConfidence">Mostrar Confiança</Label>
                        <Switch
                          id="showConfidence"
                          checked={customizations.showConfidence}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showConfidence: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showOverlays">Mostrar Overlays</Label>
                        <Switch
                          id="showOverlays"
                          checked={customizations.showOverlays}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showOverlays: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showPatientInfo">Info do Paciente</Label>
                        <Switch
                          id="showPatientInfo"
                          checked={customizations.showPatientInfo}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showPatientInfo: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showInsurance">Mostrar Convênio</Label>
                        <Switch
                          id="showInsurance"
                          checked={customizations.showInsurance}
                          onCheckedChange={(checked) => 
                            setCustomizations(prev => ({ ...prev, showInsurance: checked }))
                          }
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="customNotes">Observações Personalizadas</Label>
                      <Textarea
                        id="customNotes"
                        value={customizations.customNotes}
                        onChange={(e) => setCustomizations(prev => ({ ...prev, customNotes: e.target.value }))}
                        placeholder="Adicione observações que aparecerão no relatório..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="header" className="space-y-4">
                    <div>
                      <Label htmlFor="clinicName">Nome da Clínica</Label>
                      <Input
                        id="clinicName"
                        value={customizations.clinicName}
                        onChange={(e) => setCustomizations(prev => ({ ...prev, clinicName: e.target.value }))}
                        placeholder="Nome da sua clínica"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="signature" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showSignature">Incluir Assinatura</Label>
                      <Switch
                        id="showSignature"
                        checked={customizations.showSignature}
                        onCheckedChange={(checked) => 
                          setCustomizations(prev => ({ ...prev, showSignature: checked }))
                        }
                      />
                    </div>
                    
                    {customizations.showSignature && (
                      <>
                        <div>
                          <Label htmlFor="dentistName">Nome do Dentista</Label>
                          <Input
                            id="dentistName"
                            value={customizations.dentistName}
                            onChange={(e) => setCustomizations(prev => ({ ...prev, dentistName: e.target.value }))}
                            placeholder="Dr(a). Seu Nome"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="croNumber">Número do CRO</Label>
                          <Input
                            id="croNumber"
                            value={customizations.croNumber}
                            onChange={(e) => setCustomizations(prev => ({ ...prev, croNumber: e.target.value }))}
                            placeholder="CRO-SP 12345"
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {lastGenerated && (
          <div className="text-sm text-muted-foreground">
            Último relatório: {new Date(lastGenerated).toLocaleString('pt-BR')}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={generateReport} 
            disabled={generating || !selectedTemplate}
            className="flex-1"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {reportUrl ? 'Regenerar' : 'Gerar'} Relatório
              </>
            )}
          </Button>
          
          {reportUrl && (
            <>
              <Button 
                variant="outline" 
                onClick={previewReport}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                onClick={downloadReport}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}