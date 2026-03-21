import logging

from redis import Redis
from rq import Queue, SimpleWorker

from .config import settings
from .worker import _load_pipeline


_LOGGER = logging.getLogger("omafit.tryon.bootstrap")


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    redis = Redis.from_url(settings.redis_url)
    queue = Queue(
        settings.queue_name,
        connection=redis,
        default_timeout=settings.job_timeout,
    )

    try:
        _, load_seconds, cache_hit = _load_pipeline()
        _LOGGER.info(
            "Pipeline preloaded before starting worker (seconds=%.3f, cache_hit=%s)",
            load_seconds,
            cache_hit,
        )
    except Exception:
        _LOGGER.exception("Pipeline preload failed; worker will retry lazily on first job")

    worker = SimpleWorker([queue], connection=redis)
    _LOGGER.info("Starting SimpleWorker for queue=%s", settings.queue_name)
    worker.work()


if __name__ == "__main__":
    main()
