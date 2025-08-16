#!/usr/bin/env python3
"""
Dental AI Fine-Tuning Pipeline
Advanced training pipeline for dental X-ray analysis using Vertex AI Custom Training
"""

import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import zipfile
import tempfile
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from transformers import (
    AutoProcessor, 
    AutoModelForVision2Seq,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding
)

from google.cloud import storage, aiplatform
from google.cloud.sql.connector import Connector
import asyncpg

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
PROJECT_ID = os.environ.get("GCP_PROJECT", "dental-analysis-project")
REGION = os.environ.get("GCP_REGION", "us-central1")
TRAINING_BUCKET = os.environ.get("TRAINING_BUCKET", "dental-training-data")
MODEL_BUCKET = os.environ.get("MODEL_BUCKET", "dental-models")
DB_CONNECTION_NAME = os.environ.get("DB_CONNECTION_NAME")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_NAME = os.environ.get("DB_NAME", "dental_db")

# Initialize clients
storage_client = storage.Client()
aiplatform.init(project=PROJECT_ID, location=REGION)
connector = Connector()

class DentalDataset(Dataset):
    """Custom dataset for dental X-ray analysis"""
    
    def __init__(self, data_samples: List[Dict], processor, transform=None):
        self.data_samples = data_samples
        self.processor = processor
        self.transform = transform
        
    def __len__(self):
        return len(self.data_samples)
    
    def __getitem__(self, idx):
        sample = self.data_samples[idx]
        
        # Load and preprocess image
        image = Image.open(sample['image_path']).convert('RGB')
        if self.transform:
            image = self.transform(image)
        
        # Prepare prompt and target response
        prompt = self.create_analysis_prompt(sample['context'])
        target_response = json.dumps(sample['expected_findings'])
        
        # Process with model processor
        inputs = self.processor(
            images=image,
            text=prompt,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        )
        
        # Prepare target tokens
        target_inputs = self.processor(
            text=target_response,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=256
        )
        
        return {
            'input_ids': inputs['input_ids'].squeeze(),
            'attention_mask': inputs['attention_mask'].squeeze(),
            'pixel_values': inputs['pixel_values'].squeeze(),
            'labels': target_inputs['input_ids'].squeeze()
        }
    
    def create_analysis_prompt(self, context: Dict) -> str:
        """Create analysis prompt based on context"""
        task_focus = context.get('focus_areas', ['caries_detection', 'periodontal_assessment'])
        
        prompt = f"""
        Analyze this dental X-ray image with medical precision. Focus on:
        {', '.join(task_focus)}
        
        Provide structured findings with:
        - FDI tooth numbering
        - Precise anatomical locations
        - Confidence scores (0.8+ only)
        - Clinical recommendations
        
        Format as valid JSON with findings array.
        """
        
        return prompt

class DentalFineTuner:
    """Main fine-tuning class for dental AI model"""
    
    def __init__(self, base_model_name: str = "microsoft/git-base-coco"):
        self.base_model_name = base_model_name
        self.model = None
        self.processor = None
        self.training_data = []
        self.validation_data = []
        
    async def get_db_connection(self):
        """Get database connection"""
        try:
            conn = await connector.connect_async(
                DB_CONNECTION_NAME,
                "asyncpg",
                user=DB_USER,
                password=DB_PASSWORD,
                db=DB_NAME,
            )
            return conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
    
    async def collect_training_data(self) -> Tuple[List[Dict], List[Dict]]:
        """Collect validated training data from database"""
        logger.info("Collecting training data from validated exams...")
        
        conn = await self.get_db_connection()
        
        try:
            # Query for high-quality, expert-validated data
            query = """
            SELECT 
                e.id as exam_id,
                e.patient_id,
                e.ai_summary,
                di.id as image_id,
                di.file_path,
                di.ai_analysis,
                di.mime_type,
                array_agg(
                    json_build_object(
                        'tooth_number', df.tooth_number,
                        'finding_type', df.finding_type,
                        'severity', df.severity,
                        'confidence', df.confidence,
                        'coordinates', df.coordinates,
                        'description', df.description,
                        'expert_validated', df.expert_validated
                    )
                ) as findings
            FROM exams e
            JOIN dental_images di ON e.id = di.exam_id
            JOIN dental_findings df ON e.id = df.exam_id
            WHERE 
                e.status = 'completed'
                AND di.processing_status = 'completed'
                AND df.expert_validated = true
                AND df.confidence >= 0.8
                AND e.ai_summary->>'confidence_score' IS NOT NULL
                AND CAST(e.ai_summary->>'confidence_score' AS FLOAT) >= 0.85
            GROUP BY e.id, di.id
            HAVING COUNT(df.id) >= 2  -- At least 2 validated findings per image
            ORDER BY CAST(e.ai_summary->>'confidence_score' AS FLOAT) DESC
            LIMIT 1000;
            """
            
            rows = await conn.fetch(query)
            
            training_samples = []
            for row in rows:
                # Download image from storage
                image_path = await self.download_training_image(row['file_path'])
                
                if image_path:
                    # Filter only expert-validated findings
                    validated_findings = [
                        f for f in row['findings'] 
                        if f['expert_validated'] and f['confidence'] >= 0.8
                    ]
                    
                    if len(validated_findings) >= 2:
                        sample = {
                            'exam_id': row['exam_id'],
                            'image_id': row['image_id'],
                            'image_path': image_path,
                            'expected_findings': validated_findings,
                            'context': {
                                'focus_areas': list(set([f['finding_type'] for f in validated_findings])),
                                'image_quality': row['ai_analysis'].get('image_quality', {}).get('overall_quality', 8.0),
                                'total_findings': len(validated_findings)
                            }
                        }
                        training_samples.append(sample)
            
            # Split into training and validation
            split_idx = int(len(training_samples) * 0.8)
            training_data = training_samples[:split_idx]
            validation_data = training_samples[split_idx:]
            
            logger.info(f"Collected {len(training_data)} training samples, {len(validation_data)} validation samples")
            
            return training_data, validation_data
            
        finally:
            await conn.close()
    
    async def download_training_image(self, file_path: str) -> Optional[str]:
        """Download training image from GCS"""
        try:
            bucket = storage_client.bucket('dental-uploads')
            blob = bucket.blob(file_path)
            
            if not blob.exists():
                logger.warning(f"Image not found: {file_path}")
                return None
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            blob.download_to_filename(temp_file.name)
            
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Failed to download image {file_path}: {e}")
            return None
    
    def setup_model_and_processor(self):
        """Initialize model and processor for fine-tuning"""
        logger.info(f"Setting up model and processor: {self.base_model_name}")
        
        self.processor = AutoProcessor.from_pretrained(self.base_model_name)
        self.model = AutoModelForVision2Seq.from_pretrained(self.base_model_name)
        
        # Add special tokens for dental analysis
        special_tokens = [
            "<CARIES>", "<BONE_LOSS>", "<RESTORATION>", "<PERIAPICAL>",
            "<CALCULUS>", "<MILD>", "<MODERATE>", "<SEVERE>", "<CRITICAL>",
            "<FDI_11>", "<FDI_12>", "<FDI_13>", "<FDI_14>", "<FDI_15>",
            "<FDI_16>", "<FDI_17>", "<FDI_18>", "<FDI_21>", "<FDI_22>",
            "<FDI_23>", "<FDI_24>", "<FDI_25>", "<FDI_26>", "<FDI_27>",
            "<FDI_28>", "<FDI_31>", "<FDI_32>", "<FDI_33>", "<FDI_34>",
            "<FDI_35>", "<FDI_36>", "<FDI_37>", "<FDI_38>", "<FDI_41>",
            "<FDI_42>", "<FDI_43>", "<FDI_44>", "<FDI_45>", "<FDI_46>",
            "<FDI_47>", "<FDI_48>"
        ]
        
        self.processor.tokenizer.add_special_tokens({
            'additional_special_tokens': special_tokens
        })
        
        # Resize model embeddings
        self.model.resize_token_embeddings(len(self.processor.tokenizer))
        
        logger.info("Model and processor setup completed")
    
    def create_training_arguments(self, output_dir: str) -> TrainingArguments:
        """Create training arguments for fine-tuning"""
        return TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=4,  # Smaller batch size for memory efficiency
            per_device_eval_batch_size=4,
            gradient_accumulation_steps=4,   # Effective batch size = 16
            num_train_epochs=5,
            learning_rate=2e-5,
            warmup_steps=100,
            evaluation_strategy="steps",
            eval_steps=50,
            save_steps=100,
            save_total_limit=3,
            remove_unused_columns=False,
            push_to_hub=False,
            report_to=[],
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            fp16=True,  # Mixed precision training
            dataloader_pin_memory=False,
            logging_steps=10,
            logging_dir=f"{output_dir}/logs"
        )
    
    async def start_fine_tuning(self) -> Dict[str, Any]:
        """Start the fine-tuning process"""
        logger.info("Starting fine-tuning process...")
        
        try:
            # 1. Collect training data
            self.training_data, self.validation_data = await self.collect_training_data()
            
            if len(self.training_data) < 50:
                raise ValueError(f"Insufficient training data. Need at least 50 samples, got {len(self.training_data)}")
            
            # 2. Setup model and processor
            self.setup_model_and_processor()
            
            # 3. Create datasets
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            train_dataset = DentalDataset(self.training_data, self.processor, transform)
            val_dataset = DentalDataset(self.validation_data, self.processor, transform)
            
            # 4. Setup training
            output_dir = f"./dental_model_finetuned_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            training_args = self.create_training_arguments(output_dir)
            
            # 5. Create trainer
            trainer = Trainer(
                model=self.model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=val_dataset,
                data_collator=DataCollatorWithPadding(self.processor.tokenizer),
            )
            
            # 6. Start training
            logger.info("Starting training...")
            training_result = trainer.train()
            
            # 7. Save model
            trainer.save_model()
            self.processor.save_pretrained(output_dir)
            
            # 8. Upload to GCS
            model_gcs_path = await self.upload_model_to_gcs(output_dir)
            
            # 9. Register model in Vertex AI
            model_resource = await self.register_model_in_vertex_ai(model_gcs_path)
            
            result = {
                "status": "completed",
                "training_loss": training_result.training_loss,
                "training_samples": len(self.training_data),
                "validation_samples": len(self.validation_data),
                "epochs": training_args.num_train_epochs,
                "model_path": model_gcs_path,
                "vertex_ai_model": model_resource.name,
                "local_output_dir": output_dir
            }
            
            logger.info(f"Fine-tuning completed successfully: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Fine-tuning failed: {e}")
            raise
    
    async def upload_model_to_gcs(self, local_model_dir: str) -> str:
        """Upload trained model to Google Cloud Storage"""
        logger.info("Uploading model to GCS...")
        
        bucket = storage_client.bucket(MODEL_BUCKET)
        model_name = f"dental_finetuned_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create a zip file of the model
        zip_path = f"{local_model_dir}.zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(local_model_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, local_model_dir)
                    zipf.write(file_path, arcname)
        
        # Upload to GCS
        blob_name = f"models/{model_name}.zip"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(zip_path)
        
        gcs_path = f"gs://{MODEL_BUCKET}/{blob_name}"
        logger.info(f"Model uploaded to: {gcs_path}")
        
        # Clean up local files
        os.remove(zip_path)
        
        return gcs_path
    
    async def register_model_in_vertex_ai(self, model_gcs_path: str):
        """Register the fine-tuned model in Vertex AI Model Registry"""
        logger.info("Registering model in Vertex AI...")
        
        model = aiplatform.Model.upload(
            display_name="dental-analysis-fine-tuned",
            artifact_uri=model_gcs_path,
            serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.1-12:latest",
            description="Fine-tuned model for dental X-ray analysis with improved accuracy",
            labels={
                "model_type": "vision_language",
                "domain": "dental_analysis",
                "training_date": datetime.now().strftime('%Y-%m-%d')
            }
        )
        
        logger.info(f"Model registered: {model.resource_name}")
        return model

async def main():
    """Main function to run fine-tuning"""
    try:
        fine_tuner = DentalFineTuner()
        result = await fine_tuner.start_fine_tuning()
        
        print(f"Fine-tuning completed successfully!")
        print(f"Results: {json.dumps(result, indent=2)}")
        
    except Exception as e:
        logger.error(f"Fine-tuning process failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())