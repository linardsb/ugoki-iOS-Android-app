"""Cloudflare R2 Storage Service.

S3-compatible object storage for user uploads (avatars, etc.)
"""

import io
import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config
from PIL import Image

from src.core.config import settings


class StorageService:
    """Service for uploading files to Cloudflare R2."""

    def __init__(self) -> None:
        self._client = None

    @property
    def client(self):
        """Lazy-load S3 client."""
        if self._client is None:
            if not settings.r2_account_id or not settings.r2_access_key_id:
                raise ValueError("R2 storage not configured. Set R2_* environment variables.")

            self._client = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"},
                ),
            )
        return self._client

    def upload_avatar(
        self,
        file: BinaryIO,
        identity_id: str,
        content_type: str,
        max_size: int = 400,
    ) -> str:
        """Upload and resize an avatar image.

        Args:
            file: Image file bytes
            identity_id: User identity for path organization
            content_type: MIME type (image/jpeg or image/png)
            max_size: Maximum dimension for resize (default 400px)

        Returns:
            Public URL of uploaded avatar
        """
        # Determine extension
        ext = "jpg" if "jpeg" in content_type or "jpg" in content_type else "png"

        # Read and resize image
        image = Image.open(file)

        # Convert RGBA to RGB for JPEG
        if image.mode == "RGBA" and ext == "jpg":
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background

        # Resize maintaining aspect ratio, then crop to square
        image.thumbnail((max_size * 2, max_size * 2), Image.Resampling.LANCZOS)

        # Center crop to square
        width, height = image.size
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        image = image.crop((left, top, left + min_dim, top + min_dim))

        # Final resize to exact size
        image = image.resize((max_size, max_size), Image.Resampling.LANCZOS)

        # Save to bytes
        output = io.BytesIO()
        save_format = "JPEG" if ext == "jpg" else "PNG"
        image.save(output, format=save_format, quality=85 if ext == "jpg" else None)
        output.seek(0)

        # Generate unique filename
        filename = f"avatars/{identity_id}/{uuid.uuid4().hex}.{ext}"

        # Upload to R2
        self.client.upload_fileobj(
            output,
            settings.r2_bucket_name,
            filename,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "public, max-age=31536000",  # 1 year cache
            },
        )

        # Return public URL
        return f"{settings.r2_public_url}/{filename}"

    def delete_file(self, url: str) -> bool:
        """Delete a file from R2 by its URL.

        Args:
            url: Public URL of the file

        Returns:
            True if deleted successfully
        """
        if not url or not settings.r2_public_url:
            return False

        # Extract key from URL
        key = url.replace(f"{settings.r2_public_url}/", "")

        try:
            self.client.delete_object(
                Bucket=settings.r2_bucket_name,
                Key=key,
            )
            return True
        except Exception:
            return False


# Singleton instance
storage_service = StorageService()
