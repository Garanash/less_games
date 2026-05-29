import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_verified_user
from app.db.session import get_db
from app.models import GraphEdge, GraphNode, Project, User
from app.schemas import (
    GraphEdgeSchema,
    GraphNodeSchema,
    GraphResponse,
    GraphUpdate,
    PreviewStateResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.default_graph import create_default_graph
from app.services.preview import compute_preview_state
from app.services.projects import duplicate_project

router = APIRouter(prefix="/projects", tags=["projects"])


async def _get_owned_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> Project:
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user_id)
        .options(selectinload(Project.nodes), selectinload(Project.edges), selectinload(Project.assets))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> list[ProjectResponse]:
    result = await db.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.updated_at.desc())
    )
    return [ProjectResponse.from_project(p) for p in result.scalars().all()]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> ProjectResponse:
    project = Project(
        user_id=user.id,
        title=body.title,
        metadata_={
            "characters": [
                {"id": "narrator", "display_name": "Рассказчик", "color": "#aaaaaa"},
            ]
        },
    )
    db.add(project)
    await db.flush()

    default_nodes, default_edges = create_default_graph(project.id, body.title)
    for node in default_nodes:
        db.add(node)
    for edge in default_edges:
        db.add(edge)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.from_project(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> ProjectResponse:
    project = await _get_owned_project(db, project_id, user.id)
    return ProjectResponse.from_project(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> ProjectResponse:
    project = await _get_owned_project(db, project_id, user.id)
    if body.title is not None:
        project.title = body.title
    if body.metadata is not None:
        project.metadata_ = body.metadata
    await db.commit()
    await db.refresh(project)
    return ProjectResponse.from_project(project)


@router.post("/{project_id}/duplicate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_project_endpoint(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> ProjectResponse:
    source = await _get_owned_project(db, project_id, user.id)
    new_project = await duplicate_project(db, source, user)
    await db.commit()
    await db.refresh(new_project)
    return ProjectResponse.from_project(new_project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> None:
    project = await _get_owned_project(db, project_id, user.id)
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/graph", response_model=GraphResponse)
async def get_graph(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> GraphResponse:
    project = await _get_owned_project(db, project_id, user.id)
    return GraphResponse(
        nodes=[GraphNodeSchema.from_model(n) for n in project.nodes],
        edges=[GraphEdgeSchema.from_model(e) for e in project.edges],
    )


@router.patch("/{project_id}/graph", response_model=GraphResponse)
async def update_graph(
    project_id: UUID,
    body: GraphUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> GraphResponse:
    project = await _get_owned_project(db, project_id, user.id)

    for edge in list(project.edges):
        await db.delete(edge)
    for node in list(project.nodes):
        await db.delete(node)
    await db.flush()

    node_map: dict[UUID, GraphNode] = {}
    for node_data in body.nodes:
        node_id = node_data.id or uuid.uuid4()
        node = GraphNode(
            id=node_id,
            project_id=project.id,
            type=node_data.type,
            label=node_data.label,
            data=node_data.data,
            pos_x=node_data.position.get("x", 0),
            pos_y=node_data.position.get("y", 0),
        )
        db.add(node)
        node_map[node_id] = node

    for edge_data in body.edges:
        if edge_data.source not in node_map or edge_data.target not in node_map:
            continue
        edge = GraphEdge(
            id=edge_data.id or uuid.uuid4(),
            project_id=project.id,
            source_node_id=edge_data.source,
            target_node_id=edge_data.target,
            source_handle=edge_data.sourceHandle,
        )
        db.add(edge)

    await db.commit()
    await db.refresh(project, ["nodes", "edges"])
    return GraphResponse(
        nodes=[GraphNodeSchema.from_model(n) for n in project.nodes],
        edges=[GraphEdgeSchema.from_model(e) for e in project.edges],
    )


@router.get("/{project_id}/preview-state", response_model=PreviewStateResponse)
async def preview_state(
    project_id: UUID,
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_verified_user),
) -> PreviewStateResponse:
    project = await _get_owned_project(db, project_id, user.id)
    return await compute_preview_state(project, node_id)
