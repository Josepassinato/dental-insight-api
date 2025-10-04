import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Database, FileText, Mail, Users } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();

  return (
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
              Política de Privacidade e Conformidade
            </h1>
            <p className="text-muted-foreground text-lg">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Informações que Coletamos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h3 className="font-semibold mb-2">1.1 Dados Cadastrais</h3>
                <p className="text-muted-foreground">
                  Nome, e-mail, telefone, CNPJ/CPF, endereço da clínica odontológica.
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">1.2 Dados de Saúde (Protegidos)</h3>
                <p className="text-muted-foreground">
                  Imagens radiográficas e tomográficas odontológicas, relatórios de análise gerados pela IA.
                  <strong className="block mt-2">⚠️ Dados sensíveis conforme LGPD (Lei 13.709/2018) e HIPAA (Health Insurance Portability and Accountability Act).</strong>
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">1.3 Dados de Uso</h3>
                <p className="text-muted-foreground">
                  Logs de acesso, endereço IP, navegador utilizado, horários de uso da plataforma.
                </p>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                2. Como Utilizamos seus Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Prestação do serviço:</strong> Processar imagens e gerar relatórios de diagnóstico assistido por IA</li>
                <li><strong>Melhoria da IA:</strong> Treinamento e aprimoramento dos modelos de análise (sempre com dados anonimizados)</li>
                <li><strong>Suporte técnico:</strong> Resolver problemas e melhorar a experiência do usuário</li>
                <li><strong>Comunicação:</strong> Enviar atualizações, novidades e informações sobre o serviço</li>
                <li><strong>Conformidade legal:</strong> Cumprir obrigações legais e regulatórias</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                3. Segurança e Armazenamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h3 className="font-semibold mb-2">3.1 Medidas de Segurança</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Criptografia TLS/SSL em todas as transmissões de dados</li>
                  <li>Armazenamento criptografado (AES-256) para imagens e dados sensíveis</li>
                  <li>Autenticação multifator (MFA) disponível</li>
                  <li>Controle de acesso baseado em função (RBAC)</li>
                  <li>Logs de auditoria para todas as ações na plataforma</li>
                  <li>Backups automáticos e redundância geográfica</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3.2 Retenção de Dados</h3>
                <p className="text-muted-foreground">
                  • <strong>Imagens e relatórios:</strong> Mantidos enquanto a conta estiver ativa + 5 anos após encerramento (conforme legislação odontológica)<br />
                  • <strong>Dados cadastrais:</strong> Mantidos enquanto houver relação contratual<br />
                  • <strong>Logs de sistema:</strong> 12 meses para fins de segurança
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2">3.3 Localização dos Dados</h3>
                <p className="text-muted-foreground">
                  Dados armazenados em servidores seguros (Supabase/Google Cloud) com data centers em conformidade com LGPD e HIPAA.
                </p>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                4. Conformidade Regulatória
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h3 className="font-semibold mb-2">4.1 LGPD (Lei Geral de Proteção de Dados)</h3>
                <p className="text-muted-foreground mb-2">
                  Estamos em total conformidade com a LGPD. Você tem direito a:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Acessar seus dados pessoais</li>
                  <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                  <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                  <li>Revogar consentimento a qualquer momento</li>
                  <li>Obter informações sobre compartilhamento de dados</li>
                  <li>Portabilidade de dados para outro prestador de serviço</li>
                </ul>
              </section>
              <section>
                <h3 className="font-semibold mb-2">4.2 HIPAA (Health Insurance Portability and Accountability Act)</h3>
                <p className="text-muted-foreground">
                  Implementamos controles técnicos e administrativos compatíveis com HIPAA para proteção de informações de saúde protegidas (PHI).
                </p>
              </section>
              <section>
                <h3 className="font-semibold mb-2 text-amber-600">
                  ⚠️ Importante: Ferramenta de Apoio ao Diagnóstico
                </h3>
                <p className="text-muted-foreground border-l-4 border-amber-500 pl-4">
                  <strong>O EXM-AI é uma ferramenta de apoio ao diagnóstico.</strong> A decisão final sobre o diagnóstico e tratamento é sempre de responsabilidade do cirurgião-dentista. 
                  Nosso sistema auxilia na identificação de padrões, mas não substitui o julgamento clínico profissional.
                </p>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                5. Compartilhamento de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground">
                <strong>Não vendemos seus dados.</strong> Compartilhamos informações apenas quando necessário:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Com provedores de infraestrutura (Supabase, Google Cloud) sob rigorosos acordos de confidencialidade</li>
                <li>Para cumprir obrigações legais (ordens judiciais, autoridades competentes)</li>
                <li>Com seu consentimento explícito</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                6. Seus Direitos e Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <h3 className="font-semibold mb-2">Encarregado de Dados (DPO)</h3>
                <p className="text-muted-foreground">
                  Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:
                </p>
                <div className="mt-3 p-4 bg-secondary/50 rounded-lg">
                  <p><strong>E-mail:</strong> <a href="mailto:privacidade@exm-ai.com" className="text-primary hover:underline">privacidade@exm-ai.com</a></p>
                  <p><strong>Telefone:</strong> +55 (11) 99999-9999</p>
                  <p className="text-sm text-muted-foreground mt-2">Responderemos em até 15 dias úteis.</p>
                </div>
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies e Tecnologias Similares</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Utilizamos cookies essenciais para funcionamento da plataforma e cookies analíticos (com seu consentimento) para melhorar a experiência. 
                Você pode gerenciar suas preferências de cookies nas configurações do navegador.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Alterações nesta Política</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas por e-mail ou através da plataforma. 
                Recomendamos revisar esta página regularmente.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-6">
            <Button onClick={() => navigate("/")} size="lg">
              Voltar para Home
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="mailto:privacidade@exm-ai.com">
                Falar com DPO
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
