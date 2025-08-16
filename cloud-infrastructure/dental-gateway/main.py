from fastapi import FastAPI, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from google.cloud import storage, pubsub_v1, sql
from google.cloud.sql.connector import Connector
import json, uuid, os, asyncio, logging
import asyncpg
from datetime import datetime
from typing import Optional, Dict, Any
import mimetypes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Dental Gateway API", version="1.0.0")

# Environment variables
PROJECT_ID = os.environ.get("GCP_PROJECT", "dental-analysis-project")
BUCKET_UPLOADS = os.environ.get("BUCKET_UPLOADS", "dental-uploads")
BUCKET_OVERLAYS = os.environ.get("BUCKET_OVERLAYS", "dental-overlays") 
BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS", "dental-reports")
TOPIC_INFER = os.environ.get("TOPIC_INFER", "dental-infer")
DB_CONNECTION_NAME = os.environ.get("DB_CONNECTION_NAME")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD")
DB_NAME = os.environ.get("DB_NAME", "dental_db")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google Cloud clients
storage_client = storage.Client()
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_INFER)

# Database connection pool
connector = Connector()

async def get_db_connection():
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
        raise HTTPException(status_code=500, detail="Database connection failed")

async def validate_api_key(api_key: str) -> Dict[str, Any]:
    """Validate API key and return tenant info"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # For demo purposes, return a default tenant
    # In production, query database for tenant validation
    return {
        "tenant_id": "demo_tenant",
        "tenant_name": "Demo Clinic",
        "active": True
    }

def extract_api_key(authorization: str = None) -> str:
    """Extract API key from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    return authorization[7:]  # Remove "Bearer " prefix

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/functions/v1/upload-exam-api")
async def upload_exam_api(
    file: UploadFile,
    metadata: str = Form("{}"),
    authorization: str = None
):
    """Upload dental exam file - compatible with existing SDK"""
    try:
        # Validate API key
        api_key = extract_api_key(authorization)
        tenant_info = await validate_api_key(api_key)
        tenant_id = tenant_info["tenant_id"]
        
        # Parse metadata
        try:
            meta = json.loads(metadata or "{}")
        except json.JSONDecodeError:
            meta = {}
        
        # Generate exam ID
        exam_id = "ex_" + uuid.uuid4().hex[:12]
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Determine file extension and content type
        ext = os.path.splitext(file.filename)[1].lower() or ".bin"
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        
        # Validate image file
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are supported")
        
        # Upload to Google Cloud Storage
        blob_path = f"{tenant_id}/{exam_id}{ext}"
        bucket = storage_client.bucket(BUCKET_UPLOADS)
        blob = bucket.blob(blob_path)
        
        # Read file content
        file_content = await file.read()
        
        # Upload with metadata
        blob.upload_from_string(
            file_content,
            content_type=content_type
        )
        
        # Set metadata
        blob.metadata = {
            "exam_id": exam_id,
            "tenant_id": tenant_id,
            "original_filename": file.filename,
            "upload_timestamp": datetime.utcnow().isoformat(),
            **meta
        }
        blob.patch()
        
        # Store exam record in database
        try:
            conn = await get_db_connection()
            await conn.execute("""
                INSERT INTO dental_exams (
                    id, tenant_id, original_filename, file_path, 
                    content_type, metadata, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, 
                exam_id, tenant_id, file.filename, blob_path,
                content_type, json.dumps(meta), "uploaded", datetime.utcnow()
            )
            await conn.close()
        except Exception as db_error:
            logger.warning(f"Database insert failed: {db_error}")
            # Continue without failing - file is uploaded to GCS
        
        # Publish to Pub/Sub for async processing
        inference_payload = {
            "examId": exam_id,
            "tenantId": tenant_id,
            "gcsUri": f"gs://{BUCKET_UPLOADS}/{blob_path}",
            "contentType": content_type,
            "originalFilename": file.filename,
            "tasks": meta.get("tasks", ["caries_detection", "bone_loss", "restoration_assessment"]),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            future = publisher.publish(
                topic_path, 
                json.dumps(inference_payload).encode("utf-8"),
                exam_id=exam_id,
                tenant_id=tenant_id
            )
            message_id = future.result()
            logger.info(f"Published inference job {message_id} for exam {exam_id}")
        except Exception as pub_error:
            logger.error(f"Pub/Sub publish failed: {pub_error}")
            # Don't fail the upload, just log the error
        
        return {
            "examId": exam_id,
            "status": "uploaded",
            "message": "Exam uploaded successfully and queued for analysis"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/embed/viewer/{exam_id}")
async def embed_viewer(exam_id: str, apiKey: str = None):
    """Serve embedded viewer - compatible with existing SDK iframe"""
    try:
        # Validate API key
        if apiKey:
            tenant_info = await validate_api_key(apiKey)
            tenant_id = tenant_info["tenant_id"]
        else:
            # For demo purposes, allow without API key
            tenant_id = "demo_tenant"
        
        # Get exam data from database
        try:
            conn = await get_db_connection()
            exam_row = await conn.fetchrow("""
                SELECT id, tenant_id, original_filename, file_path, 
                       metadata, status, created_at, analysis_completed_at
                FROM dental_exams 
                WHERE id = $1 AND tenant_id = $2
            """, exam_id, tenant_id)
            
            if not exam_row:
                await conn.close()
                raise HTTPException(status_code=404, detail="Exam not found")
            
            # Get findings
            findings_rows = await conn.fetchall("""
                SELECT tooth_number, finding_type, severity, confidence, 
                       coordinates, description, created_at
                FROM dental_findings 
                WHERE exam_id = $1
                ORDER BY created_at
            """, exam_id)
            
            await conn.close()
            
        except Exception as db_error:
            logger.error(f"Database query failed: {db_error}")
            # Return basic viewer without findings
            exam_row = None
            findings_rows = []
        
        # Generate signed URLs for images
        original_url = None
        overlay_url = None
        
        if exam_row and exam_row['file_path']:
            try:
                # Original image
                bucket = storage_client.bucket(BUCKET_UPLOADS)
                blob = bucket.blob(exam_row['file_path'])
                original_url = blob.generate_signed_url(
                    expiration=datetime.utcnow().timestamp() + 3600  # 1 hour
                )
                
                # Overlay image (if exists)
                overlay_bucket = storage_client.bucket(BUCKET_OVERLAYS)
                overlay_blob = overlay_bucket.blob(f"{exam_id}_overlay.png")
                if overlay_blob.exists():
                    overlay_url = overlay_blob.generate_signed_url(
                        expiration=datetime.utcnow().timestamp() + 3600
                    )
            except Exception as url_error:
                logger.error(f"URL generation failed: {url_error}")
        
        # Prepare exam data
        exam_data = {
            "examId": exam_id,
            "originalImageUrl": original_url,
            "overlayImageUrl": overlay_url,
            "findings": [
                {
                    "tooth_number": row['tooth_number'],
                    "finding_type": row['finding_type'],
                    "severity": row['severity'],
                    "confidence": row['confidence'],
                    "coordinates": row['coordinates'],
                    "description": row['description']
                }
                for row in findings_rows
            ],
            "metadata": json.loads(exam_row['metadata']) if exam_row and exam_row['metadata'] else {},
            "status": exam_row['status'] if exam_row else "not_found",
            "analysisCompleted": exam_row['analysis_completed_at'] is not None if exam_row else False
        }
        
        # Return HTML viewer
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dental Exam Viewer</title>
            <style>
                body {{ margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }}
                .viewer-container {{ padding: 20px; max-width: 1200px; margin: 0 auto; }}
                .image-container {{ position: relative; margin-bottom: 20px; }}
                .dental-image {{ max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .overlay-image {{ position: absolute; top: 0; left: 0; max-width: 100%; height: auto; opacity: 0.7; }}
                .findings-panel {{ background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
                .finding-item {{ border-bottom: 1px solid #eee; padding: 10px 0; }}
                .finding-item:last-child {{ border-bottom: none; }}
                .status-badge {{ padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }}
                .status-completed {{ background: #22c55e; }}
                .status-processing {{ background: #f59e0b; }}
                .status-uploaded {{ background: #3b82f6; }}
                .loading {{ text-align: center; padding: 40px; }}
            </style>
        </head>
        <body>
            <div class="viewer-container">
                <div id="exam-data" style="display: none;">{json.dumps(exam_data)}</div>
                
                <div class="image-container">
                    {f'<img src="{original_url}" class="dental-image" alt="Dental X-ray" />' if original_url else '<div class="loading">Image not available</div>'}
                    {f'<img src="{overlay_url}" class="overlay-image" alt="Analysis overlay" />' if overlay_url else ''}
                </div>
                
                <div class="findings-panel">
                    <h3>Analysis Results 
                        <span class="status-badge status-{exam_data['status']}">
                            {exam_data['status'].replace('_', ' ').title()}
                        </span>
                    </h3>
                    
                    <div id="findings-list">
                        {chr(10).join([f'''
                        <div class="finding-item">
                            <strong>Tooth {finding['tooth_number']}</strong> - {finding['finding_type']}<br>
                            <small>Severity: {finding['severity']} (Confidence: {finding['confidence']:.1%})</small><br>
                            <span>{finding['description']}</span>
                        </div>
                        ''' for finding in exam_data['findings']]) if exam_data['findings'] else '<p>No findings detected or analysis pending.</p>'}
                    </div>
                </div>
            </div>
            
            <script>
                // Notify parent window that viewer is ready
                if (window.parent !== window) {{
                    window.parent.postMessage({{
                        type: 'dental-viewer-ready',
                        examId: '{exam_id}',
                        data: {json.dumps(exam_data)}
                    }}, '*');
                }}
                
                // Auto-refresh if analysis is in progress
                if ('{exam_data['status']}' === 'processing' || '{exam_data['status']}' === 'uploaded') {{
                    setTimeout(() => {{
                        window.location.reload();
                    }}, 10000); // Refresh every 10 seconds
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Viewer error: {e}")
        raise HTTPException(status_code=500, detail=f"Viewer failed: {str(e)}")

@app.get("/api/exam/{exam_id}")
async def get_exam_data(exam_id: str, authorization: str = None):
    """Get exam data as JSON - for API access"""
    try:
        # Validate API key
        api_key = extract_api_key(authorization)
        tenant_info = await validate_api_key(api_key)
        tenant_id = tenant_info["tenant_id"]
        
        # Get exam data (reuse logic from embed_viewer)
        conn = await get_db_connection()
        exam_row = await conn.fetchrow("""
            SELECT id, tenant_id, original_filename, file_path, 
                   metadata, status, created_at, analysis_completed_at
            FROM dental_exams 
            WHERE id = $1 AND tenant_id = $2
        """, exam_id, tenant_id)
        
        if not exam_row:
            await conn.close()
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Get findings
        findings_rows = await conn.fetchall("""
            SELECT tooth_number, finding_type, severity, confidence, 
                   coordinates, description, created_at
            FROM dental_findings 
            WHERE exam_id = $1
            ORDER BY created_at
        """, exam_id)
        
        await conn.close()
        
        return {
            "examId": exam_id,
            "status": exam_row['status'],
            "findings": [
                {
                    "tooth_number": row['tooth_number'],
                    "finding_type": row['finding_type'],
                    "severity": row['severity'],
                    "confidence": row['confidence'],
                    "coordinates": row['coordinates'],
                    "description": row['description']
                }
                for row in findings_rows
            ],
            "metadata": json.loads(exam_row['metadata']) if exam_row['metadata'] else {},
            "analysisCompleted": exam_row['analysis_completed_at'] is not None,
            "createdAt": exam_row['created_at'].isoformat() if exam_row['created_at'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get exam data error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get exam data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))