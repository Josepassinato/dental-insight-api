#!/bin/bash

# Google Cloud Platform setup script for Dental Analysis system
# This script sets up all required GCP services and resources

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"dental-analysis-project"}
REGION=${REGION:-"us-central1"}
ZONE=${ZONE:-"us-central1-a"}

# Service names
GATEWAY_SERVICE="dental-gateway"
WORKER_SERVICE="dental-inference-worker"

# Storage buckets
BUCKET_UPLOADS="dental-uploads-${PROJECT_ID}"
BUCKET_OVERLAYS="dental-overlays-${PROJECT_ID}"
BUCKET_REPORTS="dental-reports-${PROJECT_ID}"

# Pub/Sub
TOPIC_INFER="dental-infer"
SUBSCRIPTION_INFER="dental-infer-sub"

# Database
DB_INSTANCE="dental-db-instance"
DB_NAME="dental_db"

echo "Setting up GCP project: $PROJECT_ID"

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    pubsub.googleapis.com \
    sqladmin.googleapis.com \
    healthcare.googleapis.com \
    aiplatform.googleapis.com \
    secretmanager.googleapis.com

# Create storage buckets
echo "Creating storage buckets..."
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_UPLOADS || true
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_OVERLAYS || true
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_REPORTS || true

# Set bucket permissions (adjust as needed for security)
gsutil iam ch allUsers:objectViewer gs://$BUCKET_OVERLAYS || true
gsutil iam ch allUsers:objectViewer gs://$BUCKET_REPORTS || true

# Create Pub/Sub topic and subscription
echo "Creating Pub/Sub resources..."
gcloud pubsub topics create $TOPIC_INFER || true
gcloud pubsub subscriptions create $SUBSCRIPTION_INFER --topic=$TOPIC_INFER || true

# Create Cloud SQL instance
echo "Creating Cloud SQL instance..."
gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup \
    --enable-ip-alias || true

# Wait for instance to be ready
echo "Waiting for Cloud SQL instance to be ready..."
gcloud sql instances patch $DB_INSTANCE --database-flags=cloudsql.iam_authentication=on || true

# Create database
echo "Creating database..."
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE || true

# Create database user
echo "Creating database user..."
gcloud sql users create dental-app --instance=$DB_INSTANCE --password=dental_secure_password_123 || true

# Get the instance connection name
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --format="value(connectionName)")
echo "Database connection name: $DB_CONNECTION_NAME"

# Create service account for Cloud Run services
echo "Creating service accounts..."
gcloud iam service-accounts create dental-gateway-sa \
    --display-name="Dental Gateway Service Account" || true

gcloud iam service-accounts create dental-worker-sa \
    --display-name="Dental Worker Service Account" || true

# Grant permissions to service accounts
echo "Granting permissions..."

# Gateway permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-gateway-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-gateway-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-gateway-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

# Worker permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:dental-worker-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Build and deploy gateway
echo "Building and deploying gateway..."
cd ../dental-gateway

gcloud builds submit --tag gcr.io/$PROJECT_ID/$GATEWAY_SERVICE

gcloud run deploy $GATEWAY_SERVICE \
    --image gcr.io/$PROJECT_ID/$GATEWAY_SERVICE \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --service-account dental-gateway-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "GCP_PROJECT=$PROJECT_ID" \
    --set-env-vars "BUCKET_UPLOADS=$BUCKET_UPLOADS" \
    --set-env-vars "BUCKET_OVERLAYS=$BUCKET_OVERLAYS" \
    --set-env-vars "BUCKET_REPORTS=$BUCKET_REPORTS" \
    --set-env-vars "TOPIC_INFER=$TOPIC_INFER" \
    --set-env-vars "DB_CONNECTION_NAME=$DB_CONNECTION_NAME" \
    --set-env-vars "DB_USER=dental-app" \
    --set-env-vars "DB_PASSWORD=dental_secure_password_123" \
    --set-env-vars "DB_NAME=$DB_NAME" \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 100

# Build and deploy worker
echo "Building and deploying worker..."
cd ../inference-worker

gcloud builds submit --tag gcr.io/$PROJECT_ID/$WORKER_SERVICE

gcloud run deploy $WORKER_SERVICE \
    --image gcr.io/$PROJECT_ID/$WORKER_SERVICE \
    --platform managed \
    --region $REGION \
    --no-allow-unauthenticated \
    --service-account dental-worker-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars "GCP_PROJECT=$PROJECT_ID" \
    --set-env-vars "GCP_REGION=$REGION" \
    --set-env-vars "BUCKET_UPLOADS=$BUCKET_UPLOADS" \
    --set-env-vars "BUCKET_OVERLAYS=$BUCKET_OVERLAYS" \
    --set-env-vars "BUCKET_REPORTS=$BUCKET_REPORTS" \
    --set-env-vars "SUBSCRIPTION_NAME=$SUBSCRIPTION_INFER" \
    --set-env-vars "DB_CONNECTION_NAME=$DB_CONNECTION_NAME" \
    --set-env-vars "DB_USER=dental-app" \
    --set-env-vars "DB_PASSWORD=dental_secure_password_123" \
    --set-env-vars "DB_NAME=$DB_NAME" \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10

# Get the gateway URL
GATEWAY_URL=$(gcloud run services describe $GATEWAY_SERVICE --platform=managed --region=$REGION --format="value(status.url)")

echo ""
echo "Setup complete!"
echo "Gateway URL: $GATEWAY_URL"
echo "Database connection: $DB_CONNECTION_NAME"
echo ""
echo "To test the setup:"
echo "1. Update your SDK configuration:"
echo "   DentalSDK.init({"
echo "     baseUrl: '$GATEWAY_URL',"
echo "     apiKey: 'demo_api_key_12345'"
echo "   });"
echo ""
echo "2. Upload the database schema:"
echo "   psql -h <DB_IP> -U dental-app -d $DB_NAME -f ../database/schema.sql"
echo ""
echo "Next steps:"
echo "- Set up Vertex AI endpoint for production inference"
echo "- Configure Healthcare API for DICOM support"
echo "- Set up monitoring and logging"
echo "- Configure custom domain and SSL"