import io
import json
import re
import zipfile
from collections import defaultdict, deque
from uuid import UUID

from app.models import GraphEdge, GraphNode, Project
from app.services.storage import get_storage

POSITION_MAP = {
    "left": "left",
    "center": "center",
    "right": "right",
}


def _sanitize_renpy_name(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip())
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"n_{cleaned}"
    return cleaned.lower()


def validate_graph(project: Project) -> list[str]:
    errors: list[str] = []
    nodes = project.nodes
    edges = project.edges

    start_nodes = [n for n in nodes if n.type == "start"]
    loading_nodes = [n for n in nodes if n.type == "loading"]
    main_menu_nodes = [n for n in nodes if n.type == "main_menu"]

    if len(loading_nodes) != 1:
        errors.append("Graph must have exactly one 'loading' node")
    if len(main_menu_nodes) != 1:
        errors.append("Graph must have exactly one 'main_menu' node")
    if len(start_nodes) == 0:
        errors.append("Graph must have exactly one 'start' node")
    elif len(start_nodes) > 1:
        errors.append("Graph must have only one 'start' node")

    labels = [n.label for n in nodes if n.label]
    if len(labels) != len(set(labels)):
        errors.append("All node labels must be unique")

    adj: dict[UUID, list[GraphEdge]] = defaultdict(list)
    for edge in edges:
        adj[edge.source_node_id].append(edge)

    if loading_nodes:
        visited: set[UUID] = set()
        queue: deque[UUID] = deque([loading_nodes[0].id])
    elif start_nodes:
        visited: set[UUID] = set()
        queue: deque[UUID] = deque([start_nodes[0].id])
    else:
        visited = set()
        queue = deque()

    if queue:
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            for edge in adj[current]:
                queue.append(edge.target_node_id)

        unreachable = [n.label for n in nodes if n.id not in visited]
        if unreachable:
            errors.append(f"Unreachable nodes from entry: {', '.join(unreachable)}")

    for node in nodes:
        if node.type in {"condition", "choice"}:
            outgoing = adj.get(node.id, [])
            if not outgoing:
                errors.append(f"Node '{node.label}' must have outgoing connections")

    return errors


def _build_adjacency(edges: list[GraphEdge]) -> dict[UUID, list[GraphEdge]]:
    adj: dict[UUID, list[GraphEdge]] = defaultdict(list)
    for edge in edges:
        adj[edge.source_node_id].append(edge)
    return adj


def _get_next_linear(
    node_id: UUID,
    adj: dict[UUID, list[GraphEdge]],
    skip_handles: set[str | None] | None = None,
) -> UUID | None:
    skip_handles = skip_handles or set()
    outgoing = [e for e in adj.get(node_id, []) if e.source_handle not in skip_handles]
    if len(outgoing) == 1:
        return outgoing[0].target_node_id
    default_edges = [e for e in outgoing if e.source_handle in (None, "default", "")]
    if len(default_edges) == 1:
        return default_edges[0].target_node_id
    return None


def _escape_renpy_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


class RenPyGenerator:
    def __init__(self, project: Project) -> None:
        self.project = project
        self.nodes_by_id = {n.id: n for n in project.nodes}
        self.assets_by_id = {str(a.id): a for a in project.assets}
        self.adj = _build_adjacency(project.edges)
        self.lines: list[str] = []
        self.visited: set[UUID] = set()
        self.storage = get_storage()
        self.layered_characters: set[str] = set()

    def generate_images_rpy(self) -> str:
        lines = ["# Generated image definitions — Less Game Editor", ""]
        emotion_assets: set[str] = set()
        self.layered_characters = set()

        for char in self.project.metadata_.get("characters", []):
            raw_id = char.get("id")
            if raw_id in (None, "narrator"):
                continue
            char_name = _sanitize_renpy_name(str(raw_id))
            emotions = char.get("emotions") or []
            valid = [
                emotion
                for emotion in emotions
                if emotion.get("asset_id") and str(emotion["asset_id"]) in self.assets_by_id
            ]
            if not valid:
                continue

            default_emotion = _sanitize_renpy_name(
                str(char.get("default_emotion_id") or valid[0].get("id", "neutral"))
            )
            lines.append(f"layeredimage {char_name}:")
            lines.append("    group emotion:")
            for emotion in valid:
                emotion_id = _sanitize_renpy_name(str(emotion.get("id", "neutral")))
                asset = self.assets_by_id[str(emotion["asset_id"])]
                emotion_assets.add(str(emotion["asset_id"]))
                default_suffix = " default" if emotion_id == default_emotion else ""
                lines.append(f"        attribute {emotion_id}{default_suffix}:")
                lines.append(f'            "images/char/{asset.filename}"')
            lines.append("")
            self.layered_characters.add(char_name)

        for asset in self.project.assets:
            if asset.kind not in {"background", "character", "cg"}:
                continue
            if str(asset.id) in emotion_assets and asset.kind == "character":
                continue
            safe_name = _sanitize_renpy_name(asset.filename.rsplit(".", 1)[0])
            if asset.kind == "background":
                folder = "images/bg"
            elif asset.kind == "cg":
                folder = "images/cg"
            else:
                folder = "images/char"
            lines.append(f'image {safe_name} = "{folder}/{asset.filename}"')

        return "\n".join(lines).strip() + "\n"

    def generate_script(self) -> str:
        self.lines = []
        self._emit_header()

        start = next(n for n in self.project.nodes if n.type == "start")
        self.lines.append("")
        self.lines.append("label start:")
        self._emit_from_node(start.id, indent=1, stop_at_branch=True)

        for node in self.project.nodes:
            if node.id in self.visited or node.type == "start":
                continue
            if node.type == "label":
                self.lines.append("")
                self.lines.append(f"label {_sanitize_renpy_name(node.label)}:")
                self._emit_from_node(node.id, indent=1, stop_at_branch=True)

        return "\n".join(self.lines) + "\n"

    def _emit_header(self) -> None:
        characters = self.project.metadata_.get("characters", [])
        self.lines.append("# Generated by Less Game Editor")
        self.lines.append("")
        for char in characters:
            name = _sanitize_renpy_name(char.get("id", "character"))
            display = char.get("display_name", name)
            color = char.get("color", "#c8ffc8")
            self.lines.append(f'define {name} = Character("{_escape_renpy_string(display)}", color="{color}")')

    def _char_meta(self, char_id: str) -> dict | None:
        return next(
            (c for c in self.project.metadata_.get("characters", []) if c.get("id") == char_id),
            None,
        )

    def _emit_expression_show(
        self,
        char_id: str,
        emotion_id: str | None,
        indent: int,
        position: str | None = None,
    ) -> bool:
        char_name = _sanitize_renpy_name(char_id)
        if char_name not in self.layered_characters:
            return False
        emo = emotion_id
        if not emo:
            meta = self._char_meta(char_id)
            emo = (meta or {}).get("default_emotion_id")
        emo_name = _sanitize_renpy_name(str(emo or "neutral"))
        if position:
            pos = POSITION_MAP.get(position, position)
            self._indent(indent, f"show {char_name} {emo_name} at {pos}")
        else:
            self._indent(indent, f"show {char_name} {emo_name}")
        return True

    def _emit_dialogue(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        text = _escape_renpy_string(data.get("text", ""))
        raw_character = str(data.get("character", "narrator"))
        character = _sanitize_renpy_name(raw_character)
        emotion_id = data.get("emotion_id")
        voice_id = data.get("voice_asset_id")

        if character != "narrator" and emotion_id:
            self._emit_expression_show(raw_character, str(emotion_id), indent)

        if voice_id and str(voice_id) in self.assets_by_id:
            asset = self.assets_by_id[str(voice_id)]
            self._indent(indent, f'voice "audio/{asset.filename}"')
        if character == "narrator":
            self._indent(indent, f'"{text}"')
        else:
            self._indent(indent, f'{character} "{text}"')

    def _emit_show_character(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        raw_char_id = str(data.get("character_id", "character"))
        char_id = _sanitize_renpy_name(raw_char_id)
        position = POSITION_MAP.get(data.get("position", "center"), "center")
        emotion_id = data.get("emotion_id")

        if self._emit_expression_show(raw_char_id, str(emotion_id) if emotion_id else None, indent, position):
            return

        asset_id = self._resolve_show_asset_id(data, raw_char_id)
        image_name = self._asset_image_name(asset_id)
        if image_name:
            self._indent(indent, f"show {image_name} as {char_id} at {position}")

    def _indent(self, level: int, text: str) -> None:
        self.lines.append("    " * level + text)

    def _emit_from_node(
        self,
        node_id: UUID,
        indent: int,
        stop_at_branch: bool = False,
    ) -> None:
        current_id: UUID | None = node_id
        while current_id and current_id not in self.visited:
            node = self.nodes_by_id[current_id]
            self.visited.add(current_id)

            if node.type == "start":
                self._emit_start(node, indent)
            elif node.type in {"loading", "main_menu", "settings"}:
                pass
            elif node.type == "scene":
                self._emit_scene(node, indent)
            elif node.type == "dialogue":
                self._emit_dialogue(node, indent)
            elif node.type == "show_character":
                self._emit_show_character(node, indent)
            elif node.type == "hide_character":
                self._emit_hide_character(node, indent)
            elif node.type == "music":
                self._emit_music(node, indent)
            elif node.type == "sound":
                self._emit_sound(node, indent)
            elif node.type == "effect":
                self._emit_effect(node, indent)
            elif node.type == "set_variable":
                self._emit_set_variable(node, indent)
            elif node.type == "unlock_cg":
                self._emit_unlock_cg(node, indent)
            elif node.type == "jump":
                self._emit_jump(node, indent)
                return
            elif node.type == "end":
                self._indent(indent, "return")
                return
            elif node.type == "choice":
                self._emit_choice(node, indent)
                return
            elif node.type == "condition":
                self._emit_condition(node, indent)
                return
            elif node.type == "label":
                pass

            if stop_at_branch and node.type in {"choice", "condition", "jump", "end"}:
                return

            current_id = _get_next_linear(current_id, self.adj)

    def _asset_image_name(self, asset_id: str | None) -> str | None:
        if not asset_id or asset_id not in self.assets_by_id:
            return None
        asset = self.assets_by_id[asset_id]
        return _sanitize_renpy_name(asset.filename.rsplit(".", 1)[0])

    def _emit_start(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        image_name = self._asset_image_name(data.get("background_asset_id"))
        if image_name:
            self._indent(indent, f"scene {image_name}")
        music_id = data.get("music_asset_id")
        if music_id and str(music_id) in self.assets_by_id:
            asset = self.assets_by_id[str(music_id)]
            self._indent(indent, f'play music "audio/{asset.filename}" fadein 0 loop')
        title = data.get("title")
        if title:
            self._indent(indent, f'"{_escape_renpy_string(str(title))}"')
        intro_text = data.get("intro_text")
        if intro_text:
            character = _sanitize_renpy_name(str(data.get("intro_character", "narrator")))
            if character == "narrator":
                self._indent(indent, f'"{_escape_renpy_string(str(intro_text))}"')
            else:
                self._indent(indent, f'{character} "{_escape_renpy_string(str(intro_text))}"')

    def _emit_scene(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        image_name = self._asset_image_name(data.get("asset_id"))
        transition = data.get("transition", "dissolve")
        if image_name:
            self._indent(indent, f"scene {image_name} with {transition}")
        else:
            self._indent(indent, f"scene black with {transition}")

    def _resolve_show_asset_id(self, data: dict, char_id: str) -> str | None:
        direct = data.get("asset_id")
        if direct and str(direct) in self.assets_by_id:
            return str(direct)

        characters = self.project.metadata_.get("characters", [])
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

    def _emit_hide_character(self, node: GraphNode, indent: int) -> None:
        char_id = _sanitize_renpy_name((node.data or {}).get("character_id", "character"))
        self._indent(indent, f"hide {char_id}")

    def _emit_music(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        asset_id = data.get("asset_id")
        if not asset_id or asset_id not in self.assets_by_id:
            return
        asset = self.assets_by_id[asset_id]
        fade = data.get("fade", 0)
        loop = "loop" if data.get("loop", True) else "noloop"
        self._indent(indent, f'play music "audio/{asset.filename}" fadein {fade} {loop}')

    def _emit_sound(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        asset_id = data.get("asset_id")
        if not asset_id or asset_id not in self.assets_by_id:
            return
        asset = self.assets_by_id[asset_id]
        self._indent(indent, f'play sound "audio/{asset.filename}"')

    def _emit_effect(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        effect_type = data.get("effect_type", "dissolve")
        if effect_type == "fade":
            duration = data.get("params", {}).get("duration", 1.0)
            self._indent(indent, f"with Fade({duration}, 0.0, 0.0)")
        elif effect_type == "dissolve":
            self._indent(indent, "with dissolve")
        elif effect_type == "shake":
            self._indent(indent, "camera shake")

    def _emit_set_variable(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        name = _sanitize_renpy_name(data.get("name", "var"))
        value = data.get("value", 0)
        if isinstance(value, str):
            self._indent(indent, f'$ {name} = "{_escape_renpy_string(value)}"')
        else:
            self._indent(indent, f"$ {name} = {value}")

    def _emit_unlock_cg(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        item_id = str(data.get("item_id", "")).strip()
        if item_id:
            self._indent(indent, f'$ persistent.unlocked_cgs.add("{_escape_renpy_string(item_id)}")')

    def _emit_jump(self, node: GraphNode, indent: int) -> None:
        target = _sanitize_renpy_name((node.data or {}).get("target_label", ""))
        if target:
            self._indent(indent, f"jump {target}")

    def _emit_choice(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        options = data.get("options", [])
        outgoing = self.adj.get(node.id, [])
        handle_to_target = {e.source_handle: e.target_node_id for e in outgoing}

        self._indent(indent, "menu:")
        for i, option in enumerate(options):
            handle = option.get("handle") or f"option_{i}"
            text = _escape_renpy_string(option.get("text", f"Option {i + 1}"))
            self._indent(indent + 1, f'"{text}":')
            target_id = handle_to_target.get(handle)
            if target_id:
                branch_label = f"{_sanitize_renpy_name(node.label)}_{handle}"
                self._indent(indent + 2, f"jump {branch_label}")
                self.lines.append("")
                self.lines.append(f"label {branch_label}:")
                self._emit_from_node(target_id, indent=1, stop_at_branch=True)

    def _emit_condition(self, node: GraphNode, indent: int) -> None:
        data = node.data or {}
        expression = data.get("expression", "True")
        outgoing = self.adj.get(node.id, [])
        handle_to_target = {e.source_handle: e.target_node_id for e in outgoing}

        true_id = handle_to_target.get("true")
        false_id = handle_to_target.get("false")

        self._indent(indent, f"if {expression}:")
        if true_id:
            self._emit_from_node(true_id, indent + 1, stop_at_branch=True)
        else:
            self._indent(indent + 1, "pass")

        if false_id:
            self._indent(indent, "else:")
            self._emit_from_node(false_id, indent + 1, stop_at_branch=True)


def _pos_align(pos: dict | None, default_x: float = 0.5, default_y: float = 0.5) -> tuple[float, float]:
    x = float(pos.get("x", default_x * 100) if pos else default_x * 100) / 100.0
    y = float(pos.get("y", default_y * 100) if pos else default_y * 100) / 100.0
    return x, y


def _asset_background_line(assets_by_id: dict, asset_id: str | None, fallback: str = "#111111") -> str:
    if asset_id and str(asset_id) in assets_by_id:
        asset = assets_by_id[str(asset_id)]
        folder = "images/bg" if asset.kind == "background" else "images/char"
        return f'    add "{folder}/{asset.filename}"'
    return f'    add Solid("{fallback}")'


def _get_active_loader(screens: dict) -> dict:
    loading = screens.get("loading") or {}
    loaders = loading.get("loaders") or []
    active_id = loading.get("active_loader_id")
    if active_id:
        match = next((item for item in loaders if item.get("id") == active_id), None)
        if match:
            return match
    return loaders[0] if loaders else {}


def _settings_action_line(item: dict) -> str:
    item_type = str(item.get("type", "toggle"))
    key = str(item.get("key", ""))
    if item_type == "slider":
        if key == "text_speed":
            return "bar value Preference('text speed')"
        return "bar value Preference('text speed')"
    if item_type == "button":
        return "NullAction()"
    pref_map = {
        "music_volume": 'Preference("music mute", "toggle")',
        "sound_volume": 'Preference("sound mute", "toggle")',
        "fullscreen": 'Preference("display", "toggle")',
    }
    return pref_map.get(key, 'Preference("all mute", "toggle")')


def _style_text_props(style: dict | None) -> str:
    if not style:
        return ""
    parts: list[str] = []
    font_size = style.get("font_size")
    if font_size is not None:
        parts.append(f"size {int(font_size)}")
    color = style.get("color")
    if color:
        parts.append(f'color "{_escape_renpy_string(str(color))}"')
    return " ".join(parts)


def _style_textbutton_props(style: dict | None) -> str:
    if not style:
        return ""
    parts: list[str] = []
    font_size = style.get("font_size")
    if font_size is not None:
        parts.append(f"text_size {int(font_size)}")
    color = style.get("color")
    if color:
        parts.append(f'text_color "{_escape_renpy_string(str(color))}"')
    background = style.get("background_color")
    if background:
        parts.append(f'background "{_escape_renpy_string(str(background))}"')
    padding_x = style.get("padding_x")
    padding_y = style.get("padding_y")
    if padding_x is not None or padding_y is not None:
        parts.append(f"padding ({int(padding_x or 0)}, {int(padding_y or 0)})")
    border_radius = style.get("border_radius")
    if border_radius is not None:
        parts.append(f"radius {int(border_radius)}")
    return " ".join(parts)


def _cg_image_name(assets_by_id: dict, asset_id: str | None) -> str | None:
    if not asset_id or str(asset_id) not in assets_by_id:
        return None
    asset = assets_by_id[str(asset_id)]
    return _sanitize_renpy_name(asset.filename.rsplit(".", 1)[0])


def _gallery_default_unlocked_ids(metadata: dict) -> list[str]:
    gallery = metadata.get("gallery") or {}
    items = gallery.get("items") or []
    return [str(item.get("id")) for item in items if item.get("unlock_by_default") and item.get("id")]


def _generate_gallery_rpy(project: Project) -> str:
    metadata = project.metadata_ or {}
    gallery = metadata.get("gallery") or {}
    if gallery.get("enabled") is False:
        return ""

    items = gallery.get("items") or []
    if not items:
        return ""

    assets_by_id = {str(a.id): a for a in project.assets}
    title = _escape_renpy_string(str(gallery.get("title") or "Gallery"))
    bg = _asset_background_line(assets_by_id, gallery.get("background_asset_id"), "#111111")

    grid_lines: list[str] = []
    for item in items:
        item_id = _escape_renpy_string(str(item.get("id", "")))
        label = _escape_renpy_string(str(item.get("label", "CG")))
        asset_id = item.get("asset_id")
        image_name = _cg_image_name(assets_by_id, str(asset_id) if asset_id else None)
        thumb_id = item.get("thumbnail_asset_id") or asset_id
        thumb_name = _cg_image_name(assets_by_id, str(thumb_id) if thumb_id else None)
        if not image_name:
            continue
        thumb_ref = thumb_name or image_name
        grid_lines.append(
            f'            if "{item_id}" in persistent.unlocked_cgs:\n'
            f'                button:\n'
            f'                    action Show("cg_viewer", cg_image="{image_name}", cg_title="{label}")\n'
            f"                    has vbox\n"
            f'                    add "{thumb_ref}" xysize (180, 120) fit "cover"\n'
            f'                    text "{label}" size 14\n'
            f"            else:\n"
            f"                vbox:\n"
            f'                    frame:\n'
            f'                        xysize (180, 120)\n'
            f'                        add Solid("#222222")\n'
            f'                        text "?" xalign 0.5 yalign 0.5 size 36 color "#666666"\n'
            f'                    text "{label}" size 14 color "#888888"'
        )

    if not grid_lines:
        return ""

    grid_body = "\n".join(grid_lines)
    return f"""
screen cg_gallery():
    tag menu
    modal True
{bg}
    use game_menu(_("Gallery")):
        text "{title}" size 36 xalign 0.5
        vpgrid:
            cols 3
            spacing 16
            xalign 0.5
            yalign 0.35
{grid_body}
        textbutton "Назад" action Return() xalign 0.5 yalign 0.92

screen cg_viewer(cg_image, cg_title):
    modal True
    zorder 200
    add cg_image xalign 0.5 yalign 0.5 fit "contain"
    text cg_title xalign 0.5 yalign 0.95 size 20
    key ["mouseup_1", "K_ESCAPE"] action Hide("cg_viewer")
"""


def _generate_cheat_rpy(project: Project) -> str:
    metadata = project.metadata_ or {}
    gallery = metadata.get("gallery") or {}
    if not gallery.get("cheat_input_enabled", True):
        return ""

    cheats = gallery.get("cheats") or []
    if not cheats:
        return ""

    cheat_entries: list[str] = []
    for cheat in cheats:
        code = str(cheat.get("code", "")).lower().strip()
        if not code:
            continue
        action = str(cheat.get("action", "unlock_all_gallery"))
        target = _escape_renpy_string(str(cheat.get("target_id", "")))
        flag_value = cheat.get("flag_value", True)
        if isinstance(flag_value, str):
            flag_repr = f'"{_escape_renpy_string(flag_value)}"'
        elif isinstance(flag_value, bool):
            flag_repr = "True" if flag_value else "False"
        else:
            flag_repr = str(flag_value)
        cheat_entries.append(
            f'        "{_escape_renpy_string(code)}": ("{action}", "{target}", {flag_repr}),'
        )

    if not cheat_entries:
        return ""

    cheats_body = "\n".join(cheat_entries)
    gallery_items = gallery.get("items") or []
    item_ids = [_escape_renpy_string(str(item.get("id", ""))) for item in gallery_items if item.get("id")]

    return f"""
init python:
    lg_gallery_item_ids = [{", ".join(f'"{item_id}"' for item_id in item_ids)}]
    lg_cheat_map = {{
{cheats_body}
    }}

    def lg_apply_cheat(code):
        normalized = (code or "").lower().strip()
        entry = lg_cheat_map.get(normalized)
        if not entry:
            renpy.notify("Invalid code")
            return
        action, target, flag_value = entry
        if action == "unlock_all_gallery":
            for item_id in lg_gallery_item_ids:
                persistent.unlocked_cgs.add(item_id)
            renpy.notify("Gallery unlocked")
        elif action == "unlock_gallery_item" and target:
            persistent.unlocked_cgs.add(target)
            renpy.notify("CG unlocked")
        elif action == "set_flag" and target:
            store.__dict__[target] = flag_value
            renpy.notify("Flag set")

    config.overlay_screens.append("cheat_overlay")

screen cheat_overlay():
    zorder 150
    key "`" action Show("cheat_input")

screen cheat_input():
    modal True
    zorder 200
    frame:
        xalign 0.5
        yalign 0.5
        xpadding 24
        ypadding 16
        vbox:
            spacing 12
            text "Cheat code" size 24
            input default "" length 40 id "cheat_code" xsize 320
            hbox:
                spacing 12
                xalign 1.0
                textbutton "Cancel" action Hide("cheat_input")
                textbutton "OK" action [Function(lg_apply_cheat, cheat_code), Hide("cheat_input")]
    key "K_ESCAPE" action Hide("cheat_input")
"""


def _generate_screens_rpy(project: Project) -> str:
    metadata = project.metadata_ or {}
    screens = metadata.get("game_screens") or {}
    assets_by_id = {str(a.id): a for a in project.assets}
    loading = _get_active_loader(screens)
    main_menu = screens.get("main_menu") or {}
    settings = screens.get("settings") or {}

    loading_title = _escape_renpy_string(str(loading.get("title") or project.title))
    loading_subtitle = _escape_renpy_string(str(loading.get("subtitle") or "Загрузка..."))
    loading_tip = _escape_renpy_string(str(loading.get("tip_text") or ""))
    menu_title = _escape_renpy_string(str(main_menu.get("title") or project.title))
    settings_title = _escape_renpy_string(str(settings.get("title") or "Настройки"))

    loading_title_style = _style_text_props(loading.get("title_style"))
    loading_subtitle_style = _style_text_props(loading.get("subtitle_style"))
    loading_tip_style = _style_text_props(loading.get("tip_style"))
    menu_title_style = _style_text_props(main_menu.get("title_style"))
    settings_title_style = _style_text_props(settings.get("title_style"))
    default_button_style = main_menu.get("button_style")
    default_control_style = settings.get("control_style")
    back_button = settings.get("back_button") or {}
    back_label = _escape_renpy_string(str(back_button.get("label", "Назад")))
    back_x, back_y = _pos_align(back_button, 0.5, 0.92)
    back_style = _style_textbutton_props(back_button.get("style"))

    lt_x, lt_y = _pos_align(loading.get("title_pos"), 0.5, 0.38)
    ls_x, ls_y = _pos_align(loading.get("subtitle_pos"), 0.5, 0.52)
    ltip_x, ltip_y = _pos_align(loading.get("tip_pos"), 0.5, 0.88)
    mt_x, mt_y = _pos_align(main_menu.get("title_pos"), 0.5, 0.22)
    st_x, st_y = _pos_align(settings.get("title_pos"), 0.5, 0.22)

    loading_bg = _asset_background_line(assets_by_id, loading.get("background_asset_id"), "#000000")
    menu_bg = _asset_background_line(assets_by_id, main_menu.get("background_asset_id"), "#111111")
    settings_bg = _asset_background_line(assets_by_id, settings.get("background_asset_id"), "#111111")

    menu_items = main_menu.get("items") or []
    menu_lines = []
    for item in menu_items:
        label = _escape_renpy_string(str(item.get("label", "Пункт")))
        action = str(item.get("action", "start"))
        ix, iy = _pos_align(item, 0.5, 0.5)
        if action == "settings":
            action_line = 'ShowMenu("game_settings")'
        elif action == "load":
            action_line = 'ShowMenu("load")'
        elif action == "save":
            action_line = 'ShowMenu("save")'
        elif action == "gallery":
            action_line = 'ShowMenu("cg_gallery")'
        elif action == "quit":
            action_line = "Quit(confirm=not main_menu)"
        else:
            action_line = "Start()"
        btn_style = _style_textbutton_props(item.get("style") or default_button_style)
        style_suffix = f" {btn_style}" if btn_style else ""
        menu_lines.append(
            f'    textbutton "{label}" action {action_line}{style_suffix} xalign {ix:.3f} yalign {iy:.3f}'
        )

    settings_items = settings.get("items") or []
    pref_lines = []
    for item in settings_items:
        label = _escape_renpy_string(str(item.get("label", "Настройка")))
        item_type = str(item.get("type", "toggle"))
        ix, iy = _pos_align(item, 0.5, 0.5)
        action = _settings_action_line(item)
        item_style = _style_textbutton_props(item.get("style") or default_control_style)
        style_suffix = f" {item_style}" if item_style else ""
        if item_type == "slider":
            pref_lines.append(
                f'    vbox:\n        xalign {ix:.3f}\n        yalign {iy:.3f}\n        label "{label}"\n        {action}'
            )
        else:
            pref_lines.append(
                f'    textbutton "{label}" action {action}{style_suffix} xalign {ix:.3f} yalign {iy:.3f}'
            )

    menu_body = "\n".join(menu_lines) or '    textbutton "Начать игру" action Start() xalign 0.5 yalign 0.5'
    pref_body = "\n".join(pref_lines) or '    textbutton "Звук" action Preference("all mute", "toggle") xalign 0.5 yalign 0.5'

    return f'''## Generated screens — loading, main menu, settings

screen loading_screen():
    tag loading
    timer 2.0 action Return()
    modal True
{loading_bg}
    text "{loading_title}" {loading_title_style} xalign {lt_x:.3f} yalign {lt_y:.3f}
    text "{loading_subtitle}" {loading_subtitle_style} xalign {ls_x:.3f} yalign {ls_y:.3f}
    if "{loading_tip}":
        text "{loading_tip}" {loading_tip_style} xalign {ltip_x:.3f} yalign {ltip_y:.3f}

screen main_menu():
    tag menu
{menu_bg}
    text "{menu_title}" {menu_title_style} xalign {mt_x:.3f} yalign {mt_y:.3f}
{menu_body}

screen game_settings():
    tag menu
{settings_bg}
    use game_menu(_("Настройки")):
        text "{settings_title}" {settings_title_style} xalign {st_x:.3f} yalign {st_y:.3f}
{pref_body}
        textbutton "{back_label}" action Return(){f" {back_style}" if back_style else ""} xalign {back_x:.3f} yalign {back_y:.3f}
''' + _generate_gallery_rpy(project) + _generate_cheat_rpy(project)


def _generate_options_rpy(project: Project) -> str:
    metadata = project.metadata_ or {}
    screens = metadata.get("game_screens") or {}
    main_menu = screens.get("main_menu") or {}
    assets_by_id = {str(a.id): a for a in project.assets}
    screen_width = int(metadata.get("screen_width", 1280))
    screen_height = int(metadata.get("screen_height", 720))
    default_unlocked = _gallery_default_unlocked_ids(metadata)
    default_unlocked_literal = ", ".join(f'"{_escape_renpy_string(item_id)}"' for item_id in default_unlocked)

    lines = [
        f'define config.name = "{_escape_renpy_string(project.title)}"',
        'define config.version = "1.0"',
        f"define config.screen_width = {screen_width}",
        f"define config.screen_height = {screen_height}",
        'define config.main_menu_screen = "main_menu"',
        "default persistent.unlocked_cgs = set()",
    ]

    music_id = main_menu.get("music_asset_id")
    if music_id and str(music_id) in assets_by_id:
        asset = assets_by_id[str(music_id)]
        lines.append(f'define config.main_menu_music = "audio/{asset.filename}"')

    lines.extend(
        [
            "",
            "label splashscreen:",
            "    scene black",
            "    $ renpy.block_rollback()",
            "    python:",
            f"        for _lg_item_id in [{default_unlocked_literal}]:",
            "            persistent.unlocked_cgs.add(_lg_item_id)",
            "    call screen loading_screen",
            "    return",
            "",
        ]
    )
    return "\n".join(lines) + "\n"


async def build_renpy_zip(project: Project) -> bytes:
    errors = validate_graph(project)
    if errors:
        raise ValueError("\n".join(errors))

    generator = RenPyGenerator(project)
    images_rpy = generator.generate_images_rpy()
    script = generator.generate_script()
    storage = get_storage()

    buffer = io.BytesIO()
    safe_title = _sanitize_renpy_name(project.title) or "game"

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{safe_title}/game/options.rpy", _generate_options_rpy(project))
        zf.writestr(f"{safe_title}/game/images.rpy", images_rpy)
        zf.writestr(f"{safe_title}/game/script.rpy", script)
        zf.writestr(f"{safe_title}/game/screens_custom.rpy", _generate_screens_rpy(project))
        zf.writestr(
            f"{safe_title}/project.json",
            json.dumps({"title": project.title, "id": str(project.id)}, ensure_ascii=False, indent=2),
        )

        for asset in project.assets:
            data = await storage.download(asset.storage_key)
            if asset.kind == "background":
                path = f"{safe_title}/game/images/bg/{asset.filename}"
            elif asset.kind == "character":
                path = f"{safe_title}/game/images/char/{asset.filename}"
            elif asset.kind == "cg":
                path = f"{safe_title}/game/images/cg/{asset.filename}"
            elif asset.kind == "voice":
                path = f"{safe_title}/game/audio/{asset.filename}"
            else:
                path = f"{safe_title}/game/audio/{asset.filename}"
            zf.writestr(path, data)

    return buffer.getvalue()
