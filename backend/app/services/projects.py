import copy
import uuid
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Asset, GraphEdge, GraphNode, Project, User
from app.services.storage import get_storage


async def duplicate_project(db: AsyncSession, source: Project, user: User, title: str | None = None) -> Project:
    storage = get_storage()
    new_project = Project(
        user_id=user.id,
        title=title or f"{source.title} (копия)",
        metadata_=copy.deepcopy(source.metadata_ or {}),
    )
    db.add(new_project)
    await db.flush()

    node_id_map: dict[UUID, UUID] = {}
    for node in source.nodes:
        new_node_id = uuid.uuid4()
        node_id_map[node.id] = new_node_id
        db.add(
            GraphNode(
                id=new_node_id,
                project_id=new_project.id,
                type=node.type,
                label=node.label,
                data=copy.deepcopy(node.data or {}),
                pos_x=node.pos_x,
                pos_y=node.pos_y,
            )
        )

    for edge in source.edges:
        if edge.source_node_id not in node_id_map or edge.target_node_id not in node_id_map:
            continue
        db.add(
            GraphEdge(
                project_id=new_project.id,
                source_node_id=node_id_map[edge.source_node_id],
                target_node_id=node_id_map[edge.target_node_id],
                source_handle=edge.source_handle,
            )
        )

    for asset in source.assets:
        data = await storage.download(asset.storage_key)
        new_asset_id = uuid.uuid4()
        storage_key = f"{user.id}/{new_project.id}/{new_asset_id}/{asset.filename}"
        await storage.upload(storage_key, data, asset.mime_type)
        db.add(
            Asset(
                id=new_asset_id,
                project_id=new_project.id,
                user_id=user.id,
                kind=asset.kind,
                filename=asset.filename,
                storage_key=storage_key,
                mime_type=asset.mime_type,
                size_bytes=asset.size_bytes,
            )
        )

    await db.flush()
    return new_project
