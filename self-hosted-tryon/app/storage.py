import mimetypes
import shutil
from pathlib import Path

import boto3
import requests

from .config import settings


def _content_type_for(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "image/png"


def _persist_locally(source_path: Path, job_id: str) -> str:
    extension = source_path.suffix or ".png"
    target_name = f"{job_id}{extension}"
    target_path = settings.outputs_dir / target_name
    shutil.copy2(source_path, target_path)
    return f"{settings.public_base_url}/outputs/{target_name}"


def _persist_to_supabase(source_path: Path, job_id: str) -> str:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase output storage.")

    extension = source_path.suffix or ".png"
    object_key = f"{settings.supabase_output_prefix}/{job_id}{extension}".strip("/")
    upload_url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_output_bucket}/{object_key}"

    response = requests.post(
        upload_url,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": _content_type_for(source_path),
            "x-upsert": "true",
        },
        data=source_path.read_bytes(),
        timeout=120,
    )
    response.raise_for_status()

    return f"{settings.supabase_url}/storage/v1/object/public/{settings.supabase_output_bucket}/{object_key}"


def _persist_to_s3(source_path: Path, job_id: str) -> str:
    if not settings.s3_bucket_name:
        raise RuntimeError("S3_BUCKET_NAME is required for S3 output storage.")

    extension = source_path.suffix or ".png"
    object_key = f"{settings.s3_output_prefix}/{job_id}{extension}".strip("/")

    client = boto3.client(
        "s3",
        region_name=settings.s3_region or None,
        aws_access_key_id=settings.s3_access_key_id or None,
        aws_secret_access_key=settings.s3_secret_access_key or None,
        endpoint_url=settings.s3_endpoint_url or None,
    )

    extra_args = {
        "ContentType": _content_type_for(source_path),
    }

    if not settings.s3_endpoint_url:
        extra_args["ACL"] = "public-read"

    client.upload_file(str(source_path), settings.s3_bucket_name, object_key, ExtraArgs=extra_args)

    if settings.s3_public_base_url:
        return f"{settings.s3_public_base_url}/{object_key}"

    if settings.s3_region:
        return f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com/{object_key}"

    return f"https://{settings.s3_bucket_name}.s3.amazonaws.com/{object_key}"


def persist_output_image(source_path: Path, job_id: str) -> str:
    backend = settings.output_storage_backend

    if backend == "supabase":
        return _persist_to_supabase(source_path, job_id)

    if backend == "s3":
        return _persist_to_s3(source_path, job_id)

    return _persist_locally(source_path, job_id)
