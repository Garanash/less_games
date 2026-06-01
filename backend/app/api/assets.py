import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_verified_user
from app.api.projects import _get_owned_project
from app.config import get_settings
from app.db.session import get_db
from app.models import Asset, User
from app.schemas import AssetResponse
from app.services.storage import get_storage

router = APIRouter(prefix="/projects", tags=["assets"])

ALLOWED_KINDS = {"background", "character", "cg", "music", "sound", "voice"}
MIME_BY_KIND = {
    "background": {"image/png", "image/jpeg", "image/webp"},
    "character": {"image/png", "image/jpeg", "image/webp"},
    "cg": {"image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"},
    "music": {"audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"},
    "sound": {"audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"},
    "voice": {"audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav"},
}


def _max_size_for_kind(kind: str) -> int:
    settings = get_settings()
    if kind in {"music", "sound", "voice"}:
        return settings.max_audio_size
    return settings.max_background_size


@router.get("/{project_id}/assets", response_model=list[AssetResponse])
async def list_assets(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> list[AssetResponse]:
    project = await _get_owned_project(db, project_id, user.id)
    storage = get_storage()
    return [
        AssetResponse(
            id=a.id,
            kind=a.kind,
            filename=a.filename,
            mime_type=a.mime_type,
            size_bytes=a.size_bytes,
            url=storage.public_url(a.storage_key),
        )
        for a in project.assets
    ]


@router.post("/{project_id}/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    project_id: UUID,
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> AssetResponse:
    if kind not in ALLOWED_KINDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid asset kind")

    project = await _get_owned_project(db, project_id, user.id)
    content_type = file.content_type or "application/octet-stream"
    allowed_mimes = MIME_BY_KIND.get(kind, set())
    if content_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for {kind}: {content_type}",
        )

    data = await file.read()
    max_size = _max_size_for_kind(kind)
    if len(data) > max_size:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

    asset_id = uuid.uuid4()
    storage_key = f"{user.id}/{project_id}/{asset_id}/{file.filename}"
    storage = get_storage()
    await storage.upload(storage_key, data, content_type)

    asset = Asset(
        id=asset_id,
        project_id=project.id,
        user_id=user.id,
        kind=kind,
        filename=file.filename or "file",
        storage_key=storage_key,
        mime_type=content_type,
        size_bytes=len(data),
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return AssetResponse(
        id=asset.id,
        kind=asset.kind,
        filename=asset.filename,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        url=storage.public_url(asset.storage_key),
    )


@router.delete("/{project_id}/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    project_id: UUID,
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> None:
    project = await _get_owned_project(db, project_id, user.id)
    asset = next((a for a in project.assets if a.id == asset_id), None)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    storage = get_storage()
    await storage.delete(asset.storage_key)
    await db.delete(asset)
    await db.commit()


@router.patch("/{project_id}/assets/{asset_id}", response_model=AssetResponse)
async def rename_asset(
    project_id: UUID,
    asset_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> AssetResponse:
    filename = str(body.get("filename", "")).strip()
    if not filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename required")

    project = await _get_owned_project(db, project_id, user.id)
    asset = next((a for a in project.assets if a.id == asset_id), None)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    asset.filename = filename
    await db.commit()
    await db.refresh(asset)
    storage = get_storage()
    return AssetResponse(
        id=asset.id,
        kind=asset.kind,
        filename=asset.filename,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        url=storage.public_url(asset.storage_key),
    )
