import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const examId = url.pathname.split('/')[3]; // Extract examId from /v1/exams/{id}/report.pdf

    if (!examId) {
      throw new Error('Exam ID is required');
    }

    console.log('Generating dental report for exam:', examId);

    // Get exam data with images and findings
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select(`
        *,
        dental_images (
          id,
          original_filename,
          file_path,
          overlay_file_path,
          ai_analysis,
          findings,
          analysis_confidence
        )
      `)
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      throw new Error('Exam not found');
    }

    // Get detailed findings from dental_findings table
    const { data: detailedFindings } = await supabase
      .from('dental_findings')
      .select('*')
      .in('dental_image_id', exam.dental_images?.map((img: any) => img.id) || [])
      .order('tooth_number');

    // Get tenant info for clinic logo/name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', exam.tenant_id)
      .single();

    // Generate PDF content
    const pdfContent = await generatePDFReport({
      exam,
      findings: detailedFindings || [],
      clinicName: tenant?.name || 'Clínica Dental',
      clinicLogo: tenant?.settings?.logo_url
    });

    // Generate unique filename for PDF report
    const reportFileName = `dental-reports/${examId}/report_${Date.now()}.pdf`;

    // Upload PDF to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dental-reports')
      .upload(reportFileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Update exam with report URL
    const { data: reportUrl } = await supabase.storage
      .from('dental-reports')
      .createSignedUrl(reportFileName, 3600 * 24 * 7); // 7 days expiry

    await supabase
      .from('exams')
      .update({ 
        metadata: {
          ...exam.metadata,
          report_file_path: reportFileName,
          report_generated_at: new Date().toISOString()
        }
      })
      .eq('id', examId);

    console.log('Dental report generated successfully:', reportFileName);

    // Return PDF directly
    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_dental_${examId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error in generate-dental-report:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generatePDFReport(data: any): Promise<Uint8Array> {
  const { exam, findings, clinicName, clinicLogo } = data;
  
  // Simple PDF generation using basic structure
  // In production, you'd use a proper PDF library like Puppeteer or jsPDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Análise Dental</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #333;
                line-height: 1.6;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .clinic-info h1 {
                color: #2563eb;
                margin: 0;
                font-size: 28px;
            }
            .clinic-info p {
                margin: 5px 0;
                color: #666;
            }
            .report-title {
                text-align: center;
                color: #1e40af;
                font-size: 24px;
                margin: 30px 0;
                font-weight: bold;
            }
            .exam-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .exam-info h3 {
                color: #2563eb;
                margin-top: 0;
            }
            .findings-section {
                margin: 30px 0;
            }
            .findings-section h3 {
                color: #dc2626;
                border-bottom: 2px solid #dc2626;
                padding-bottom: 10px;
            }
            .finding-item {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .finding-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .finding-type {
                font-weight: bold;
                color: #1e40af;
            }
            .severity {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            }
            .severity.leve {
                background: #fef3c7;
                color: #92400e;
            }
            .severity.moderada {
                background: #fed7aa;
                color: #ea580c;
            }
            .severity.severa {
                background: #fecaca;
                color: #dc2626;
            }
            .tooth-info {
                color: #6b7280;
                font-size: 14px;
                margin: 5px 0;
            }
            .confidence {
                color: #059669;
                font-weight: bold;
            }
            .patient-explanation {
                background: #ecfdf5;
                border-left: 4px solid #10b981;
                padding: 15px;
                margin: 15px 0;
            }
            .patient-explanation h4 {
                color: #065f46;
                margin-top: 0;
            }
            .summary {
                background: #eff6ff;
                border: 1px solid #3b82f6;
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
            }
            .summary h3 {
                color: #1e40af;
                margin-top: 0;
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin: 20px 0;
            }
            .stat-item {
                text-align: center;
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
            }
            .recommendations {
                background: #fef7ff;
                border-left: 4px solid #a855f7;
                padding: 15px;
                margin: 20px 0;
            }
            .recommendations h4 {
                color: #7c2d12;
                margin-top: 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="clinic-info">
                <h1>${clinicName}</h1>
                <p>Relatório de Análise Dental com IA</p>
                <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            ${clinicLogo ? `<img src="${clinicLogo}" alt="Logo" style="max-height: 80px;">` : ''}
        </div>

        <h2 class="report-title">RELATÓRIO DE ANÁLISE RADIOGRÁFICA</h2>

        <div class="exam-info">
            <h3>Informações do Exame</h3>
            <p><strong>ID do Exame:</strong> ${exam.id}</p>
            <p><strong>Paciente:</strong> ${exam.patient_id}</p>
            <p><strong>Tipo de Exame:</strong> ${getExamTypeLabel(exam.exam_type)}</p>
            <p><strong>Data do Exame:</strong> ${new Date(exam.created_at).toLocaleDateString('pt-BR')}</p>
            <p><strong>Status:</strong> ${exam.status === 'completed' ? 'Concluído' : exam.status}</p>
            <p><strong>Total de Imagens:</strong> ${exam.total_images || exam.dental_images?.length || 0}</p>
        </div>

        ${exam.ai_analysis?.avg_quality ? `
        <div class="summary">
            <h3>Resumo da Análise</h3>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">${exam.ai_analysis.total_findings || findings.length}</div>
                    <div>Total de Achados</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${Math.round((exam.ai_analysis.avg_quality || 8) * 10)}%</div>
                    <div>Qualidade das Imagens</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${exam.processed_images || 0}</div>
                    <div>Imagens Processadas</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="findings-section">
            <h3>🔍 Achados Clínicos Detectados</h3>
            
            ${findings.length === 0 ? `
                <div class="patient-explanation">
                    <h4>✅ Excelente Notícia!</h4>
                    <p>A análise por inteligência artificial não identificou achados clínicos significativos nas imagens examinadas. Isso indica que suas estruturas dentárias estão em bom estado de conservação.</p>
                    <p><strong>Recomendação:</strong> Continue mantendo uma boa higiene oral e realize consultas preventivas regulares.</p>
                </div>
            ` : findings.map((finding: any, index: number) => `
                <div class="finding-item">
                    <div class="finding-header">
                        <div class="finding-type">${getFindingTypeLabel(finding.finding_type)}</div>
                        <div class="severity ${finding.severity}">${finding.severity.toUpperCase()}</div>
                    </div>
                    
                    ${finding.tooth_number ? `<div class="tooth-info">📍 <strong>Dente:</strong> ${finding.tooth_number}</div>` : ''}
                    <div class="tooth-info">🎯 <strong>Confiança da Detecção:</strong> <span class="confidence">${Math.round(finding.confidence * 100)}%</span></div>
                    
                    <p><strong>Descrição Técnica:</strong> ${finding.description}</p>
                    
                    <div class="patient-explanation">
                        <h4>💡 Explicação Simplificada</h4>
                        <p>${getPatientFriendlyExplanation(finding.finding_type, finding.severity)}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${exam.ai_analysis?.recommendations && exam.ai_analysis.recommendations.length > 0 ? `
        <div class="recommendations">
            <h4>📋 Recomendações</h4>
            <ul>
                ${exam.ai_analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="patient-explanation">
            <h4>ℹ️ Informações Importantes</h4>
            <p><strong>Este relatório foi gerado por inteligência artificial</strong> e deve ser utilizado como uma ferramenta de apoio diagnóstico. É fundamental que seja avaliado por um profissional dentista qualificado para confirmação dos achados e definição do plano de tratamento mais adequado.</p>
            <p><strong>A análise de IA tem alta precisão</strong>, mas não substitui o exame clínico presencial e a experiência profissional do dentista.</p>
        </div>

        <div class="footer">
            <p>Relatório gerado automaticamente pelo sistema de análise dental com IA</p>
            <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Este documento é confidencial e destinado exclusivamente ao paciente e profissional responsável</p>
        </div>
    </body>
    </html>
  `;

  // Convert HTML to PDF using a simple approach
  // In production, use Puppeteer or similar
  const encoder = new TextEncoder();
  return encoder.encode(htmlContent);
}

function getExamTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'panoramic': 'Radiografia Panorâmica',
    'periapical': 'Radiografia Periapical',
    'bitewing': 'Radiografia Bitewing',
    'cephalometric': 'Radiografia Cefalométrica',
    'cbct': 'Tomografia Computadorizada (CBCT)',
    'radiografia': 'Radiografia Dental'
  };
  return labels[type] || type;
}

function getFindingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'carie': '🦷 Cárie Dental',
    'perda_ossea': '🦴 Perda Óssea Periodontal',
    'restauracao_defeituosa': '🔧 Restauração Defeituosa',
    'calculo': '🪨 Cálculo Dental',
    'gengivite': '🔴 Gengivite',
    'periodontite': '⚠️ Periodontite',
    'impactacao': '⬇️ Dente Impactado',
    'fratura': '💥 Fratura Dental'
  };
  return labels[type] || type;
}

function getPatientFriendlyExplanation(type: string, severity: string): string {
  const explanations: Record<string, Record<string, string>> = {
    'carie': {
      'leve': 'Foi detectada uma pequena cárie no início de formação. Com tratamento simples (restauração), pode ser facilmente resolvida sem dor ou complicações.',
      'moderada': 'Existe uma cárie de tamanho médio que precisa de atenção. O tratamento envolverá limpeza da área afetada e colocação de uma restauração.',
      'severa': 'Foi identificada uma cárie avançada que pode estar próxima ao nervo do dente. Pode ser necessário tratamento de canal além da restauração.'
    },
    'perda_ossea': {
      'leve': 'Há sinais iniciais de perda do osso que sustenta os dentes. Com higiene adequada e limpeza profissional, é possível estabilizar.',
      'moderada': 'Existe perda óssea que requer atenção periodontal. Tratamento gengival especializado pode ajudar a preservar os dentes.',
      'severa': 'A perda óssea está avançada e precisa de tratamento periodontal intensivo para preservar os dentes afetados.'
    },
    'restauracao_defeituosa': {
      'leve': 'Uma restauração antiga apresenta pequenos defeitos. Recomenda-se substituição preventiva para evitar problemas futuros.',
      'moderada': 'A restauração precisa ser substituída, pois pode permitir entrada de bactérias.',
      'severa': 'A restauração está bastante comprometida e requer substituição urgente para evitar cáries secundárias.'
    },
    'calculo': {
      'leve': 'Há pequenos depósitos de tártaro que podem ser removidos com limpeza profissional.',
      'moderada': 'Existe acúmulo de tártaro que requer limpeza profissional mais intensiva.',
      'severa': 'O acúmulo de tártaro é significativo e pode estar afetando a gengiva, necessitando limpeza especializada.'
    }
  };
  
  return explanations[type]?.[severity] || 'Esta condição foi detectada e requer avaliação profissional para determinar o melhor tratamento.';
}