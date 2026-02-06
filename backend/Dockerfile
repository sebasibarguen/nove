# ABOUTME: Production Dockerfile for the Nove FastAPI backend.
# ABOUTME: Uses uv for fast dependency installation, runs migrations on start.

FROM python:3.13-slim AS base

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install production dependencies only
RUN uv sync --frozen --no-dev --no-editable

# Copy application code
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY src/ ./src/

# Run migrations then start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn nove.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
