import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Shield, Lock, Server, AlertTriangle, CheckCircle2, FileKey, Eye } from "lucide-react";

const Security = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Segurança | EXM-AI</title>
        <meta name="description" content="Infraestrutura de segurança da EXM-AI: criptografia, compliance LGPD/HIPAA, backups e controles de acesso para proteção de dados odontológicos." />
        <link rel="canonical" href="https://www.exm-ai.com/security" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
            aria-label="Voltar para página inicial"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="space-y-8">
            <header>
              <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                <Shield className="h-10 w-10 text-primary" />
                Segurança e Infraestrutura
              </h1>
              <p className="text-muted-foreground text-lg">
                Proteção de dados odontológicos com os mais altos padrões de segurança da indústria
              </p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  1. Criptografia de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Em Trânsito
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-6">
                    <li><strong>TLS 1.3:</strong> Todas as comunicações entre cliente e servidor usam criptografia TLS 1.3</li>
                    <li><strong>HTTPS obrigatório:</strong> Certificado SSL/TLS válido em todos os endpoints</li>
                    <li><strong>HSTS ativado:</strong> Strict-Transport-Security para prevenir downgrade attacks</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Em Repouso
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-6">
                    <li><strong>AES-256:</strong> Imagens DICOM e radiografias armazenadas com criptografia AES-256</li>
                    <li><strong>Banco de dados criptografado:</strong> Dados sensíveis criptografados em nível de coluna</li>
                    <li><strong>Chaves gerenciadas:</strong> Key Management Service (KMS) para rotação automática de chaves</li>
                  </ul>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  2. Infraestrutura e Disponibilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2">Hospedagem</h3>
                  <p className="text-muted-foreground mb-2">
                    • <strong>Supabase + Google Cloud Platform:</strong> Infraestrutura tier-1 com SLA de 99.9%<br />
                    • <strong>Redundância geográfica:</strong> Dados replicados em múltiplas regiões<br />
                    • <strong>Data centers:</strong> Certificados ISO 27001, SOC 2 Type II
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Backups</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-6">
                    <li>Backups automáticos diários com retenção de 30 dias</li>
                    <li>Backups incrementais a cada 6 horas</li>
                    <li>Point-in-time recovery (PITR) disponível</li>
                    <li>Testes de restauração mensais</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Monitoramento 24/7</h3>
                  <p className="text-muted-foreground">
                    Sistema de alertas em tempo real para anomalias de segurança, performance degradada ou tentativas de acesso não autorizado.
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileKey className="h-5 w-5" />
                  3. Controle de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2">Autenticação</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-6">
                    <li><strong>Autenticação Multifator (MFA):</strong> Disponível via e-mail/SMS/app autenticador</li>
                    <li><strong>OAuth 2.0:</strong> Login seguro via Google</li>
                    <li><strong>Políticas de senha:</strong> Mínimo 8 caracteres, complexidade obrigatória</li>
                    <li><strong>Expiração de sessão:</strong> Logout automático após 24h de inatividade</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Autorização (RBAC)</h3>
                  <p className="text-muted-foreground mb-2">
                    Role-Based Access Control com três níveis:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-6">
                    <li><strong>Admin:</strong> Acesso total à conta, gerenciamento de usuários</li>
                    <li><strong>Dentista:</strong> Upload de imagens, visualização de relatórios, gestão de pacientes</li>
                    <li><strong>Visualizador:</strong> Somente leitura de exames e relatórios</li>
                  </ul>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  4. Auditoria e Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2">Registros de Atividade</h3>
                  <p className="text-muted-foreground mb-2">
                    Todos os eventos são registrados e podem ser auditados:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-6">
                    <li>Login/logout de usuários (com IP e timestamp)</li>
                    <li>Upload e visualização de imagens</li>
                    <li>Geração de relatórios</li>
                    <li>Alterações de configuração</li>
                    <li>Tentativas de acesso negado</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Retenção de Logs</h3>
                  <p className="text-muted-foreground">
                    • <strong>Logs de segurança:</strong> 12 meses<br />
                    • <strong>Logs de acesso:</strong> 6 meses<br />
                    • <strong>Logs de sistema:</strong> 3 meses
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  5. Compliance e Certificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2">LGPD (Lei Geral de Proteção de Dados)</h3>
                  <p className="text-muted-foreground">
                    ✅ Conformidade total com LGPD brasileira (Lei 13.709/2018)<br />
                    ✅ Mapeamento de fluxo de dados pessoais<br />
                    ✅ Relatório de Impacto à Proteção de Dados (RIPD) disponível<br />
                    ✅ Encarregado de Dados (DPO) designado
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">HIPAA (Health Insurance Portability and Accountability Act)</h3>
                  <p className="text-muted-foreground">
                    ✅ Controles técnicos compatíveis com HIPAA<br />
                    ✅ Business Associate Agreement (BAA) disponível<br />
                    ✅ Segurança de PHI (Protected Health Information)<br />
                    ✅ Procedimentos de notificação de violação
                  </p>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">ISO 27001</h3>
                  <p className="text-muted-foreground">
                    Infraestrutura hospedada em data centers certificados ISO 27001 (Segurança da Informação) e SOC 2 Type II.
                  </p>
                </section>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  6. Resposta a Incidentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2">Plano de Resposta</h3>
                  <p className="text-muted-foreground">
                    Mantemos um plano documentado de resposta a incidentes de segurança:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-6">
                    <li><strong>Detecção:</strong> Monitoramento contínuo e alertas automáticos</li>
                    <li><strong>Contenção:</strong> Isolamento imediato de sistemas afetados</li>
                    <li><strong>Investigação:</strong> Análise forense para identificar causa raiz</li>
                    <li><strong>Notificação:</strong> Comunicação aos clientes afetados em até 72 horas (conforme LGPD)</li>
                    <li><strong>Remediação:</strong> Correção de vulnerabilidades e restauração de serviços</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-semibold mb-2">Contato de Emergência</h3>
                  <div className="mt-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-300">
                    <p><strong>E-mail de Segurança:</strong> <a href="mailto:security@exm-ai.com" className="text-primary hover:underline">security@exm-ai.com</a></p>
                    <p><strong>Telefone 24/7:</strong> +55 (11) 99999-9999</p>
                    <p className="text-sm text-muted-foreground mt-2">Resposta em até 2 horas para incidentes críticos</p>
                  </div>
                </section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. Segurança de Aplicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>WAF (Web Application Firewall):</strong> Proteção contra ataques OWASP Top 10</li>
                  <li><strong>DDoS Protection:</strong> Mitigação de ataques de negação de serviço</li>
                  <li><strong>Rate Limiting:</strong> Prevenção de abuso e força bruta</li>
                  <li><strong>Input Validation:</strong> Sanitização de todas as entradas de usuário</li>
                  <li><strong>SQL Injection Protection:</strong> Queries parametrizadas e ORM seguro</li>
                  <li><strong>XSS Prevention:</strong> Content Security Policy (CSP) ativo</li>
                  <li><strong>CSRF Protection:</strong> Tokens anti-CSRF em todas as requisições</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Testes e Auditorias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground mb-2">
                  Realizamos testes regulares de segurança:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Pentests:</strong> Testes de penetração trimestrais por empresa terceirizada</li>
                  <li><strong>Vulnerability Scanning:</strong> Varreduras semanais automatizadas</li>
                  <li><strong>Code Review:</strong> Revisão de código com foco em segurança antes de cada deploy</li>
                  <li><strong>Dependency Scanning:</strong> Verificação diária de vulnerabilidades em bibliotecas</li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex gap-4 pt-6">
              <Button onClick={() => navigate("/")} size="lg">
                Voltar para Home
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="mailto:security@exm-ai.com">
                  Relatar Vulnerabilidade
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Security;
