from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(uploads_router, prefix=f"{settings.api_v1_prefix}")
