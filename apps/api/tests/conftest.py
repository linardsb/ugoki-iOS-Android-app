import os
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from unittest.mock import MagicMock

from src.db.base import Base
from src.db import get_db
from src.main import app
from src.core.rate_limit import limiter


TEST_DB_PATH = "./test_ugoki.db"


@pytest.fixture(scope="session", autouse=True)
def disable_rate_limiting():
    """Disable rate limiting for all tests."""
    # Store original state
    original_enabled = limiter.enabled

    # Disable rate limiting
    limiter.enabled = False

    yield

    # Restore original state
    limiter.enabled = original_enabled


@pytest.fixture(scope="function")
async def db_session():
    """Create a fresh database for each test."""
    # Remove test database file if exists
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

    # Create a fresh file-based database for each test
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{TEST_DB_PATH}",
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with TestSessionLocal() as session:
        yield session

    await engine.dispose()

    # Clean up test database file
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession):
    """Create a test client with database override."""

    async def override_get_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
