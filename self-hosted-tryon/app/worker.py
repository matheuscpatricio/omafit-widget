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


def _download_image(url: str, target_path: Path) -> None:
    session = _get_session()
    response = session.get(url, timeout=60)
    response.raise_for_status()
    target_path.write_bytes(response.content)


def _download_images_parallel(
    person_url: str,
    garment_url: str,
    person_path: Path,
    garment_path: Path,
) -> None:
    """Baixa pessoa e roupa em paralelo para reduzir tempo total de download."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        futures = {
            ex.submit(_download_image, person_url, person_path): "person",
            ex.submit(_download_image, garment_url, garment_path): "garment",
        }
        for fut in as_completed(futures):
            fut.result()


def _load_pipeline():
    global _PIPELINE
    if _PIPELINE is None:
        import torch
        from fashn_vton import TryOnPipeline

        # Otimizações GPU (sem perda de qualidade)
        if torch.cuda.is_available():
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.backends.cudnn.benchmark = True  # escolhe algoritmos mais rápidos

        _PIPELINE = TryOnPipeline(weights_dir=str(settings.weights_dir))
    return _PIPELINE


def run_tryon_job(
    *,
    person_image_url: str,
    garment_image_url: str,
    category: str,
    session_id: Optional[str] = None,
    public_id: Optional[str] = None,
) -> dict:
    start = time.perf_counter()
    _set_job_meta(
        status="processing",
        session_id=session_id,
        public_id=public_id,
        started_at=time.time(),
    )

    try:
        with tempfile.TemporaryDirectory(prefix="omafit-tryon-") as temp_dir:
            temp_path = Path(temp_dir)
            person_path = temp_path / "person.png"
            garment_path = temp_path / "garment.png"
            output_path = temp_path / "output.png"

            _download_images_parallel(
                person_image_url,
                garment_image_url,
                person_path,
                garment_path,
            )

            person_image = Image.open(person_path).convert("RGB")
            garment_image = Image.open(garment_path).convert("RGB")

            pipeline = _load_pipeline()
            inference_start = time.perf_counter()
            # num_timesteps=20: mais rápido (~33% menos steps que 30)
            result = pipeline(
                person_image,
                garment_image,
                category=category,
                num_timesteps=settings.num_timesteps,
            )
            inference_seconds = round(time.perf_counter() - inference_start, 3)
            result.images[0].save(output_path)

            current_job = get_current_job()
            result_url = persist_output_image(output_path, current_job.id if current_job else "manual-run")
            total_seconds = round(time.perf_counter() - start, 3)
            timings = {
                "download_seconds": round(inference_start - start, 3),
                "inference_seconds": inference_seconds,
                "total_seconds": total_seconds,
            }

            _set_job_meta(
                status="completed",
                result_url=result_url,
                timings=timings,
                completed_at=time.time(),
            )

            return {
                "result_url": result_url,
                "timings": timings,
            }
    except Exception as exc:
        _set_job_meta(
            status="failed",
            error=str(exc),
            completed_at=time.time(),
        )
        raise
