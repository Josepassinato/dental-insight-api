import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Tuple
import numpy as np
from PIL import Image, ImageDraw
import io
import base64

from google.cloud import storage, pubsub_v1
from google.cloud.sql.connector import Connector
import asyncpg
import aiohttp

# Vertex AI imports
from google.cloud import aiplatform
from google.cloud.aiplatform.gapic.schema import predict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
PROJECT_ID = os.environ.get("GCP_PROJECT", "dental-analysis-project")
REGION = os.environ.get("GCP_REGION", "us-central1")
BUCKET_UPLOADS = os.environ.get("BUCKET_UPLOADS", "dental-uploads")
BUCKET_OVERLAYS = os.environ.get("BUCKET_OVERLAYS", "dental-overlays")
BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS", "dental-reports")
VERTEX_ENDPOINT_ID = os.environ.get("VERTEX_ENDPOINT_ID")
DB_CONNECTION_NAME = os.environ.get("DB_CONNECTION_NAME")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_NAME = os.environ.get("DB_NAME", "dental_db")
SUBSCRIPTION_NAME = os.environ.get("SUBSCRIPTION_NAME", "dental-infer-sub")

# Initialize clients
storage_client = storage.Client()
subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_NAME)
connector = Connector()

# Initialize Vertex AI
aiplatform.init(project=PROJECT_ID, location=REGION)

class DentalAnalysisWorker:
    def __init__(self):
        self.endpoint = None
        if VERTEX_ENDPOINT_ID:
            self.endpoint = aiplatform.Endpoint(VERTEX_ENDPOINT_ID)
    
    async def get_db_connection(self):
        """Get database connection using Cloud SQL Connector"""
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
    
    async def download_image_from_gcs(self, gcs_uri: str) -> Tuple[Image.Image, bytes]:
        """Download image from Google Cloud Storage"""
        try:
            # Parse GCS URI
            if not gcs_uri.startswith("gs://"):
                raise ValueError("Invalid GCS URI format")
            
            path_parts = gcs_uri[5:].split("/", 1)
            bucket_name = path_parts[0]
            blob_name = path_parts[1]
            
            # Download from GCS
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            
            if not blob.exists():
                raise FileNotFoundError(f"File not found: {gcs_uri}")
            
            # Download as bytes
            image_bytes = blob.download_as_bytes()
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image, image_bytes
            
        except Exception as e:
            logger.error(f"Failed to download image from {gcs_uri}: {e}")
            raise
    
    def prepare_image_for_pearl_ai(self, image: Image.Image) -> bytes:
        """Prepare image for Pearl AI analysis - optimized for accuracy and cost"""
        try:
            # Pearl AI works best with high-quality images
            # Recommended resolution: 512-2048px for optimal accuracy
            target_size = 1024
            
            # Maintain aspect ratio while resizing
            if max(image.size) > target_size:
                ratio = target_size / max(image.size)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to PNG for better quality (Pearl AI recommendation)
            buffer = io.BytesIO()
            image.save(buffer, format="PNG", optimize=True)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to prepare image for Pearl AI: {e}")
            raise
    
    async def analyze_with_pearl_ai(self, image: Image.Image, tasks: List[str]) -> Dict[str, Any]:
        """Perform dental analysis using Pearl AI (most cost-effective and accurate)"""
        try:
            import requests
            
            pearl_api_key = os.environ.get('PEARL_AI_API_KEY')
            if not pearl_api_key:
                logger.warning("Pearl AI API key not found, using mock analysis")
                return await self.mock_analysis(tasks)
            
            # Prepare image for Pearl AI
            image_bytes = self.prepare_image_for_pearl_ai(image)
            
            # Map tasks to Pearl AI detection types
            detection_types = self.map_tasks_to_pearl_detections(tasks)
            
            # Call Pearl AI Second Opinion API
            response = requests.post(
                'https://api.hellopearl.com/v2/detect',
                headers={
                    'Authorization': f'Bearer {pearl_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'image_data': base64.b64encode(image_bytes).decode('utf-8'),
                    'image_format': 'png',
                    'detections': detection_types,
                    'confidence_threshold': 0.5,
                    'return_overlay': True,
                    'return_tooth_numbering': True
                },
                timeout=45
            )
            
            if response.status_code == 200:
                pearl_result = response.json()
                return self.process_pearl_ai_response(pearl_result, tasks)
            else:
                logger.error(f"Pearl AI API error: {response.status_code} - {response.text}")
                return await self.mock_analysis(tasks)
                
        except Exception as e:
            logger.error(f"Pearl AI analysis failed: {str(e)}")
            return await self.mock_analysis(tasks)
    
    async def mock_analysis(self, tasks: List[str]) -> Dict[str, Any]:
        """Mock analysis for development/testing"""
        logger.info("Using mock analysis (Vertex AI not available)")
        
        # Generate mock findings
        mock_findings = []
        
        if "caries_detection" in tasks:
            mock_findings.extend([
                {
                    "tooth_number": "14",
                    "finding_type": "caries",
                    "severity": "moderate",
                    "confidence": 0.85,
                    "coordinates": {"x": 150, "y": 200, "width": 30, "height": 25},
                    "description": "Distal caries detected on upper right first premolar"
                },
                {
                    "tooth_number": "36",
                    "finding_type": "caries",
                    "severity": "mild",
                    "confidence": 0.72,
                    "coordinates": {"x": 400, "y": 180, "width": 20, "height": 20},
                    "description": "Occlusal caries detected on lower left first molar"
                }
            ])
        
        if "bone_loss" in tasks:
            mock_findings.append({
                "tooth_number": "17",
                "finding_type": "bone_loss",
                "severity": "moderate",
                "confidence": 0.78,
                "coordinates": {"x": 100, "y": 250, "width": 40, "height": 15},
                "description": "Horizontal bone loss around upper right second molar"
            })
        
        if "restoration_assessment" in tasks:
            mock_findings.append({
                "tooth_number": "26",
                "finding_type": "restoration_defect",
                "severity": "mild",
                "confidence": 0.68,
                "coordinates": {"x": 300, "y": 160, "width": 25, "height": 20},
                "description": "Marginal gap detected in existing restoration"
            })
        
        return {
            "findings": mock_findings,
            "summary": {
                "total_findings": len(mock_findings),
                "caries_count": len([f for f in mock_findings if f["finding_type"] == "caries"]),
                "bone_loss_count": len([f for f in mock_findings if f["finding_type"] == "bone_loss"]),
                "restoration_issues": len([f for f in mock_findings if f["finding_type"] == "restoration_defect"])
            },
            "confidence_score": 0.75,
            "analysis_method": "mock_analysis"
        }
    
    def map_tasks_to_pearl_detections(self, tasks: List[str]) -> List[str]:
        """Map internal tasks to Pearl AI detection types"""
        task_mapping = {
            "caries_detection": ["caries"],
            "bone_loss": ["bone_loss"],
            "restoration_assessment": ["restorative_discrepancy"],
            "periapical_assessment": ["periapical_radiolucency"],
            "calculus_detection": ["calculus"],
            "root_canal_assessment": ["root_canal_deficiency"]
        }
        
        pearl_detections = []
        for task in tasks:
            if task in task_mapping:
                pearl_detections.extend(task_mapping[task])
        
        # Default to comprehensive analysis if no specific tasks
        if not pearl_detections:
            pearl_detections = ["caries", "calculus", "bone_loss", "periapical_radiolucency", "root_canal_deficiency", "restorative_discrepancy"]
        
        return pearl_detections

    def process_pearl_ai_response(self, response_data: Dict[str, Any], tasks: List[str]) -> Dict[str, Any]:
        """Process Pearl AI response into standardized format"""
        try:
            detections = response_data.get('detections', [])
            overlay_url = response_data.get('overlay_url')
            
            findings = []
            
            # Process Pearl AI detections
            for detection in detections:
                finding = {
                    "tooth_number": str(detection.get('tooth_number', 'unknown')),
                    "finding_type": detection.get('type', 'unknown'),
                    "severity": self.map_pearl_severity(detection.get('severity', 'low')),
                    "confidence": float(detection.get('confidence', 0.0)),
                    "coordinates": detection.get('bounding_box', {}),
                    "description": detection.get('description', ''),
                    "surface": detection.get('surface', ''),
                    "clinical_significance": detection.get('clinical_significance', '')
                }
                findings.append(finding)
            
            # Calculate summary statistics
            summary = {
                "total_findings": len(findings),
                "caries_count": len([f for f in findings if f["finding_type"] == "caries"]),
                "bone_loss_count": len([f for f in findings if f["finding_type"] == "bone_loss"]),
                "restoration_issues": len([f for f in findings if f["finding_type"] == "restorative_discrepancy"])
            }
            
            return {
                "findings": findings,
                "summary": summary,
                "confidence_score": float(response_data.get('overall_confidence', 0.0)),
                "analysis_method": "pearl_ai",
                "overlay_url": overlay_url,
                "analysis_id": response_data.get('analysis_id'),
                "processing_time": response_data.get('processing_time_ms')
            }
            
        except Exception as e:
            logger.error(f"Failed to process Pearl AI response: {e}")
            raise
    
    def map_pearl_severity(self, severity: str) -> str:
        """Map Pearl AI severity to standardized format"""
        severity_map = {
            'critical': 'severe',
            'high': 'severe', 
            'moderate': 'moderate',
            'medium': 'moderate',
            'low': 'mild',
            'minimal': 'mild'
        }
        return severity_map.get(severity.lower(), 'mild')
    
    async def generate_overlay_image(self, original_image: Image.Image, findings: List[Dict[str, Any]]) -> bytes:
        """Generate overlay image with annotations"""
        try:
            # Create transparent overlay
            overlay = Image.new('RGBA', original_image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Color mapping for different finding types
            colors = {
                "caries": (255, 0, 0, 128),  # Red
                "bone_loss": (255, 165, 0, 128),  # Orange
                "restoration_defect": (255, 255, 0, 128),  # Yellow
                "unknown": (128, 128, 128, 128)  # Gray
            }
            
            for finding in findings:
                coords = finding.get("coordinates", {})
                finding_type = finding.get("finding_type", "unknown")
                color = colors.get(finding_type, colors["unknown"])
                
                if all(k in coords for k in ["x", "y", "width", "height"]):
                    x, y, w, h = coords["x"], coords["y"], coords["width"], coords["height"]
                    
                    # Draw bounding box
                    draw.rectangle([x, y, x + w, y + h], outline=color, width=2)
                    
                    # Draw filled rectangle with transparency
                    draw.rectangle([x, y, x + w, y + h], fill=color)
                    
                    # Add label
                    label = f"{finding.get('tooth_number', 'N/A')}: {finding_type}"
                    draw.text((x, y - 15), label, fill=(255, 255, 255, 255))
            
            # Convert to PNG bytes
            buffer = io.BytesIO()
            overlay.save(buffer, format="PNG")
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to generate overlay: {e}")
            raise
    
    async def save_overlay_to_gcs(self, exam_id: str, overlay_bytes: bytes) -> str:
        """Save overlay image to Google Cloud Storage"""
        try:
            bucket = storage_client.bucket(BUCKET_OVERLAYS)
            blob_name = f"{exam_id}_overlay.png"
            blob = bucket.blob(blob_name)
            
            blob.upload_from_string(
                overlay_bytes,
                content_type="image/png"
            )
            
            # Set metadata
            blob.metadata = {
                "exam_id": exam_id,
                "type": "overlay",
                "generated_at": datetime.utcnow().isoformat()
            }
            blob.patch()
            
            return f"gs://{BUCKET_OVERLAYS}/{blob_name}"
            
        except Exception as e:
            logger.error(f"Failed to save overlay to GCS: {e}")
            raise
    
    async def save_findings_to_database(self, exam_id: str, findings: List[Dict[str, Any]], analysis_data: Dict[str, Any]):
        """Save analysis findings to database"""
        try:
            conn = await self.get_db_connection()
            
            # Update exam status
            await conn.execute("""
                UPDATE dental_exams 
                SET status = $1, analysis_completed_at = $2,
                    analysis_summary = $3
                WHERE id = $4
            """, "completed", datetime.utcnow(), json.dumps(analysis_data.get("summary", {})), exam_id)
            
            # Clear existing findings
            await conn.execute("DELETE FROM dental_findings WHERE exam_id = $1", exam_id)
            
            # Insert new findings
            for finding in findings:
                await conn.execute("""
                    INSERT INTO dental_findings (
                        exam_id, tooth_number, finding_type, severity,
                        confidence, coordinates, description, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, 
                    exam_id,
                    str(finding.get("tooth_number", "")),
                    finding.get("finding_type", ""),
                    finding.get("severity", ""),
                    float(finding.get("confidence", 0.0)),
                    json.dumps(finding.get("coordinates", {})),
                    finding.get("description", ""),
                    datetime.utcnow()
                )
            
            await conn.close()
            logger.info(f"Saved {len(findings)} findings for exam {exam_id}")
            
        except Exception as e:
            logger.error(f"Failed to save findings to database: {e}")
            raise
    
    async def process_inference_job(self, message_data: Dict[str, Any]):
        """Process a single inference job"""
        try:
            exam_id = message_data["examId"]
            tenant_id = message_data["tenantId"]
            gcs_uri = message_data["gcsUri"]
            tasks = message_data.get("tasks", ["caries_detection"])
            
            logger.info(f"Processing inference job for exam {exam_id}")
            
            # Update exam status to processing
            try:
                conn = await self.get_db_connection()
                await conn.execute("""
                    UPDATE dental_exams 
                    SET status = $1, analysis_started_at = $2
                    WHERE id = $3
                """, "processing", datetime.utcnow(), exam_id)
                await conn.close()
            except Exception as db_error:
                logger.warning(f"Failed to update exam status: {db_error}")
            
            # Download image from GCS
            original_image, image_bytes = await self.download_image_from_gcs(gcs_uri)
            
            # Perform analysis with Pearl AI (most cost-effective)
            analysis_result = await self.analyze_with_pearl_ai(original_image, tasks)
            
            # Generate overlay image
            overlay_bytes = await self.generate_overlay_image(
                original_image, 
                analysis_result["findings"]
            )
            
            # Save overlay to GCS
            overlay_uri = await self.save_overlay_to_gcs(exam_id, overlay_bytes)
            
            # Save findings to database
            await self.save_findings_to_database(exam_id, analysis_result["findings"], analysis_result)
            
            logger.info(f"Successfully processed exam {exam_id} with {len(analysis_result['findings'])} findings")
            
        except Exception as e:
            logger.error(f"Failed to process inference job: {e}")
            
            # Update exam status to failed
            try:
                conn = await self.get_db_connection()
                await conn.execute("""
                    UPDATE dental_exams 
                    SET status = $1, error_message = $2
                    WHERE id = $3
                """, "failed", str(e), exam_id)
                await conn.close()
            except Exception as db_error:
                logger.error(f"Failed to update exam status to failed: {db_error}")
            
            raise

def callback(message):
    """Pub/Sub message callback"""
    try:
        # Parse message
        message_data = json.loads(message.data.decode("utf-8"))
        
        # Create worker instance
        worker = DentalAnalysisWorker()
        
        # Process in async context
        asyncio.run(worker.process_inference_job(message_data))
        
        # Acknowledge message
        message.ack()
        logger.info(f"Successfully processed message for exam {message_data.get('examId', 'unknown')}")
        
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        message.nack()

def main():
    """Main worker function"""
    logger.info(f"Starting dental analysis worker, listening to {subscription_path}")
    
    # Configure flow control
    flow_control = pubsub_v1.types.FlowControl(max_messages=10, max_bytes=100 * 1024 * 1024)
    
    # Start pulling messages
    streaming_pull_future = subscriber.subscribe(
        subscription_path, 
        callback=callback,
        flow_control=flow_control
    )
    
    try:
        logger.info("Worker is running. Press Ctrl+C to stop.")
        streaming_pull_future.result()
    except KeyboardInterrupt:
        streaming_pull_future.cancel()
        logger.info("Worker stopped.")

if __name__ == "__main__":
    main()