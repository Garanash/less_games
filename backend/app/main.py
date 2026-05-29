from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.api import assets, auth, export, projects
from app.config import get_settings
from app.db.session import AsyncSessionLocal, engine
from app.models import Base, User
from app.services.auth import hash_password

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "demo@example.com"))
        if not result.scalar_one_or_none():
            demo_user = User(
                email="demo@example.com",
                password_hash=hash_password("demo12345"),
                is_verified=True,
            )
            session.add(demo_user)
            await session.commit()

    yield


app = FastAPI(title="Less Game Editor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(assets.router)
app.include_router(export.router)

upload_dir = Path(settings.local_upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)


@app.get("/media/{file_path:path}")
async def serve_media(file_path: str):
    full_path = upload_dir / file_path
    if not full_path.exists() or not full_path.is_file():
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(full_path)


@app.get("/health")
async def health():
    return {"status": "ok"}
