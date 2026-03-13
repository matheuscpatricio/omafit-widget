from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from redis import Redis
from rq import Queue
from rq.job import Job

from .config import settings
from .schemas import JobStatusResponse, SubmitJobRequest, SubmitJobResponse
from .worker import run_tryon_job

app = FastAPI(title="Omafit Self-Hosted Try-On", version="1.0.0")
app.mount("/outputs", StaticFiles(directory=str(settings.outputs_dir)), name="outputs")


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue() -> Queue:
    return Queue(settings.queue_name, connection=get_redis(), default_timeout=settings.job_timeout)


def require_auth(authorization: Optional[str] = Header(default=None)) -> None:
    if not settings.auth_token:
        return
    expected = f"Bearer {settings.auth_token}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def healthcheck() -> dict:
    return {
        "ok": True,
        "queue": settings.queue_name,
        "output_storage_backend": settings.output_storage_backend,
        "outputs_dir": str(settings.outputs_dir),
        "weights_dir": str(settings.weights_dir),
        "num_timesteps": settings.num_timesteps,
    }


@app.post("/jobs", response_model=SubmitJobResponse, dependencies=[Depends(require_auth)])
def submit_job(payload: SubmitJobRequest, queue: Queue = Depends(get_queue)) -> SubmitJobResponse:
    job = queue.enqueue(
        run_tryon_job,
        person_image_url=str(payload.person_image_url),
        garment_image_url=str(payload.garment_image_url),
        category=payload.category,
        session_id=payload.session_id,
        public_id=payload.public_id,
        result_ttl=settings.result_ttl,
    )
    job.meta.update(
        {
            "status": "queued",
            "session_id": payload.session_id,
            "public_id": payload.public_id,
        }
    )
    job.save_meta()
    return SubmitJobResponse(job_id=job.id, status="queued")


@app.get("/jobs/{job_id}", response_model=JobStatusResponse, dependencies=[Depends(require_auth)])
def get_job_status(job_id: str, redis: Redis = Depends(get_redis)) -> JobStatusResponse:
    try:
        job = Job.fetch(job_id, connection=redis)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}") from exc

    if job.is_finished:
        result = job.result or {}
        return JobStatusResponse(
            job_id=job.id,
            status="completed",
            result_url=result.get("result_url"),
            timings=result.get("timings"),
        )

    if job.is_failed:
        error = job.meta.get("error") or (job.exc_info.splitlines()[-1] if job.exc_info else "Job failed")
        return JobStatusResponse(job_id=job.id, status="failed", error=error)

    meta_status = job.meta.get("status") or ("processing" if job.is_started else "queued")
    return JobStatusResponse(job_id=job.id, status=meta_status)
