# ============================================================================
# NEXOVA AI Service — Production Dockerfile
# ============================================================================
# Multi-stage build for minimal image size.
# Stage 1: Install dependencies
# Stage 2: Copy only what's needed for runtime

# --- Stage 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Stage 2: Runtime ---
FROM python:3.11-slim

LABEL maintainer="NEXOVA AI Team"
LABEL description="NEXOVA AI Inference Service — Industrial IoT ML Platform"
LABEL version="3.0.0"

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import httpx; r = httpx.get('http://localhost:8000/health'); assert r.status_code == 200"

EXPOSE 8000

# Run with uvicorn (4 workers for production concurrency)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--log-level", "info"]
