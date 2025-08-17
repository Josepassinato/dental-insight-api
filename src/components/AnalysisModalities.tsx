import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Circle, 
  Bone, 
  Heart,
  Wrench,
  Zap,
  Triangle,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface AnalysisModalitiesProps {
  findings: any[];
  examType?: string;
}

export function AnalysisModalities({ findings, examType }: AnalysisModalitiesProps) {
  // Categorizar achados por modalidade (FASE 2 - 6 modalidades)
  const categorizeFindings = (findings: any[]) => {
    const cariesTypes = ['caries', 'cavity', 'carie', 'carie_oclusal', 'carie_proximal', 'carie_oclusal_profunda', 'carie_cervical', 'carie_recorrente'];
    const periodontalTypes = ['periodontal', 'bone_loss', 'perda_ossea', 'gingivitis', 'calculus', 'calculo', 'gengivite', 'periodontite', 'perda_ossea_horizontal', 'perda_ossea_vertical', 'envolvimento_furca'];
    const periapicalTypes = ['periapical', 'periapical_lesion', 'root_canal_issue', 'lesao_periapical', 'granuloma_periapical', 'cisto_radicular', 'abscesso_agudo', 'reabsorcao_radicular', 'necrose_pulpar'];
    const implantTypes = ['implant_analysis', 'implant_positioning', 'implant_integration', 'implant_failure', 'bone_density_low', 'bone_density_adequate', 'implant_crown_misalignment', 'peri_implantitis', 'implant_loosening', 'sinus_perforation', 'nerve_proximity', 'implant_angulation_error'];
    const fractureTypes = ['fracture', 'root_fracture', 'crown_fracture', 'enamel_fracture', 'vertical_root_fracture', 'horizontal_root_fracture', 'alveolar_fracture', 'tooth_crack', 'craze_lines', 'split_tooth'];
    const orthodonticTypes = ['orthodontic', 'malocclusion', 'crowding', 'spacing', 'overbite', 'underbite', 'crossbite', 'open_bite', 'dental_rotation', 'tooth_impaction', 'eruption_problem', 'midline_deviation', 'bracket_position', 'wire_problems', 'root_resorption_orthodontic'];

    return {
      caries: findings.filter(f => cariesTypes.includes(f.finding_type)),
      periodontal: findings.filter(f => periodontalTypes.includes(f.finding_type)),
      periapical: findings.filter(f => periapicalTypes.includes(f.finding_type)),
      implants: findings.filter(f => implantTypes.includes(f.finding_type)),
      fractures: findings.filter(f => fractureTypes.includes(f.finding_type)),
      orthodontics: findings.filter(f => orthodonticTypes.includes(f.finding_type))
    };
  };

  const categorized = categorizeFindings(findings);

  const getModalityStatus = (modalityFindings: any[]) => {
    if (modalityFindings.length === 0) return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
    
    const severityCount = modalityFindings.reduce((acc, f) => {
      const severity = f.clinical_severity || f.severity || 'leve';
      acc[severity.toLowerCase()] = (acc[severity.toLowerCase()] || 0) + 1;
      return acc;
    }, {});

    if (severityCount.severa || severityCount.critico || severityCount.falha_integracao) {
      return { status: 'crítico', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (severityCount.moderada || severityCount.complicacao || severityCount.classe_ii || severityCount.classe_iii) {
      return { status: 'atenção', color: 'text-orange-600', bg: 'bg-orange-50' };
    } else {
      return { status: 'leve', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
  };

  const getAverageConfidence = (modalityFindings: any[]) => {
    if (modalityFindings.length === 0) return 0;
    const total = modalityFindings.reduce((sum, f) => sum + (f.confidence || 0), 0);
    return Math.round((total / modalityFindings.length) * 100);
  };

  const modalityData = [
    {
      title: 'Análise de Cáries',
      description: 'Detecção de lesões cariosas',
      icon: Circle,
      iconColor: 'text-red-600',
      findings: categorized.caries,
      status: getModalityStatus(categorized.caries),
      confidence: getAverageConfidence(categorized.caries),
      phase: 1
    },
    {
      title: 'Análise Periodontal',
      description: 'Avaliação de saúde gengival e óssea',
      icon: Bone,
      iconColor: 'text-orange-600',
      findings: categorized.periodontal,
      status: getModalityStatus(categorized.periodontal),
      confidence: getAverageConfidence(categorized.periodontal),
      phase: 1
    },
    {
      title: 'Lesões Periapicais',
      description: 'Detecção de patologias endodônticas',
      icon: Heart,
      iconColor: 'text-purple-600',
      findings: categorized.periapical,
      status: getModalityStatus(categorized.periapical),
      confidence: getAverageConfidence(categorized.periapical),
      phase: 1
    },
    {
      title: 'Análise de Implantes',
      description: 'Avaliação de implantes e osseointegração',
      icon: Wrench,
      iconColor: 'text-cyan-600',
      findings: categorized.implants,
      status: getModalityStatus(categorized.implants),
      confidence: getAverageConfidence(categorized.implants),
      phase: 2
    },
    {
      title: 'Detecção de Fraturas',
      description: 'Identificação de fraturas dentais',
      icon: Zap,
      iconColor: 'text-pink-600',
      findings: categorized.fractures,
      status: getModalityStatus(categorized.fractures),
      confidence: getAverageConfidence(categorized.fractures),
      phase: 2
    },
    {
      title: 'Análise Ortodôntica',
      description: 'Avaliação de má oclusão e alinhamento',
      icon: Triangle,
      iconColor: 'text-blue-600',
      findings: categorized.orthodontics,
      status: getModalityStatus(categorized.orthodontics),
      confidence: getAverageConfidence(categorized.orthodontics),
      phase: 2
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Análise Hexa-Modal Avançada - Fase 2</h2>
        <p className="text-sm text-muted-foreground">
          Sistema completo com 6 modalidades especializadas: Cáries, Periodontal, Periapical, Implantes, Fraturas e Ortodontia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modalityData.map((modality, index) => {
          const Icon = modality.icon;
          return (
            <Card key={index} className={`${modality.status.bg} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${modality.iconColor}`} />
                  <div>
                    <CardTitle className="text-base">{modality.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {modality.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status da Modalidade */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    {modality.findings.length === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className={`h-4 w-4 ${modality.status.color}`} />
                    )}
                    <Badge 
                      variant="secondary"
                      className={`${modality.status.color} ${modality.status.bg}`}
                    >
                      {modality.findings.length === 0 ? 'Normal' : modality.status.status}
                    </Badge>
                  </div>
                </div>

                {/* Quantidade de Achados */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Achados:</span>
                  <span className={`text-sm font-bold ${modality.status.color}`}>
                    {modality.findings.length}
                  </span>
                </div>

                {/* Confiança Média */}
                {modality.confidence > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium">Confiança</span>
                      </div>
                      <span className="text-xs font-medium">{modality.confidence}%</span>
                    </div>
                    <Progress value={modality.confidence} className="h-1" />
                  </div>
                )}

                {/* Lista Resumida de Achados */}
                {modality.findings.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-600">Principais achados:</span>
                    <div className="space-y-1">
                      {modality.findings.slice(0, 2).map((finding, idx) => (
                        <div key={idx} className="text-xs text-gray-700">
                          • {finding.tooth_number ? `Dente ${finding.tooth_number}` : 'Localização geral'}
                          {finding.clinical_severity && (
                            <Badge 
                              variant="outline" 
                              className="ml-1 text-xs h-4 px-1"
                            >
                              {finding.clinical_severity}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {modality.findings.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{modality.findings.length - 2} outros achados
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumo Geral Hexa-Modal */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">Resumo da Análise Hexa-Modal - Fase 2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {findings.length}
              </div>
              <div className="text-xs text-blue-700">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {categorized.caries.length}
              </div>
              <div className="text-xs text-red-700">Cáries</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {categorized.periodontal.length}
              </div>
              <div className="text-xs text-orange-700">Periodontal</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {categorized.periapical.length}
              </div>
              <div className="text-xs text-purple-700">Periapical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-600">
                {categorized.implants.length}
              </div>
              <div className="text-xs text-cyan-700">Implantes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-600">
                {categorized.fractures.length}
              </div>
              <div className="text-xs text-pink-700">Fraturas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {categorized.orthodontics.length}
              </div>
              <div className="text-xs text-blue-600">Ortodontia</div>
            </div>
          </div>
          
          {/* Badges de Fase */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-center gap-4">
              <Badge variant="outline" className="text-xs">
                Fase 1: {categorized.caries.length + categorized.periodontal.length + categorized.periapical.length} achados
              </Badge>
              <Badge variant="outline" className="text-xs">
                Fase 2: {categorized.implants.length + categorized.fractures.length + categorized.orthodontics.length} achados
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}