from collections import defaultdict, deque
from uuid import UUID

from app.models import GraphEdge, GraphNode, Project
from app.schemas import PreviewStateResponse
from app.services.storage import get_storage


def _resolve_show_asset_id(
    data: dict,
    char_id: str,
    metadata: dict,
    assets_by_id: dict,
) -> str | None:
    direct = data.get("asset_id")
    if direct and str(direct) in assets_by_id:
        return str(direct)

    characters = metadata.get("characters") or []
    char_meta = next((c for c in characters if c.get("id") == char_id), None)
    if not char_meta:
        return str(direct) if direct else None

    emotions = char_meta.get("emotions") or []
    emotion_id = data.get("emotion_id") or char_meta.get("default_emotion_id")
    if emotion_id:
        emotion = next((e for e in emotions if e.get("id") == emotion_id), None)
        if emotion and emotion.get("asset_id"):
            return str(emotion["asset_id"])

    fallback = char_meta.get("default_sprite_asset_id")
    return str(fallback) if fallback else None


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
            char_id = data.get("character_id", "character")
            asset_id = _resolve_show_asset_id(data, char_id, project.metadata_ or {}, assets_by_id)
            if asset_id and str(asset_id) in assets_by_id:
                asset = assets_by_id[str(asset_id)]
                visible_characters[char_id] = {
                    "character_id": char_id,
                    "asset_id": str(asset_id),
                    "emotion_id": data.get("emotion_id"),
                    "url": storage.public_url(asset.storage_key),
                    "position": data.get("position", "center"),
                }

        elif node.type == "hide_character":
            char_id = data.get("character_id", "character")
            visible_characters.pop(char_id, None)

        elif node.type == "dialogue":
            char_id = data.get("character", "narrator")
            emotion_id = data.get("emotion_id")
            if emotion_id and char_id != "narrator":
                asset_id = _resolve_show_asset_id(
                    {"emotion_id": emotion_id},
                    str(char_id),
                    project.metadata_ or {},
                    assets_by_id,
                )
                if asset_id and str(asset_id) in assets_by_id:
                    asset = assets_by_id[str(asset_id)]
                    visible_characters[str(char_id)] = {
                        "character_id": str(char_id),
                        "asset_id": str(asset_id),
                        "emotion_id": emotion_id,
                        "url": storage.public_url(asset.storage_key),
                        "position": visible_characters.get(str(char_id), {}).get("position", "center"),
                    }
            state.dialogue = {
                "character": char_id,
                "text": data.get("text", ""),
                "voice_asset_id": data.get("voice_asset_id"),
                "emotion_id": emotion_id,
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
