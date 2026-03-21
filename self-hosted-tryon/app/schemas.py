from typing import Literal, Optional

from pydantic import BaseModel, Field, HttpUrl


class SubmitJobRequest(BaseModel):
    person_image_url: HttpUrl
    garment_image_url: HttpUrl
    category: Literal["tops", "bottoms", "one-pieces"] = "tops"
    session_id: Optional[str] = None
    public_id: Optional[str] = None


class SubmitJobResponse(BaseModel):
    job_id: str
    status: Literal["queued"]


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    stage: Optional[str] = None
    result_url: Optional[str] = None
    error: Optional[str] = None
    timings: Optional[dict] = Field(default=None)
