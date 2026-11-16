"""FastAPI application entry point.  Run with:  uvicorn app.main:app --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine
from .routers import auth, progress, tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the tables on first start. Safe to run every time: existing tables are left alone.
    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()

app = FastAPI(title="My Growth Tracker API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,  # we use an Authorization header, not cookies
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(progress.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
