# Dental AI Platform

Uma plataforma completa para análise de imagens dentais usando inteligência artificial, integrada com Google Cloud Vision API e Vertex AI.

## 🚀 Funcionalidades

- **Análise de Imagens Dentais**: Upload e análise automática usando Google Cloud Vision API
- **Gestão de Pacientes**: Controle completo de histórico e exames
- **Relatórios Inteligentes**: Geração automática de relatórios com IA
- **Integração Vertex AI**: Análise avançada usando modelos Gemini
- **Dashboard Analytics**: Visualização de dados e métricas
- **Autenticação Segura**: Sistema completo de autenticação e autorização

## 🛠️ Tecnologias

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Google Cloud Vision API + Vertex AI (Gemini)
- **Storage**: Supabase Storage
- **Autenticação**: Supabase Auth

## ⚙️ Configuração

### 1. Variáveis de Ambiente

O projeto usa as seguintes configurações do Supabase:

```env
VITE_SUPABASE_PROJECT_ID="blwnzwkkykaobmclsvxg"
VITE_SUPABASE_URL="https://blwnzwkkykaobmclsvxg.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="[chave_publica]"
```

### 2. Configuração Google Cloud

#### Pré-requisitos
1. Projeto no Google Cloud Platform
2. APIs ativadas:
   - Vision API
   - Vertex AI API
3. Service Account com as seguintes roles:
   - `roles/aiplatform.user`
   - `roles/vision.admin` (ou `roles/serviceusage.serviceUsageConsumer`)
   - `roles/storage.objectViewer` (se usar GCS)

#### Configuração de Segredos no Supabase
Configure os seguintes segredos no painel do Supabase:

```
GOOGLE_CLOUD_PROJECT_ID=seu-projeto-id
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 3. Fluxo de Autenticação Google Cloud

A aplicação usa autenticação JWT para acessar APIs do Google Cloud:

1. **Geração JWT**: Assinado com private_key da Service Account
2. **Obtenção Token**: Exchange JWT por access_token via OAuth2
3. **Chamadas API**: Uso do access_token para autenticar requisições

## 🧪 Testes

### Teste Vertex AI via Interface
1. Acesse **Configurações → Integrações**
2. Clique em **"Testar Vertex AI"**
3. Verifique a resposta do modelo Gemini

### Teste via cURL
```bash
curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Teste rápido do Vertex AI"}' \
  https://blwnzwkkykaobmclsvxg.functions.supabase.co/vertex-gemini-test
```

### Teste Edge Function Dental Analysis
```bash
curl -s -X POST \
  -H 'Content-Type: application/json' \
  -d '{"action":"test"}' \
  https://blwnzwkkykaobmclsvxg.functions.supabase.co/dental-analysis-v2
```

## 🔧 Troubleshooting

### Erros Comuns

#### 401 Unauthorized
- **Causa**: Credenciais inválidas ou expiradas
- **Solução**: Verificar Service Account e chaves no Supabase

#### 403 Forbidden
- **Causa**: Permissões insuficientes na Service Account
- **Solução**: Adicionar roles necessárias no IAM

#### 404 Not Found
- **Causa**: Região ou modelo incorretos
- **Solução**: Verificar se `us-central1` e `gemini-1.5-flash-001` estão corretos

#### 400 Bad Request
- **Causa**: Formato de request inválido
- **Solução**: Verificar estrutura JSON do payload

### Logs e Debug

#### Edge Functions Logs
- **Vertex AI**: [Logs vertex-gemini-test](https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/functions/vertex-gemini-test/logs)
- **Dental Analysis**: [Logs dental-analysis-v2](https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/functions/dental-analysis-v2/logs)

#### Verificação de Secrets
- [Painel de Segredos](https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/settings/functions)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
├── pages/              # Páginas da aplicação
├── lib/                # Utilitários e clientes
│   └── vertexClient.ts # Cliente Vertex AI
├── integrations/       # Integrações (Supabase)
└── hooks/              # React hooks customizados

supabase/
├── functions/          # Edge Functions
│   ├── vertex-gemini-test/    # Teste Vertex AI
│   ├── dental-analysis-v2/    # Análise dental
│   └── ...
└── config.toml         # Configuração Supabase
```

## 🚀 Deploy

As Edge Functions são deployadas automaticamente. Para desenvolvimento local:

```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm run dev

# Build para produção
npm run build
```

## 📖 Documentação API

### Vertex AI Edge Function

**Endpoint**: `/vertex-gemini-test`

**Request**:
```json
{
  "prompt": "Seu prompt aqui"
}
```

**Response Success**:
```json
{
  "ok": true,
  "data": {
    "candidates": [{
      "content": {
        "parts": [{"text": "Resposta do modelo"}]
      }
    }]
  }
}
```

**Response Error**:
```json
{
  "ok": false,
  "error": "Mensagem de erro"
}
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.
