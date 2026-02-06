# ABOUTME: S3 storage helpers for lab result PDFs.
# ABOUTME: Upload PDFs and generate presigned download URLs.

import boto3
import structlog

from nove.config import settings

logger = structlog.get_logger()


def _get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


def upload_pdf(key: str, data: bytes) -> None:
    """Upload a PDF to S3. Skips if AWS credentials are not configured."""
    if not settings.aws_access_key_id:
        logger.warning("s3_upload_skipped", reason="no_aws_credentials", key=key)
        return

    client = _get_s3_client()
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=data,
        ContentType="application/pdf",
    )
    logger.info("s3_upload_ok", key=key)


def generate_download_url(key: str, expires_in: int = 3600) -> str:
    """Generate a presigned S3 URL for downloading a PDF."""
    client = _get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
