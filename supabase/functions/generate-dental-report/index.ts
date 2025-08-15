import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

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
  
  // Generate comprehensive HTML content for PDF conversion
  const htmlContent = generateHTMLContent(exam, findings, clinicName, clinicLogo);
  
  // For this implementation, we'll return the HTML as a simple PDF substitute
  // In production, you would integrate with Puppeteer or similar for real PDF generation
  const pdfHeader = createPDFHeader();
  const htmlBytes = new TextEncoder().encode(htmlContent);
  
  // Simple PDF-like structure (in production, use proper PDF library)
  const finalContent = new Uint8Array(pdfHeader.length + htmlBytes.length);
  finalContent.set(pdfHeader);
  finalContent.set(htmlBytes, pdfHeader.length);
  
  return finalContent;
}

function createPDFHeader(): Uint8Array {
  // Simple PDF header - in production, use proper PDF library
  const header = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n";
  return new TextEncoder().encode(header);
}

function generateHTMLContent(exam: any, findings: any[], clinicName: string, clinicLogo?: string): string {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const examDate = new Date(exam.created_at).toLocaleDateString('pt-BR');
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Análise Dental - ${exam.patient_id}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
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
                font-size: 28px;
                margin-bottom: 5px;
            }
            .clinic-info p {
                color: #666;
                font-size: 14px;
            }
            .logo {
                max-height: 80px;
                max-width: 200px;
            }
            .report-title {
                text-align: center;
                color: #1e40af;
                font-size: 24px;
                font-weight: bold;
                margin: 30px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .section {
                margin: 30px 0;
                padding: 20px;
                border-radius: 10px;
                background: #f8fafc;
                border-left: 4px solid #2563eb;
            }
            .section h3 {
                color: #2563eb;
                margin-bottom: 15px;
                font-size: 18px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 15px 0;
            }
            .info-item {
                background: white;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
            }
            .info-label {
                font-weight: bold;
                color: #374151;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .info-value {
                color: #1f2937;
                font-size: 14px;
                margin-top: 4px;
            }
            .findings-section {
                margin: 30px 0;
            }
            .findings-title {
                color: #dc2626;
                font-size: 20px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .finding-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                padding: 20px;
                margin: 15px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .finding-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .finding-type {
                font-weight: bold;
                color: #1e40af;
                font-size: 16px;
            }
            .severity-badge {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
            }
            .severity-leve { background: #fef3c7; color: #92400e; }
            .severity-moderada { background: #fed7aa; color: #ea580c; }
            .severity-severa { background: #fecaca; color: #dc2626; }
            .tooth-info {
                color: #6b7280;
                font-size: 14px;
                margin: 8px 0;
            }
            .confidence {
                color: #059669;
                font-weight: bold;
            }
            .explanation {
                background: #ecfdf5;
                border-left: 4px solid #10b981;
                padding: 15px;
                margin: 15px 0;
                border-radius: 0 8px 8px 0;
            }
            .explanation h4 {
                color: #065f46;
                margin-bottom: 8px;
                font-size: 14px;
            }
            .explanation p {
                color: #064e3b;
                font-size: 13px;
                line-height: 1.5;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin: 25px 0;
            }
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid #e5e7eb;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .stat-number {
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                display: block;
            }
            .stat-label {
                color: #6b7280;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 5px;
            }
            .recommendations {
                background: #fef7ff;
                border-left: 4px solid #a855f7;
                padding: 20px;
                margin: 25px 0;
                border-radius: 0 8px 8px 0;
            }
            .recommendations h4 {
                color: #7c2d12;
                margin-bottom: 12px;
                font-size: 16px;
            }
            .recommendations ul {
                list-style: none;
                padding: 0;
            }
            .recommendations li {
                margin: 8px 0;
                padding-left: 20px;
                position: relative;
                color: #6b21a8;
                font-size: 14px;
            }
            .recommendations li:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #059669;
                font-weight: bold;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 11px;
                line-height: 1.4;
            }
            .warning {
                background: #fffbeb;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }
            .warning h4 {
                color: #92400e;
                margin-bottom: 10px;
                font-size: 16px;
            }
            .warning p {
                color: #78350f;
                font-size: 13px;
                line-height: 1.6;
                margin: 8px 0;
            }
            .no-findings {
                background: #f0fdf4;
                border: 2px solid #22c55e;
                border-radius: 10px;
                padding: 30px;
                text-align: center;
                margin: 25px 0;
            }
            .no-findings h4 {
                color: #15803d;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .no-findings p {
                color: #166534;
                font-size: 14px;
                line-height: 1.6;
            }
            @media print {
                body { print-color-adjust: exact; }
                .section { break-inside: avoid; }
                .finding-card { break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="clinic-info">
                <h1>${clinicName}</h1>
                <p>Relatório de Análise Dental com Inteligência Artificial</p>
                <p>Gerado em: ${currentDate}</p>
            </div>
            ${clinicLogo ? `<img src="${clinicLogo}" alt="Logo da Clínica" class="logo">` : ''}
        </div>

        <h2 class="report-title">Relatório de Análise Radiográfica</h2>

        <div class="section">
            <h3>📋 Informações do Exame</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">ID do Exame</div>
                    <div class="info-value">${exam.id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Paciente</div>
                    <div class="info-value">${exam.patient_id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tipo de Exame</div>
                    <div class="info-value">${getExamTypeLabel(exam.exam_type)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Data do Exame</div>
                    <div class="info-value">${examDate}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">${exam.status === 'completed' ? 'Concluído' : exam.status}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total de Imagens</div>
                    <div class="info-value">${exam.total_images || exam.dental_images?.length || 0}</div>
                </div>
            </div>
        </div>

        ${exam.ai_analysis ? `
        <div class="section">
            <h3>📊 Resumo da Análise</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${exam.ai_analysis.total_findings || findings.length}</span>
                    <div class="stat-label">Total de Achados</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${Math.round((exam.ai_analysis.avg_quality || 8) * 10)}%</span>
                    <div class="stat-label">Qualidade das Imagens</div>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${exam.processed_images || 0}</span>
                    <div class="stat-label">Imagens Processadas</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="findings-section">
            <h3 class="findings-title">🔍 Achados Clínicos Detectados</h3>
            
            ${findings.length === 0 ? `
                <div class="no-findings">
                    <h4>✅ Excelente Notícia!</h4>
                    <p>A análise por inteligência artificial não identificou achados clínicos significativos nas imagens examinadas. Isso indica que suas estruturas dentárias estão em bom estado de conservação.</p>
                    <br>
                    <p><strong>Recomendação:</strong> Continue mantendo uma boa higiene oral e realize consultas preventivas regulares a cada 6 meses.</p>
                </div>
            ` : findings.map((finding: any, index: number) => `
                <div class="finding-card">
                    <div class="finding-header">
                        <div class="finding-type">${getFindingTypeLabel(finding.finding_type)}</div>
                        <div class="severity-badge severity-${finding.severity}">${finding.severity}</div>
                    </div>
                    
                    ${finding.tooth_number ? `<div class="tooth-info">📍 <strong>Localização:</strong> Dente ${finding.tooth_number}</div>` : ''}
                    <div class="tooth-info">🎯 <strong>Confiança da Detecção:</strong> <span class="confidence">${Math.round(finding.confidence * 100)}%</span></div>
                    
                    <div class="tooth-info"><strong>Descrição Técnica:</strong> ${finding.description}</div>
                    
                    <div class="explanation">
                        <h4>💡 Explicação para o Paciente</h4>
                        <p>${getPatientFriendlyExplanation(finding.finding_type, finding.severity)}</p>
                    </div>
                </div>
            `).join('')}
        </div>

        ${exam.ai_analysis?.recommendations && exam.ai_analysis.recommendations.length > 0 ? `
        <div class="recommendations">
            <h4>📋 Recomendações Clínicas</h4>
            <ul>
                ${exam.ai_analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="warning">
            <h4>⚠️ Informações Importantes</h4>
            <p><strong>Este relatório foi gerado por inteligência artificial</strong> e deve ser utilizado como uma ferramenta de apoio diagnóstico. É fundamental que seja avaliado por um profissional dentista qualificado para confirmação dos achados e definição do plano de tratamento mais adequado.</p>
            <p><strong>A análise de IA possui alta precisão</strong>, mas não substitui o exame clínico presencial e a experiência profissional do dentista. Consulte sempre seu dentista de confiança.</p>
        </div>

        <div class="footer">
            <p><strong>Relatório gerado automaticamente pelo Sistema de Análise Dental com IA</strong></p>
            <p>Data e hora de geração: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Este documento é confidencial e destinado exclusivamente ao paciente e profissional responsável pelo tratamento</p>
            <br>
            <p style="font-size: 10px; color: #9ca3af;">
                Sistema desenvolvido com tecnologia de ponta para análise precisa de imagens radiográficas dentais
            </p>
        </div>
    </body>
    </html>
  `;
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