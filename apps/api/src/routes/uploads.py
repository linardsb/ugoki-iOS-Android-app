"""
Upload Endpoints

Endpoints for file uploads: bloodwork, avatars, etc.
"""

import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Request
from typing import Optional
from datetime import date
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_db
from src.core.auth import get_current_identity
from src.core.rate_limit import limiter, RateLimits
from src.services.bloodwork_parser import BloodworkParserService, BloodworkResult, ParsedBiomarker
from src.services.storage import storage_service
from src.modules.metrics.service import MetricsService
from src.modules.profile.service import ProfileService
from src.modules.profile.models import UpdateProfileRequest


router = APIRouter(prefix="/uploads", tags=["uploads"])


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class BloodworkUploadResponse(BaseModel):
    """Response from bloodwork upload."""
    success: bool
    test_date: Optional[date] = None
    biomarker_count: int
    biomarkers: list[ParsedBiomarker]
    message: str

    model_config = {
        "json_schema_extra": {
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
    }


# ─────────────────────────────────────────────────────────────────────────────
# DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────

def get_bloodwork_parser(
    db: AsyncSession = Depends(get_db)
) -> BloodworkParserService:
    """Dependency injection for bloodwork parser."""
    metrics_service = MetricsService(db)
    return BloodworkParserService(metrics_service=metrics_service)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/bloodwork", response_model=BloodworkUploadResponse)
@limiter.limit(RateLimits.UPLOAD)
async def upload_bloodwork(
    request: Request,
    file: UploadFile = File(..., description="PDF or image of blood test results"),
    test_date: Optional[date] = Query(None, description="Override test date from document"),
    identity_id: str = Depends(get_current_identity),
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
    curl -X POST /uploads/bloodwork?identity_id=xxx \\
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
        identity_id=identity_id,
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


# ─────────────────────────────────────────────────────────────────────────────
# AVATAR UPLOAD
# ─────────────────────────────────────────────────────────────────────────────

class AvatarUploadResponse(BaseModel):
    """Response from avatar upload."""
    success: bool
    avatar_url: str
    message: str


def get_profile_service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    """Dependency injection for profile service."""
    return ProfileService(db)


@router.post("/avatar", response_model=AvatarUploadResponse)
@limiter.limit(RateLimits.UPLOAD)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(..., description="Avatar image (JPG or PNG)"),
    identity_id: str = Depends(get_current_identity),
    db: AsyncSession = Depends(get_db),
    profile_service: ProfileService = Depends(get_profile_service),
):
    """
    Upload a user avatar image.

    The image will be:
    - Validated (JPG/PNG only, max 5MB)
    - Resized to 400x400 square
    - Uploaded to cloud storage
    - Profile automatically updated with new avatar URL

    **Supported formats:**
    - JPG/JPEG images
    - PNG images

    **Returns:**
    - Public URL of the uploaded avatar
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/jpg", "image/png"}
    content_type = file.content_type

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Use JPG or PNG."
        )

    # Read and validate size
    file_bytes = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB

    if len(file_bytes) > max_size:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5MB."
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded."
        )

    # Get current profile to delete old avatar
    try:
        current_profile = await profile_service.get_profile(identity_id)
        old_avatar_url = current_profile.avatar_url if current_profile else None
    except Exception:
        old_avatar_url = None

    # Upload to R2
    try:
        avatar_url = storage_service.upload_avatar(
            file=io.BytesIO(file_bytes),
            identity_id=identity_id,
            content_type=content_type,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload avatar: {str(e)}"
        )

    # Update profile with new avatar URL
    await profile_service.update_profile(
        identity_id=identity_id,
        request=UpdateProfileRequest(avatar_url=avatar_url)
    )

    # Delete old avatar if exists
    if old_avatar_url:
        storage_service.delete_file(old_avatar_url)

    return AvatarUploadResponse(
        success=True,
        avatar_url=avatar_url,
        message="Avatar uploaded successfully."
    )


@router.delete("/avatar")
async def delete_avatar(
    identity_id: str = Depends(get_current_identity),
    profile_service: ProfileService = Depends(get_profile_service),
):
    """
    Delete user's avatar and reset to default (initials).
    """
    # Get current profile
    profile = await profile_service.get_profile(identity_id)

    if not profile or not profile.avatar_url:
        raise HTTPException(
            status_code=404,
            detail="No avatar to delete."
        )

    # Delete from storage
    storage_service.delete_file(profile.avatar_url)

    # Clear avatar URL in profile
    await profile_service.update_profile(
        identity_id=identity_id,
        request=UpdateProfileRequest(avatar_url=None)
    )

    return {"success": True, "message": "Avatar deleted."}
