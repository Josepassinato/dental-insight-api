# Dental Analysis - Google Cloud Platform Infrastructure

This directory contains the complete infrastructure setup for migrating the dental analysis system to Google Cloud Platform (GCP).

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dental SDK    │────│  Cloud Run       │────│  Cloud Storage  │
│   (Frontend)    │    │  (Gateway API)   │    │  (Images)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │     Pub/Sub      │────│  Cloud Run      │
                       │   (Message       │    │  (AI Worker)    │
                       │    Queue)        │    │                 │
                       └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             ▼
                       │  Cloud SQL       │    ┌─────────────────┐
                       │  (Database)      │◄───│   Vertex AI     │
                       │                  │    │ (ML Inference)  │
                       └──────────────────┘    └─────────────────┘
```

## Components

### 1. Dental Gateway (`dental-gateway/`)
- **Technology**: FastAPI (Python)
- **Purpose**: Main API gateway compatible with existing SDK
- **Endpoints**:
  - `POST /functions/v1/upload-exam-api` - File upload (SDK compatible)
  - `GET /embed/viewer/{exam_id}` - Embedded viewer (SDK compatible)
  - `GET /api/exam/{exam_id}` - Exam data API
  - `GET /health` - Health check

### 2. Inference Worker (`inference-worker/`)
- **Technology**: Python with Vertex AI
- **Purpose**: Async processing of dental images
- **Features**:
  - Vertex AI integration for ML inference
  - Mock analysis for development/testing
  - Overlay generation with annotations
  - Database result storage

### 3. Database Schema (`database/`)
- **Technology**: PostgreSQL on Cloud SQL
- **Tables**:
  - `tenants` - Multi-tenant configuration
  - `dental_exams` - Exam records and status
  - `dental_findings` - AI analysis results

### 4. Deployment (`deploy/`)
- **Local Development**: Docker Compose setup
- **Production**: GCP deployment scripts

## Quick Start

### Local Development

1. **Prerequisites**:
   ```bash
   docker-compose --version
   gcloud --version  # Optional for GCS integration
   ```

2. **Start Local Environment**:
   ```bash
   cd deploy/
   docker-compose up -d
   ```

3. **Access Services**:
   - Gateway API: http://localhost:8080
   - Database: localhost:5432
   - Health Check: http://localhost:8080/health

4. **Test Upload**:
   ```bash
   curl -X POST http://localhost:8080/functions/v1/upload-exam-api \
     -H "Authorization: Bearer demo_api_key_12345" \
     -F "file=@sample_xray.jpg" \
     -F "metadata={\"patientId\":\"test123\"}"
   ```

### Production Deployment on GCP

1. **Setup GCP Project**:
   ```bash
   export PROJECT_ID="your-dental-project"
   export REGION="us-central1"
   gcloud config set project $PROJECT_ID
   ```

2. **Run Setup Script**:
   ```bash
   cd deploy/
   chmod +x gcp-setup.sh
   ./gcp-setup.sh
   ```

3. **Initialize Database**:
   ```bash
   # Get Cloud SQL instance IP
   DB_IP=$(gcloud sql instances describe dental-db-instance --format="value(ipAddresses[0].ipAddress)")
   
   # Upload schema
   psql -h $DB_IP -U dental-app -d dental_db -f ../database/schema.sql
   ```

4. **Update SDK Configuration**:
   ```javascript
   // Get the gateway URL from setup output
   DentalSDK.init({
     baseUrl: 'https://dental-gateway-xxxxx-uc.a.run.app',
     apiKey: 'demo_api_key_12345'
   });
   ```

## SDK Compatibility

The new architecture maintains **100% compatibility** with the existing SDK:

```javascript
// No changes needed in existing code
const sdk = new DentalSDK();

sdk.init({
  baseUrl: 'https://your-gateway-url',  // Only this changes
  apiKey: 'your-api-key'
});

// All existing methods work unchanged
sdk.uploadExam(file, metadata);
sdk.openViewer(examId);
```

## Google Cloud Services Used

### Core Services
- **Cloud Run**: Serverless container hosting
- **Cloud Storage**: File storage (images, overlays, reports)
- **Cloud SQL**: PostgreSQL database
- **Pub/Sub**: Async message queuing

### AI/ML Services
- **Vertex AI**: Machine learning inference
- **Healthcare API**: DICOM support (future)
- **Medical Imaging Suite**: Advanced visualization (future)

### Security & Management
- **Secret Manager**: API key storage
- **IAM**: Fine-grained permissions
- **Cloud Audit Logs**: Security monitoring

## Multi-Tenant Architecture

The system supports multiple clinics (tenants) with:
- **API Key per Clinic**: Isolated access control
- **Data Segregation**: Tenant-specific namespaces
- **Billing Isolation**: Per-tenant usage tracking
- **Custom Settings**: Clinic-specific configurations

## Cost Optimization

### Development/Testing
- **Cloud Run**: Pay-per-request (very low cost for testing)
- **Cloud SQL**: f1-micro instance (~$7/month)
- **Storage**: Standard class (~$0.02/GB/month)
- **Pub/Sub**: Free tier covers development usage

### Production Estimates (per 1000 exams/month)
- **Cloud Run**: ~$10-20/month
- **Cloud SQL**: ~$50/month (standard instance)
- **Storage**: ~$5/month (images + overlays)
- **Vertex AI**: ~$0.50-2.00 per prediction
- **Total**: ~$70-100/month for 1000 exams

## Monitoring & Observability

### Built-in Monitoring
- **Cloud Run Metrics**: Request latency, error rates
- **Cloud SQL Insights**: Query performance, connections
- **Pub/Sub Metrics**: Message processing rates
- **Vertex AI Monitoring**: Prediction accuracy, latency

### Custom Monitoring
- **Health Checks**: Service availability
- **Business Metrics**: Exam processing times, success rates
- **Error Tracking**: Detailed error logging and alerting

## Security Features

### Data Protection
- **Encryption at Rest**: All GCS buckets and Cloud SQL
- **Encryption in Transit**: HTTPS/TLS everywhere
- **VPC Security**: Private network isolation
- **IAM Policies**: Minimal privilege access

### HIPAA Compliance Ready
- **BAA Available**: Google Cloud offers HIPAA BAA
- **Audit Logging**: All data access tracked
- **Data Residency**: Configurable regions
- **De-identification**: Healthcare API integration

## Development Workflow

### Local Testing
1. Use Docker Compose for full local stack
2. Mock Vertex AI for development (no GCP costs)
3. Test SDK integration locally

### Staging/Production
1. Deploy to Cloud Run with staging configuration
2. Run integration tests against real Vertex AI
3. Promote to production with blue/green deployment

## Migration Strategy

### Phase 1: Setup (Week 1)
- [x] Create GCP infrastructure
- [x] Deploy gateway with SDK compatibility
- [x] Basic local testing

### Phase 2: AI Integration (Week 2)
- [ ] Set up Vertex AI endpoint
- [ ] Train/deploy dental analysis model
- [ ] Test inference pipeline

### Phase 3: Production Migration (Week 3)
- [ ] Performance testing
- [ ] Security audit
- [ ] DNS cutover from Supabase to GCP

### Phase 4: Advanced Features (Week 4)
- [ ] DICOM support via Healthcare API
- [ ] Advanced reporting
- [ ] Multi-tenant billing

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   ```bash
   # Check Cloud SQL instance status
   gcloud sql instances describe dental-db-instance
   
   # Test connection
   gcloud sql connect dental-db-instance --user=dental-app
   ```

2. **"Pub/Sub subscription not receiving messages"**
   ```bash
   # Check topic and subscription
   gcloud pubsub topics list
   gcloud pubsub subscriptions list
   
   # Check worker logs
   gcloud run logs read dental-inference-worker
   ```

3. **"Vertex AI endpoint not found"**
   ```bash
   # List available endpoints
   gcloud ai endpoints list --region=us-central1
   
   # The worker will use mock analysis if no endpoint is configured
   ```

### Logs and Debugging

```bash
# Gateway logs
gcloud run logs read dental-gateway --region=us-central1

# Worker logs  
gcloud run logs read dental-inference-worker --region=us-central1

# Database logs
gcloud sql operations list --instance=dental-db-instance

# Storage access logs
gsutil ls -L gs://dental-uploads-your-project
```

## Next Steps

1. **Set up Vertex AI model training** for custom dental analysis
2. **Integrate Healthcare API** for DICOM support
3. **Implement advanced reporting** with PDF generation
4. **Add real-time collaboration** features
5. **Set up monitoring dashboards** in Cloud Monitoring

## Support

For issues or questions:
1. Check the logs using commands above
2. Review the [Google Cloud Documentation](https://cloud.google.com/docs)
3. Test with the provided example scripts
4. Contact the development team with specific error messages

---

This infrastructure provides a scalable, secure, and cost-effective foundation for the dental analysis system with seamless migration from the existing Supabase-based solution.
