# Multi-stage build for Arketic FastAPI Backend
FROM python:3.11-slim AS base

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/home/arketic/.local/bin:$PATH" \
    PYTHONPATH="/app"

# Install system dependencies required for AI/ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    poppler-utils \
    ffmpeg \
    libsm6 \
    libxext6 \
    libfontconfig1 \
    libxrender1 \
    libgl1-mesa-glx \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash arketic
WORKDIR /app
RUN chown -R arketic:arketic /app

# Switch to non-root user
USER arketic

# Dependencies stage
FROM base AS deps
COPY requirements.txt .

# Install Python dependencies with optimizations
RUN pip install --user --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --user --no-cache-dir -r requirements.txt && \
    pip install --user --no-cache-dir gunicorn uvloop httptools

# Development stage (for hot reloading)
FROM deps AS development
COPY --chown=arketic:arketic . ./
RUN mkdir -p uploads logs temp && \
    chmod 755 uploads logs temp
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "debug"]

# Production stage
FROM base AS runner
COPY --from=deps --chown=arketic:arketic /home/arketic/.local /home/arketic/.local

# Copy application code
COPY --chown=arketic:arketic . ./

# Create necessary directories
RUN mkdir -p uploads logs temp && \
    chmod 755 uploads logs temp

# Expose port
EXPOSE 8000

# Health check using custom script with improved parameters
HEALTHCHECK --interval=30s --timeout=15s --start-period=40s --retries=3 \
  CMD python healthcheck.py || exit 1

# Run the application with production settings and performance optimizations
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--access-log", "--log-level", "info"]