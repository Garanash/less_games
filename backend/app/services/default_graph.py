"""Default graph nodes and edges for new projects."""

import uuid

from app.models import GraphEdge, GraphNode


def create_default_graph(project_id: uuid.UUID, title: str) -> tuple[list[GraphNode], list[GraphEdge]]:
    loading_id = uuid.uuid4()
    main_menu_id = uuid.uuid4()
    settings_id = uuid.uuid4()
    start_id = uuid.uuid4()

    loading = GraphNode(
        id=loading_id,
        project_id=project_id,
        type="loading",
        label="loading",
        data={},
        pos_x=80,
        pos_y=160,
    )
    main_menu = GraphNode(
        id=main_menu_id,
        project_id=project_id,
        type="main_menu",
        label="main_menu",
        data={},
        pos_x=300,
        pos_y=160,
    )
    settings = GraphNode(
        id=settings_id,
        project_id=project_id,
        type="settings",
        label="settings",
        data={},
        pos_x=500,
        pos_y=160,
    )
    start = GraphNode(
        id=start_id,
        project_id=project_id,
        type="start",
        label="start",
        data={
            "title": title,
            "background_asset_id": "",
            "music_asset_id": "",
            "intro_character": "narrator",
            "intro_text": "",
        },
        pos_x=720,
        pos_y=160,
    )

    edges = [
        GraphEdge(
            project_id=project_id,
            source_node_id=loading_id,
            target_node_id=main_menu_id,
        ),
        GraphEdge(
            project_id=project_id,
            source_node_id=main_menu_id,
            target_node_id=start_id,
            source_handle="flow",
        ),
        GraphEdge(
            project_id=project_id,
            source_node_id=main_menu_id,
            target_node_id=settings_id,
            source_handle="settings",
        ),
    ]

    return [loading, main_menu, settings, start], edges
