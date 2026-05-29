from collections import defaultdict, deque
from uuid import UUID

from app.models import GraphEdge, GraphNode, Project
from app.schemas import PreviewStateResponse
from app.services.storage import get_storage


def _build_adjacency(edges: list[GraphEdge]) -> dict[UUID, list[tuple[UUID, str | None]]]:
    adj: dict[UUID, list[tuple[UUID, str | None]]] = defaultdict(list)
    for edge in edges:
        adj[edge.source_node_id].append((edge.target_node_id, edge.source_handle))
    return adj


def _find_path_to_node(
    start_id: UUID,
    target_id: UUID,
    adj: dict[UUID, list[tuple[UUID, str | None]]],
) -> list[UUID] | None:
    if start_id == target_id:
        return [start_id]

    queue: deque[list[UUID]] = deque([[start_id]])
    visited = {start_id}

    while queue:
        path = queue.popleft()
        current = path[-1]
        for neighbor, _handle in adj.get(current, []):
            if neighbor in visited:
                continue
            new_path = path + [neighbor]
            if neighbor == target_id:
                return new_path
            visited.add(neighbor)
            queue.append(new_path)
    return None


async def compute_preview_state(project: Project, target_node_id: UUID) -> PreviewStateResponse:
    nodes_by_id = {n.id: n for n in project.nodes}
    assets_by_id = {str(a.id): a for a in project.assets}
    storage = get_storage()

    start_nodes = [n for n in project.nodes if n.type == "start"]
    loading_nodes = [n for n in project.nodes if n.type == "loading"]
    if not start_nodes or target_node_id not in nodes_by_id:
        return PreviewStateResponse()

    adj = _build_adjacency(project.edges)
    entry_id = loading_nodes[0].id if loading_nodes else start_nodes[0].id
    path = _find_path_to_node(entry_id, target_node_id, adj)
    if not path:
        return PreviewStateResponse()

    state = PreviewStateResponse()
    visible_characters: dict[str, dict] = {}

    for node_id in path:
        node = nodes_by_id[node_id]
        data = node.data or {}

        if node.type in {"loading", "main_menu", "settings"}:
            continue

        if node.type == "start":
            bg_id = data.get("background_asset_id")
            if bg_id and str(bg_id) in assets_by_id:
                asset = assets_by_id[str(bg_id)]
                state.background = {
                    "asset_id": str(bg_id),
                    "url": storage.public_url(asset.storage_key),
                    "transition": "dissolve",
                }
            music_id = data.get("music_asset_id")
            if music_id and str(music_id) in assets_by_id:
                asset = assets_by_id[str(music_id)]
                state.music = {
                    "asset_id": str(music_id),
                    "url": storage.public_url(asset.storage_key),
                    "fade": 0,
                    "loop": True,
                }
            intro_text = data.get("intro_text") or data.get("title")
            if intro_text:
                state.dialogue = {
                    "character": data.get("intro_character", "narrator"),
                    "text": intro_text,
                }

        elif node.type == "scene":
            asset_id = data.get("asset_id")
            if asset_id and asset_id in assets_by_id:
                asset = assets_by_id[asset_id]
                state.background = {
                    "asset_id": asset_id,
                    "url": storage.public_url(asset.storage_key),
                    "transition": data.get("transition", "dissolve"),
                }

        elif node.type == "show_character":
            asset_id = data.get("asset_id")
            char_id = data.get("character_id", "character")
            if asset_id and asset_id in assets_by_id:
                asset = assets_by_id[asset_id]
                visible_characters[char_id] = {
                    "character_id": char_id,
                    "asset_id": asset_id,
                    "url": storage.public_url(asset.storage_key),
                    "position": data.get("position", "center"),
                }

        elif node.type == "hide_character":
            char_id = data.get("character_id", "character")
            visible_characters.pop(char_id, None)

        elif node.type == "dialogue":
            state.dialogue = {
                "character": data.get("character", "narrator"),
                "text": data.get("text", ""),
                "voice_asset_id": data.get("voice_asset_id"),
            }

        elif node.type == "music":
            asset_id = data.get("asset_id")
            if asset_id and asset_id in assets_by_id:
                asset = assets_by_id[asset_id]
                state.music = {
                    "asset_id": asset_id,
                    "url": storage.public_url(asset.storage_key),
                    "fade": data.get("fade", 0),
                    "loop": data.get("loop", True),
                }

        elif node.type == "sound":
            asset_id = data.get("asset_id")
            if asset_id and asset_id in assets_by_id:
                asset = assets_by_id[asset_id]
                state.sound = {
                    "asset_id": asset_id,
                    "url": storage.public_url(asset.storage_key),
                }

        elif node.type == "effect":
            state.effect = {
                "type": data.get("effect_type", "dissolve"),
                "params": data.get("params", {}),
            }

        elif node.type == "set_variable":
            name = data.get("name")
            if name:
                state.variables[name] = data.get("value")

    state.characters = list(visible_characters.values())
    return state
