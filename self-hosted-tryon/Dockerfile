FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/opt/fashn-vton/src

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir --index-url https://download.pytorch.org/whl/cu121 \
    torch torchvision
RUN pip3 install --no-cache-dir -r /app/requirements.txt

RUN git clone https://github.com/fashn-AI/fashn-vton-1.5.git /opt/fashn-vton && \
    pip3 install --no-cache-dir /opt/fashn-vton

COPY app /app/app
COPY .env.example /app/.env.example

RUN mkdir -p /app/outputs /app/weights

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
