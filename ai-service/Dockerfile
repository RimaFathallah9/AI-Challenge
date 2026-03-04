# ============================================================================
# NEXOVA AI Service — Production Dockerfile (GPU + CPU)
# ============================================================================
# Multi-stage build with NVIDIA CUDA runtime for GPU-accelerated inference.
#
# Build targets:
#   GPU  (default):  docker build -t nexova-ai .
#   CPU  only:       docker build --build-arg BASE_IMAGE=python:3.12-slim \
#                                 --build-arg TORCH_INDEX="" -t nexova-ai-cpu .
#
# Run:
#   GPU:  docker run --gpus all -p 8000:8000 nexova-ai
#   CPU:  docker run -p 8000:8000 nexova-ai-cpu
# ============================================================================

# Configurable base image  — override with --build-arg for CPU-only builds
ARG BASE_IMAGE=nvidia/cuda:12.4.1-runtime-ubuntu22.04

# --- Stage 1: Builder ---
FROM ${BASE_IMAGE} AS builder

# Install Python 3.12 + build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3.12 python3.12-venv python3.12-dev python3-pip \
        gcc g++ && \
    ln -sf /usr/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/bin/python3.12 /usr/bin/python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# PyTorch index URL — CUDA wheels by default, override to "" for CPU
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu124

COPY requirements.txt .

# Install Python deps (with GPU PyTorch when TORCH_INDEX is set)
RUN if [ -n "$TORCH_INDEX" ]; then \
        pip install --no-cache-dir --prefix=/install \
            torch --index-url ${TORCH_INDEX} && \
        pip install --no-cache-dir --prefix=/install -r requirements.txt; \
    else \
        pip install --no-cache-dir --prefix=/install -r requirements.txt; \
    fi

# --- Stage 2: Runtime ---
FROM ${BASE_IMAGE}

LABEL maintainer="NEXOVA AI Team"
LABEL description="NEXOVA AI Inference Service — Industrial IoT ML Platform v3.0"
LABEL version="3.0.0"

# Install Python 3.12 runtime only
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3.12 python3.12-venv && \
    ln -sf /usr/bin/python3.12 /usr/bin/python && \
    ln -sf /usr/bin/python3.12 /usr/bin/python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY config/ ./config/
COPY pipeline/ ./pipeline/
COPY services/ ./services/
COPY models/ ./models/
COPY main.py .

# Create directories for data and model artifacts
RUN mkdir -p /app/data /app/models/trained

# Non-root user for security
RUN useradd -m -r nexova && chown -R nexova:nexova /app
USER nexova

# Environment variables for optimal GPU usage
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health'); assert r.status_code == 200"

EXPOSE 8000

# Run with uvicorn (4 workers for production concurrency)
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
