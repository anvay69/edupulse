import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.documents import workspace_router
from app.api.health import router as health_router
from app.api.notices import router as notices_router
from app.database.session import Base, SessionLocal, engine
from app.services.notice_service import seed_demo_documents, seed_demo_notices
from app.services.user_service import seed_demo_users

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_users(db)
        seed_demo_notices(db)
        seed_demo_documents(db)
    yield


app = FastAPI(title="EduPulse AI backend", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(notices_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
