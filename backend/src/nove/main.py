# ABOUTME: FastAPI application factory and entrypoint.
# ABOUTME: Registers routers, middleware, and startup/shutdown events.

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nove.config import settings
from nove.deps import DB

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    logger.info("starting", app=settings.app_name)
    yield
    logger.info("shutting_down")


def create_app() -> FastAPI:
    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1)

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from nove.auth.router import router as auth_router
    from nove.coach.router import router as coach_router
    from nove.garmin.router import router as garmin_router
    from nove.labs.portal_router import router as portal_router
    from nove.labs.router import router as lab_router
    from nove.users.router import router as users_router

    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(users_router, prefix=settings.api_v1_prefix)
    app.include_router(coach_router, prefix=settings.api_v1_prefix)
    app.include_router(garmin_router, prefix=settings.api_v1_prefix)
    app.include_router(lab_router, prefix=settings.api_v1_prefix)
    app.include_router(portal_router, prefix=settings.api_v1_prefix)

    @app.get("/health")
    async def health(db: DB) -> dict[str, str]:
        from sqlalchemy import text

        await db.execute(text("SELECT 1"))
        return {"status": "ok"}

    return app


app = create_app()
