import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    auth_token: str
    num_timesteps: int
    redis_url: str
    queue_name: str
    host: str
    port: int
    public_base_url: str
    output_storage_backend: str
    outputs_dir: Path
    weights_dir: Path
    job_timeout: int
    result_ttl: int
    supabase_url: str
    supabase_service_role_key: str
    supabase_output_bucket: str
    supabase_output_prefix: str
    s3_bucket_name: str
    s3_region: str
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_endpoint_url: str
    s3_public_base_url: str
    s3_output_prefix: str


def load_settings() -> Settings:
    outputs_dir = Path(os.getenv("OUTPUTS_DIR", "./outputs")).resolve()
    weights_dir = Path(os.getenv("WEIGHTS_DIR", "./weights")).resolve()
    outputs_dir.mkdir(parents=True, exist_ok=True)
    weights_dir.mkdir(parents=True, exist_ok=True)

    num_timesteps = int(os.getenv("NUM_TIMESTEPS", "20"))
    if num_timesteps < 15:
        num_timesteps = 15
    elif num_timesteps > 50:
        num_timesteps = 50

    return Settings(
        auth_token=os.getenv("FASHN_TRYON_AUTH_TOKEN", ""),
        num_timesteps=num_timesteps,
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        queue_name=os.getenv("RQ_QUEUE_NAME", "tryon"),
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        public_base_url=os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
        output_storage_backend=os.getenv("OUTPUT_STORAGE_BACKEND", "local").strip().lower(),
        outputs_dir=outputs_dir,
        weights_dir=weights_dir,
        job_timeout=int(os.getenv("RQ_JOB_TIMEOUT", "900")),
        result_ttl=int(os.getenv("RQ_RESULT_TTL", "86400")),
        supabase_url=os.getenv("SUPABASE_URL", "").rstrip("/"),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_output_bucket=os.getenv("SUPABASE_OUTPUT_BUCKET", "tryon-images"),
        supabase_output_prefix=os.getenv("SUPABASE_OUTPUT_PREFIX", "self-hosted-results").strip("/"),
        s3_bucket_name=os.getenv("S3_BUCKET_NAME", ""),
        s3_region=os.getenv("S3_REGION", ""),
        s3_access_key_id=os.getenv("S3_ACCESS_KEY_ID", ""),
        s3_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY", ""),
        s3_endpoint_url=os.getenv("S3_ENDPOINT_URL", "").rstrip("/"),
        s3_public_base_url=os.getenv("S3_PUBLIC_BASE_URL", "").rstrip("/"),
        s3_output_prefix=os.getenv("S3_OUTPUT_PREFIX", "self-hosted-results").strip("/"),
    )


settings = load_settings()
