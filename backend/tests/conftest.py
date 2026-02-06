# ABOUTME: Shared pytest fixtures for backend tests.
# ABOUTME: Provides async DB session, test client, and auth helpers.

import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from nove.config import settings
from nove.database import Base, get_db
from nove.main import create_app


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession]:
    engine = create_async_engine(settings.database_url)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient]:
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def make_auth_header() -> callable:
    """Create an Authorization header for a given user_id."""
    from nove.auth.service import create_access_token

    def _make(user_id: uuid.UUID) -> dict[str, str]:
        token = create_access_token(user_id)
        return {"Authorization": f"Bearer {token}"}

    return _make
