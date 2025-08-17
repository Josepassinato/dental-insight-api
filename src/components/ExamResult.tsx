import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  MapPin,
  Lightbulb
} from 'lucide-react';

interface ExamResultProps {
  result: {
    id: string;
    original_filename: string;
    processing_status: string;
    analysis_confidence: number | null;
    findings: any[];
    created_at: string;
    exam?: {
      patient?: {
        patient_ref: string;
      };
    };
  };
}

export function ExamResult({ result }: ExamResultProps) {
  const getFindingTypeLabel = (type: string | undefined | null) => {
    // Handle undefined, null, or empty string cases
    if (!type || typeof type !== 'string') {
      return 'Achado Não Especificado';
    }
    const labels: Record<string, string> = {
      // FASE 1: MODALIDADE CÁRIES
      'caries': 'Cárie',
      'cavity': 'Cavidade',
      'carie': 'Cárie',
      'carie_oclusal': 'Cárie Oclusal',
      'carie_proximal': 'Cárie Proximal',
      'carie_oclusal_profunda': 'Cárie Oclusal Profunda',
      'carie_cervical': 'Cárie Cervical',
      'carie_recorrente': 'Cárie Recorrente',
      
      // FASE 1: MODALIDADE PERIODONTAL
      'periodontal': 'Doença Periodontal',
      'bone_loss': 'Perda Óssea',
      'perda_ossea': 'Perda Óssea',
      'gingivitis': 'Gengivite',
      'calculus': 'Cálculo',
      'calculo': 'Cálculo',
      'gengivite': 'Gengivite',
      'periodontite': 'Periodontite',
      'perda_ossea_horizontal': 'Perda Óssea Horizontal',
      'perda_ossea_vertical': 'Perda Óssea Vertical',
      'envolvimento_furca': 'Envolvimento de Furca',
      
      // FASE 1: MODALIDADE PERIAPICAL
      'periapical': 'Lesão Periapical',
      'periapical_lesion': 'Lesão Periapical',
      'root_canal_issue': 'Problema Endodôntico',
      'lesao_periapical': 'Lesão Periapical',
      'granuloma_periapical': 'Granuloma Periapical',
      'cisto_radicular': 'Cisto Radicular',
      'abscesso_agudo': 'Abscesso Agudo',
      'reabsorcao_radicular': 'Reabsorção Radicular',
      'necrose_pulpar': 'Necrose Pulpar',
      
      // FASE 2: MODALIDADE IMPLANTES
      'implant_analysis': 'Análise de Implante',
      'implant_positioning': 'Posicionamento de Implante',
      'implant_integration': 'Integração de Implante',
      'implant_failure': 'Falha de Implante',
      'bone_density_low': 'Densidade Óssea Baixa',
      'bone_density_adequate': 'Densidade Óssea Adequada',
      'implant_crown_misalignment': 'Desalinhamento da Coroa',
      'peri_implantitis': 'Peri-implantite',
      'implant_loosening': 'Afrouxamento do Implante',
      'sinus_perforation': 'Perfuração do Seio',
      'nerve_proximity': 'Proximidade Neural',
      'implant_angulation_error': 'Erro de Angulação',
      
      // FASE 2: MODALIDADE FRATURAS
      'fracture': 'Fratura',
      'root_fracture': 'Fratura Radicular',
      'crown_fracture': 'Fratura Coronária',
      'enamel_fracture': 'Fratura do Esmalte',
      'vertical_root_fracture': 'Fratura Radicular Vertical',
      'horizontal_root_fracture': 'Fratura Radicular Horizontal',
      'alveolar_fracture': 'Fratura Alveolar',
      'tooth_crack': 'Trinca Dental',
      'craze_lines': 'Linhas de Fratura',
      'split_tooth': 'Dente Rachado',
      
      // FASE 2: MODALIDADE ORTODÔNTICA
      'orthodontic': 'Ortodôntico',
      'malocclusion': 'Má Oclusão',
      'crowding': 'Apinhamento',
      'spacing': 'Espaçamento',
      'overbite': 'Sobremordida',
      'underbite': 'Prognatismo',
      'crossbite': 'Mordida Cruzada',
      'open_bite': 'Mordida Aberta',
      'dental_rotation': 'Rotação Dental',
      'tooth_impaction': 'Impactação Dental',
      'eruption_problem': 'Problema de Erupção',
      'midline_deviation': 'Desvio da Linha Média',
      'bracket_position': 'Posição do Braquete',
      'wire_problems': 'Problemas do Arco',
      'root_resorption_orthodontic': 'Reabsorção Radicular Ortodôntica',
      
      // OUTROS
      'restauracao_defeituosa': 'Restauração Defeituosa',
      'impactacao': 'Impactação',
      'fratura': 'Fratura'
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critico':
      case 'severa':
      case 'falha_integracao':
      case 'classe_iii':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'moderada':
      case 'complicacao':
      case 'classe_ii':
      case 'grau_2':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'leve':
      case 'inicial':
      case 'classe_i':
      case 'grau_1':
      case 'osseointegrado':
      case 'sucesso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'parcialmente_integrado':
      case 'grau_3':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (result.processing_status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusText = () => {
    switch (result.processing_status) {
      case 'completed':
        return 'Análise Concluída';
      case 'failed':
        return 'Falha na Análise';
      case 'processing':
        return 'Processando...';
      default:
        return 'Aguardando Processamento';
    }
  };

  const totalFindings = Array.isArray(result.findings) ? result.findings.length : 0;
  const confidencePercentage = result.analysis_confidence ? Math.round(result.analysis_confidence * 100) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">{result.original_filename}</CardTitle>
              <CardDescription>
                Paciente: {result.exam?.patient?.patient_ref || 'Não identificado'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={result.processing_status === 'completed' ? 'default' : 'secondary'}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confiança da Análise */}
        {result.analysis_confidence && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Confiança da Análise</span>
              </div>
              <span className="text-sm font-medium">{confidencePercentage}%</span>
            </div>
            <Progress value={confidencePercentage} className="h-2" />
          </div>
        )}

        <Separator />

        {/* Resumo dos Achados */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <h3 className="font-medium">Achados Clínicos ({totalFindings})</h3>
          </div>

          {totalFindings === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p>Nenhum achado significativo detectado</p>
              <p className="text-sm">A análise não identificou problemas evidentes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {result.findings.map((finding: any, index: number) => (
                <Card key={index} className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {getFindingTypeLabel(finding.finding_type)}
                        </span>
                      </div>
                      <Badge className={getSeverityColor(finding.clinical_severity || finding.severity)}>
                        {finding.clinical_severity || finding.severity}
                      </Badge>
                    </div>

                    {finding.tooth_number && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Dente:</strong> {finding.tooth_number}
                      </p>
                    )}

                    {finding.precise_location && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Localização:</strong> {finding.precise_location}
                      </p>
                    )}

                    <p className="text-sm text-gray-700 mb-3">
                      {finding.description}
                    </p>

                    {finding.confidence && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Confiança</span>
                          <span>{Math.round(finding.confidence * 100)}%</span>
                        </div>
                        <Progress value={finding.confidence * 100} className="h-1" />
                      </div>
                    )}

                    {finding.clinical_recommendations && Array.isArray(finding.clinical_recommendations) && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Recomendações</span>
                        </div>
                        <ul className="space-y-1">
                          {finding.clinical_recommendations.map((rec: string, recIndex: number) => (
                            <li key={recIndex} className="text-sm text-blue-800">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}