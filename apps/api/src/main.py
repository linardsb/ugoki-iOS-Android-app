from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.core.config import settings
from src.core.rate_limit import limiter
from src.modules.identity.routes import router as identity_router
from src.modules.time_keeper.routes import router as time_keeper_router
from src.modules.metrics.routes import router as metrics_router
from src.modules.progression.routes import router as progression_router
from src.modules.content.routes import router as content_router
from src.modules.ai_coach.routes import router as ai_coach_router
from src.modules.notification.routes import router as notification_router
from src.modules.profile.routes import router as profile_router
from src.modules.event_journal.routes import router as event_journal_router
from src.modules.social.routes import router as social_router
from src.modules.research.routes import router as research_router
from src.routes.uploads import router as uploads_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting - attach limiter to app state and register exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - environment-aware configuration
def get_cors_origins() -> list[str]:
    """
    Get CORS origins based on environment configuration.

    - If cors_origins is set in config, use those specific origins
    - In development with no cors_origins set, allow all origins (*)
    - In production, cors_origins MUST be set (enforced by config validator)
    """
    if settings.cors_origins:
        return settings.cors_origins
    if settings.environment == "development":
        return ["*"]  # Allow all origins only in development
    return []  # Production requires explicit config (validator prevents this)


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": settings.app_name}


# Module routers
app.include_router(identity_router, prefix=f"{settings.api_v1_prefix}/identity")
app.include_router(time_keeper_router, prefix=f"{settings.api_v1_prefix}/time-keeper")
app.include_router(metrics_router, prefix=f"{settings.api_v1_prefix}/metrics")
app.include_router(progression_router, prefix=f"{settings.api_v1_prefix}/progression")
app.include_router(content_router, prefix=f"{settings.api_v1_prefix}/content")
app.include_router(ai_coach_router, prefix=f"{settings.api_v1_prefix}/coach")
app.include_router(notification_router, prefix=f"{settings.api_v1_prefix}/notifications")
app.include_router(profile_router, prefix=f"{settings.api_v1_prefix}/profile")
app.include_router(event_journal_router, prefix=f"{settings.api_v1_prefix}/events")
app.include_router(social_router, prefix=f"{settings.api_v1_prefix}/social")
app.include_router(research_router, prefix=f"{settings.api_v1_prefix}/research")
app.include_router(uploads_router, prefix=f"{settings.api_v1_prefix}")
