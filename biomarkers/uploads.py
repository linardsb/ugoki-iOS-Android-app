"""
Bloodwork Upload Endpoint

Simple endpoint for uploading bloodwork PDFs/images.
Parses immediately and stores results in METRICS.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import Optional
from datetime import date
from pydantic import BaseModel

from src.core.auth import get_current_identity
from src.services.bloodwork_parser import BloodworkParserService, BloodworkResult, ParsedBiomarker
from src.modules.metrics.service import MetricsService


router = APIRouter(prefix="/uploads", tags=["uploads"])


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class BloodworkUploadResponse(BaseModel):
    """Response from bloodwork upload."""
    success: bool
    test_date: Optional[date]
    biomarker_count: int
    biomarkers: list[ParsedBiomarker]
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "test_date": "2024-12-15",
                "biomarker_count": 12,
                "biomarkers": [
                    {
                        "raw_name": "Hb",
                        "standardised_name": "haemoglobin",
                        "value": 142,
                        "value_text": "142",
                        "unit": "g/L",
                        "reference_low": 130,
                        "reference_high": 170,
                        "flag": "normal"
                    }
                ],
                "message": "Successfully parsed 12 biomarkers."
            }
        }


# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────

async def get_bloodwork_parser(
    metrics: MetricsService = Depends()
) -> BloodworkParserService:
    """Dependency injection for bloodwork parser."""
    return BloodworkParserService(metrics_service=metrics)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/bloodwork", response_model=BloodworkUploadResponse)
async def upload_bloodwork(
    file: UploadFile = File(..., description="PDF or image of blood test results"),
    test_date: Optional[date] = None,
    identity = Depends(get_current_identity),
    parser: BloodworkParserService = Depends(get_bloodwork_parser)
):
    """
    Upload and parse bloodwork results.
    
    Accepts PDF, JPG, or PNG files containing blood test results.
    Extracts biomarkers and stores them for AI coach analysis.
    
    **Supported formats:**
    - PDF (text-based or scanned)
    - JPG/JPEG images
    - PNG images
    
    **Returns:**
    - Parsed biomarkers with values, units, and reference ranges
    - Flag indicating if values are low/normal/high
    
    **Example usage:**
    ```
    curl -X POST /uploads/bloodwork \\
      -H "Authorization: Bearer <token>" \\
      -F "file=@blood_test.pdf" \\
      -F "test_date=2024-12-15"
    ```
    """
    # Validate file type
    allowed_types = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png"
    }
    
    content_type = file.content_type
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Use PDF, JPG, or PNG."
        )
    
    file_type = allowed_types[content_type]
    
    # Validate file size (max 10MB)
    file_bytes = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    
    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )
    
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded."
        )
    
    # Parse and store
    result = await parser.parse_and_store(
        identity_id=identity.id,
        file_bytes=file_bytes,
        file_type=file_type,
        test_date=test_date
    )
    
    return BloodworkUploadResponse(
        success=result.success,
        test_date=result.test_date,
        biomarker_count=result.biomarker_count,
        biomarkers=result.biomarkers,
        message=result.message
    )


@router.get("/bloodwork/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats for bloodwork upload."""
    return {
        "formats": [
            {"mime_type": "application/pdf", "extension": ".pdf", "description": "PDF document"},
            {"mime_type": "image/jpeg", "extension": ".jpg", "description": "JPEG image"},
            {"mime_type": "image/png", "extension": ".png", "description": "PNG image"}
        ],
        "max_file_size_mb": 10,
        "notes": [
            "Text-based PDFs work best",
            "For photos, ensure good lighting and focus",
            "Include the full results page with reference ranges"
        ]
    }
