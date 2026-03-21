import logging
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import requests
from PIL import Image
from rq import get_current_job

from .config import settings
from .storage import persist_output_image

_PIPELINE = None
_HTTP_SESSION: Optional[requests.Session] = None
_LOGGER = logging.getLogger("omafit.tryon.worker")


def _get_session() -> requests.Session:
    global _HTTP_SESSION
    if _HTTP_SESSION is None:
        _HTTP_SESSION = requests.Session()
    return _HTTP_SESSION


def _set_job_meta(**kwargs) -> None:
    job = get_current_job()
    if not job:
        return
    job.meta.update(kwargs)
    job.save_meta()


def _update_stage(stage: str, timings: Optional[dict] = None, **extra_meta) -> None:
    payload = {"status": "processing", "stage": stage}
    if timings is not None:
        payload["timings"] = timings
    payload.update(extra_meta)
    _set_job_meta(**payload)


def _download_image(url: str, target_path: Path) -> dict:
    started = time.perf_counter()
    session = _get_session()
    response = session.get(url, timeout=60)
    response.raise_for_status()
    target_path.write_bytes(response.content)
    elapsed = round(time.perf_counter() - started, 3)
    return {
        "url": url,
        "bytes": len(response.content),
        "status_code": response.status_code,
        "content_type": response.headers.get("content-type"),
        "seconds": elapsed,
    }


def _download_images_parallel(
    person_url: str,
    garment_url: str,
    person_path: Path,
    garment_path: Path,
) -> dict:
    """Baixa pessoa e roupa em paralelo para reduzir tempo total de download."""
    results = {}
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {
            ex.submit(_download_image, person_url, person_path): "person",
            ex.submit(_download_image, garment_url, garment_path): "garment",
        }
        for fut in as_completed(futures):
            label = futures[fut]
            results[label] = fut.result()
    return results


def _load_pipeline():
    global _PIPELINE
    started = time.perf_counter()
    cache_hit = _PIPELINE is not None
    if _PIPELINE is None:
        import torch
        from fashn_vton import TryOnPipeline

        # Otimizações GPU (sem perda de qualidade)
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cudnn.benchmark = True  # escolhe algoritmos mais rápidos

        _PIPELINE = TryOnPipeline(weights_dir=str(settings.weights_dir))
    return _PIPELINE, round(time.perf_counter() - started, 3), cache_hit


def run_tryon_job(
    *,
    person_image_url: str,
    garment_image_url: str,
    category: str,
    session_id: Optional[str] = None,
    public_id: Optional[str] = None,
) -> dict:
    job = get_current_job()
    job_id = job.id if job else "manual-run"
    start = time.perf_counter()
    timings = {
        "download_person_seconds": 0.0,
        "download_garment_seconds": 0.0,
        "download_total_seconds": 0.0,
        "person_image_bytes": 0,
        "garment_image_bytes": 0,
        "decode_seconds": 0.0,
        "pipeline_load_seconds": 0.0,
        "pipeline_cache_hit": False,
        "inference_seconds": 0.0,
        "save_output_seconds": 0.0,
        "persist_output_seconds": 0.0,
        "total_seconds": 0.0,
    }
    _set_job_meta(
        status="processing",
        stage="queued",
        session_id=session_id,
        public_id=public_id,
        started_at=time.time(),
        timings=timings,
    )
    _LOGGER.info(
        "[tryon-job:%s] started category=%s session_id=%s public_id=%s",
        job_id,
        category,
        session_id or "-",
        public_id or "-",
    )

    try:
        with tempfile.TemporaryDirectory(prefix="omafit-tryon-") as temp_dir:
            temp_path = Path(temp_dir)
            person_path = temp_path / "person.png"
            garment_path = temp_path / "garment.png"
            output_path = temp_path / "output.png"

            _update_stage("downloading", timings=timings)
            download_started = time.perf_counter()
            download_results = _download_images_parallel(
                person_image_url,
                garment_image_url,
                person_path,
                garment_path,
            )
            timings["download_total_seconds"] = round(time.perf_counter() - download_started, 3)
            timings["download_person_seconds"] = download_results.get("person", {}).get("seconds", 0.0)
            timings["download_garment_seconds"] = download_results.get("garment", {}).get("seconds", 0.0)
            timings["person_image_bytes"] = download_results.get("person", {}).get("bytes", 0)
            timings["garment_image_bytes"] = download_results.get("garment", {}).get("bytes", 0)
            _LOGGER.info(
                "[tryon-job:%s] download person=%.3fs garment=%.3fs total=%.3fs person_bytes=%s garment_bytes=%s",
                job_id,
                timings["download_person_seconds"],
                timings["download_garment_seconds"],
                timings["download_total_seconds"],
                timings["person_image_bytes"],
                timings["garment_image_bytes"],
            )

            _update_stage("decoding", timings=timings)
            decode_started = time.perf_counter()
            person_image = Image.open(person_path).convert("RGB")
            garment_image = Image.open(garment_path).convert("RGB")
            timings["decode_seconds"] = round(time.perf_counter() - decode_started, 3)
            _LOGGER.info(
                "[tryon-job:%s] decode seconds=%.3f person_size=%sx%s garment_size=%sx%s",
                job_id,
                timings["decode_seconds"],
                person_image.width,
                person_image.height,
                garment_image.width,
                garment_image.height,
            )

            _update_stage("loading_pipeline", timings=timings)
            pipeline, pipeline_load_seconds, pipeline_cache_hit = _load_pipeline()
            timings["pipeline_load_seconds"] = pipeline_load_seconds
            timings["pipeline_cache_hit"] = pipeline_cache_hit
            _LOGGER.info(
                "[tryon-job:%s] pipeline load seconds=%.3f cache_hit=%s",
                job_id,
                timings["pipeline_load_seconds"],
                timings["pipeline_cache_hit"],
            )

            _update_stage("inferencing", timings=timings)
            inference_start = time.perf_counter()
            # num_timesteps=20: mais rápido (~33% menos steps que 30)
            result = pipeline(
                person_image,
                garment_image,
                category=category,
                num_timesteps=settings.num_timesteps,
            )
            timings["inference_seconds"] = round(time.perf_counter() - inference_start, 3)
            _LOGGER.info(
                "[tryon-job:%s] inference seconds=%.3f num_timesteps=%s",
                job_id,
                timings["inference_seconds"],
                settings.num_timesteps,
            )

            _update_stage("saving_output", timings=timings)
            save_started = time.perf_counter()
            result.images[0].save(output_path)
            timings["save_output_seconds"] = round(time.perf_counter() - save_started, 3)

            _update_stage("persisting_output", timings=timings)
            persist_started = time.perf_counter()
            result_url = persist_output_image(output_path, job_id)
            timings["persist_output_seconds"] = round(time.perf_counter() - persist_started, 3)
            timings["total_seconds"] = round(time.perf_counter() - start, 3)
            _LOGGER.info(
                "[tryon-job:%s] persist seconds=%.3f save_output=%.3f total=%.3f result_url=%s",
                job_id,
                timings["persist_output_seconds"],
                timings["save_output_seconds"],
                timings["total_seconds"],
                result_url,
            )

            _set_job_meta(
                status="completed",
                stage="completed",
                result_url=result_url,
                timings=timings,
                completed_at=time.time(),
            )

            return {
                "result_url": result_url,
                "timings": timings,
            }
    except Exception as exc:
        timings["total_seconds"] = round(time.perf_counter() - start, 3)
        _set_job_meta(
            status="failed",
            stage="failed",
            error=str(exc),
            timings=timings,
            completed_at=time.time(),
        )
        _LOGGER.exception("[tryon-job:%s] failed after %.3fs", job_id, timings["total_seconds"])
        raise
