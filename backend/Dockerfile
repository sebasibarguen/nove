# ABOUTME: Production Dockerfile for the Nove FastAPI backend.
# ABOUTME: Uses uv for fast dependency installation, runs migrations on start.

FROM python:3.13-slim AS base

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies only (cache layer — invalidated only when deps change)
RUN uv sync --frozen --no-dev --no-editable --no-install-project

# Copy application code
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY src/ ./src/

# Install the project itself
RUN uv sync --frozen --no-dev --no-editable

# Run migrations then start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn nove.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
