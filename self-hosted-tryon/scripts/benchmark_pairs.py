import argparse
import json
import time
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark simples da API self-hosted do Omafit.")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--token", required=True)
    parser.add_argument("--pairs", required=True, help="JSON com lista de pares para teste.")
    args = parser.parse_args()

    pairs_path = Path(args.pairs)
    pairs = json.loads(pairs_path.read_text(encoding="utf-8"))
    headers = {"Authorization": f"Bearer {args.token}"}

    results = []
    for pair in pairs:
        submit = requests.post(
            f"{args.base_url.rstrip('/')}/jobs",
            headers={**headers, "Content-Type": "application/json"},
            json=pair,
            timeout=60,
        )
        submit.raise_for_status()
        job_id = submit.json()["job_id"]
        started_at = time.time()

        while True:
            status = requests.get(f"{args.base_url.rstrip('/')}/jobs/{job_id}", headers=headers, timeout=60)
            status.raise_for_status()
            payload = status.json()
            if payload["status"] in {"completed", "failed"}:
                break
            time.sleep(3)

        results.append(
            {
                "job_id": job_id,
                "input": pair,
                "status": payload["status"],
                "result_url": payload.get("result_url"),
                "timings": payload.get("timings"),
                "elapsed_seconds": round(time.time() - started_at, 3),
                "error": payload.get("error"),
            }
        )

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
