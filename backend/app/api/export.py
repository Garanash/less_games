from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_verified_user
from app.api.projects import _get_owned_project
from app.db.session import get_db
from app.models import User
from app.services.renpy_generator import build_renpy_zip, validate_graph

router = APIRouter(prefix="/projects", tags=["export"])


@router.get("/{project_id}/export/renpy")
async def export_renpy(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> Response:
    project = await _get_owned_project(db, project_id, user.id)
    errors = validate_graph(project)
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})

    try:
        zip_data = await build_renpy_zip(project)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"errors": [str(exc)]}) from exc

    filename = f"{project.title.replace(' ', '_')}_renpy.zip"
    return Response(
        content=zip_data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
