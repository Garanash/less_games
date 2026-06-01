"""Seed project «Дмитрий Донской» — full visual novel with media and styled screens."""

from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path

from dmitry_media import MEDIA, import_media

PROJECT_ID = "b08ac347-350e-4350-b273-e2ba479f7486"
DB_PATH = Path(__file__).resolve().parents[1] / "backend" / "lessgame.db"
M = MEDIA

# Asset UUIDs from project media
IMG = {
    "speech": "82e980de-df97-4dfe-853b-20538ec4af6e",       # Речь князя (Сытов)
    "battle": "db0f9e70-cd97-4d7d-8791-af325a1fc96e",       # Куликовская битва
    "duel": "89b47b13-5a57-4bf4-9712-5030c7c19132",         # Пересвет vs Челубей
    "battle_wide": "b4d67711-b996-44ea-b870-bb77016cb870",
    "monastery": "b605d606-c67c-418a-8c32-850c20564206",
    "field": "9edb69d2-29a1-427c-ba2a-319e1a1fde95",
    "banner": "052084ef-1d30-4345-afd3-ca4bfd7ab85d",
    "camp": "e9e9f610-9b17-48d0-950b-875fb6cfbc30",
    "kremlin": "01d2f3d5-bd4a-411b-9764-a342c08708d6",
    "horizon": "0f02a332-38c8-47dd-abc4-c232d4319c68",
    "settings_bg": "34a5d4e9-0960-4f1f-a9f7-3a22398fff55",
    "march_road": "9cf7367b-40ae-4374-80b0-55771bab7272",
    "map": "a0a4f0aa-c752-4d78-8b07-625f07ed92f6",
    "mist": "88b1c736-6609-498e-992b-cf10ca5f0362",
}

GOLD = {"color": "#fbbf24", "font_size": 38, "font_weight": "bold", "text_align": "center", "opacity": 100}
SUB = {"color": "#e7e5e4", "font_size": 16, "font_weight": "normal", "text_align": "center", "opacity": 100}
TIP = {"color": "#d6d3d1", "font_size": 13, "font_weight": "normal", "text_align": "center", "opacity": 90}
BTN = {
    "color": "#fafaf9",
    "font_size": 15,
    "font_weight": "semibold",
    "background_color": "#00000059",
    "border_color": "transparent",
    "border_width": 0,
    "border_radius": 10,
    "padding_x": 28,
    "padding_y": 12,
    "text_align": "center",
    "backdrop_blur": True,
    "opacity": 96,
}
CTRL = {
    "color": "#fafaf9",
    "font_size": 13,
    "font_weight": "medium",
    "background_color": "#00000066",
    "border_color": "transparent",
    "border_width": 0,
    "border_radius": 8,
    "padding_x": 20,
    "padding_y": 10,
    "backdrop_blur": True,
}
PROGRESS = {
    "x": 50,
    "y": 72,
    "width_percent": 42,
    "height": 6,
    "color": "#fbbf24",
    "background_color": "#27272acc",
    "border_radius": 999,
    "visible": True,
}


def nid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"dmitry-v2:{name}"))


def eid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"dmitry-v2-edge:{name}"))


def n(node_id: str, type_: str, label: str, data: dict, x: float, y: float) -> tuple:
    return (node_id, PROJECT_ID, type_, label, json.dumps(data, ensure_ascii=False), x, y)


def e(edge_id: str, source: str, target: str, handle: str | None = None) -> tuple:
    return (edge_id, PROJECT_ID, source, target, handle)


def dlg(character: str, text: str, **extra) -> dict:
    return {"character": character, "text": text, **extra}


def scene(asset: str, transition: str = "dissolve") -> dict:
    return {"asset_id": asset, "transition": transition}


def choice(*options: tuple[str, str, bool]) -> dict:
    return {
        "options": [
            {"handle": h, "text": t, "highlight": hi}
            for h, t, hi in options
        ],
    }


def music(asset: str, fade: int = 1, loop: bool = True) -> dict:
    return {"asset_id": asset, "fade": fade, "loop": loop}


def sfx(asset: str) -> dict:
    return {"asset_id": asset}


class GraphBuilder:
    def __init__(self) -> None:
        self.ids: dict[str, str] = {}
        self.nodes: list[tuple] = []
        self.edges: list[tuple] = []

    def add(self, name: str, type_: str, label: str, data: dict, x: float, y: float) -> str:
        node_id = nid(name)
        self.ids[name] = node_id
        self.nodes.append(n(node_id, type_, label, data, x, y))
        return node_id

    def link(self, src: str, tgt: str, handle: str | None = None, edge_name: str | None = None) -> None:
        self.edges.append(
            e(eid(edge_name or f"{src}-to-{tgt}-{handle or 'flow'}"), self.ids[src], self.ids[tgt], handle)
        )


def build_metadata() -> dict:
    return {
        "characters": [
            {"id": "narrator", "display_name": "Летописец", "color": "#a8a29e"},
            {
                "id": "dmitry",
                "display_name": "Дмитрий Донской",
                "color": "#60a5fa",
                "default_emotion_id": "neutral",
                "emotions": [
                    {"id": "neutral", "label": "Спокойствие", "ui_key": "neutral", "asset_id": ""},
                    {"id": "determined", "label": "Решимость", "ui_key": "determined", "asset_id": ""},
                ],
            },
            {
                "id": "sergius",
                "display_name": "Сергий Радонежский",
                "color": "#fbbf24",
                "default_emotion_id": "neutral",
                "emotions": [{"id": "neutral", "label": "Мудрость", "ui_key": "neutral", "asset_id": ""}],
            },
            {
                "id": "peresvet",
                "display_name": "Александр Пересвет",
                "color": "#f87171",
                "default_emotion_id": "neutral",
                "emotions": [{"id": "neutral", "label": "Доблесть", "ui_key": "neutral", "asset_id": ""}],
            },
            {
                "id": "envoy",
                "display_name": "Посол Мамая",
                "color": "#fb923c",
                "default_emotion_id": "neutral",
                "emotions": [{"id": "neutral", "label": "Угроза", "ui_key": "neutral", "asset_id": ""}],
            },
        ],
        "game_screens": {
            "loading": {
                "active_loader_id": "kulikovo",
                "loaders": [
                    {
                        "id": "kulikovo",
                        "name": "Куликово поле",
                        "background_asset_id": IMG["battle"],
                        "title": "Дмитрий Донской",
                        "subtitle": "Куликовская битва · 8 сентября 1380",
                        "tip_text": "«Русская земля собралась под одним знаменем впервые за столетие»",
                        "title_pos": {"x": 50, "y": 34},
                        "subtitle_pos": {"x": 50, "y": 48},
                        "tip_pos": {"x": 50, "y": 86},
                        "title_style": GOLD,
                        "subtitle_style": SUB,
                        "tip_style": TIP,
                        "progress_bar": PROGRESS,
                    }
                ],
            },
            "main_menu": {
                "background_asset_id": IMG["speech"],
                "music_asset_id": M["music_balalaika"],
                "title": "Дмитрий Донской",
                "title_pos": {"x": 50, "y": 14},
                "title_style": {**GOLD, "font_size": 42},
                "button_style": BTN,
                "items": [
                    {"id": "start", "label": "⚔ Начать игру", "action": "start", "x": 50, "y": 58},
                    {"id": "gallery", "label": "📜 Хроника", "action": "gallery", "x": 50, "y": 68},
                    {"id": "load", "label": "💾 Загрузить", "action": "load", "x": 50, "y": 78},
                    {"id": "settings", "label": "⚙ Настройки", "action": "settings", "x": 50, "y": 88},
                ],
            },
            "settings": {
                "background_asset_id": IMG["settings_bg"],
                "title": "Настройки",
                "title_pos": {"x": 50, "y": 18},
                "title_style": GOLD,
                "control_style": CTRL,
                "back_button": {
                    "label": "← Назад в меню",
                    "x": 50,
                    "y": 90,
                    "style": BTN,
                },
                "items": [
                    {"id": "music", "label": "Музыка", "type": "toggle", "key": "music_volume", "defaultValue": True, "x": 50, "y": 38},
                    {"id": "sound", "label": "Звуковые эффекты", "type": "toggle", "key": "sound_volume", "defaultValue": True, "x": 50, "y": 50},
                    {"id": "fullscreen", "label": "Полный экран", "type": "toggle", "key": "fullscreen", "defaultValue": False, "x": 50, "y": 62},
                    {"id": "text", "label": "Скорость текста", "type": "slider", "key": "text_speed", "defaultValue": 50, "x": 50, "y": 74},
                ],
            },
        },
        "gallery": {
            "enabled": True,
            "title": "Хроника Куликова поля",
            "background_asset_id": IMG["banner"],
            "cheat_input_enabled": True,
            "cheats": [
                {"id": "all", "code": "kulikovo", "label": "Открыть всю хронику", "action": "unlock_all_gallery"},
            ],
            "items": [
                {"id": "cg_speech", "label": "Речь перед битвой", "asset_id": IMG["speech"], "unlock_by_default": True},
                {"id": "cg_blessing", "label": "Благословение", "asset_id": IMG["monastery"], "unlock_by_default": False},
                {"id": "cg_duel", "label": "Поединок Пересвета", "asset_id": IMG["duel"], "unlock_by_default": False},
                {"id": "cg_battle", "label": "Куликовская битва", "asset_id": IMG["battle"], "unlock_by_default": False},
                {"id": "cg_victory", "label": "Победа на Дону", "asset_id": IMG["battle_wide"], "unlock_by_default": False},
                {"id": "cg_cinematic", "label": "Хроника битвы (видео)", "asset_id": M["video_cinematic"], "unlock_by_default": False},
            ],
        },
        "save_config": {"enabled": True, "slot_count": 6},
        "screen_resolution": "hd_720",
        "screen_width": 1280,
        "screen_height": 720,
    }


def build_graph() -> tuple[list[tuple], list[tuple]]:
    g = GraphBuilder()
    cx, dy = 240, 0

    # System blocks
    g.add("loading", "loading", "loading", {}, 80, 80)
    g.add("main_menu", "main_menu", "main_menu", {}, 280, 80)
    g.add("settings", "settings", "settings", {}, 480, 80)
    g.add(
        "start",
        "start",
        "start",
        {
            "title": "Куликово поле",
            "background_asset_id": IMG["kremlin"],
            "music_asset_id": M["music_balalaika"],
            "intro_character": "narrator",
            "intro_text": "1380 год. Золотая Орда готовит поход на Русь. Великий князь московский Дмитрий собирает войско у стен Кремля.",
        },
        720,
        80,
    )

    y = 220
    g.add("scene_moscow", "scene", "scene_moscow", scene(IMG["kremlin"]), cx, y)
    y += 100
    g.add("intro", "dialogue", "intro", dlg("narrator", "Летопись помнит: после смерти хана Бердибея в Орде началась смута. Мамай, повелитель ордынских полков, мечтал снова подчинить русские земли данью и страхом."), cx, y)
    y += 90
    g.add("intro2", "dialogue", "intro2", dlg("envoy", "Великий князь! Мамай требует дань втрое больше прежней. Откажете — ордынские полки сожгут ваши города до основания."), cx, y)
    y += 90
    g.add("choice_scouts", "choice", "choice_scouts", choice(
        ("trust", "Довериться разведчикам — готовиться к битве", True),
        ("spy", "Отправить шпионов в стан Мамая", False),
    ), cx, y)
    g.add("spy_report", "dialogue", "spy_report", dlg("narrator", "Шпионы вернулись: Мамай ждёт подмогу от Олега Рязанского. Время работает против нас — нужно выступать быстрее."), cx - 280, y)
    g.add("trust_scouts", "dialogue", "trust_scouts", dlg("narrator", "Разведчики доложили: орда уверена в победе и не ждёт полного сбора русского войска. Можно застать их врасплох."), cx + 280, y)
    y += 100
    g.add("threat", "dialogue", "threat", dlg("dmitry", "Москва не заплатит дань угрозами. Если Мамай идёт на Русь — мы встретим его в открытом поле. Пусть весь народ видит: князья способны стоять вместе.", emotion_id="determined"), cx, y)
    y += 90
    g.add("choice_tribute", "choice", "choice_tribute", choice(
        ("refuse", "Отвергнуть ультиматум — готовиться к битве", True),
        ("pay", "Заплатить дань, чтобы выиграть время", False),
    ), cx, y)
    g.add("path_refuse", "dialogue", "path_refuse", dlg("dmitry", "Лучше погибнуть свободными, чем жить под чужим ярмом. Созовите рать!", emotion_id="determined"), cx + 280, y)
    g.add("path_pay", "dialogue", "path_pay", dlg("boyar", "Великий князь, дань — это цена мира. Народ устанет от войны..."), cx - 280, y)
    g.add("path_pay2", "dialogue", "path_pay2", dlg("dmitry", "Мир купленный — не мир, а позор. Всё равно придётся сражаться. Отмените сбор дани.", emotion_id="determined"), cx - 280, y + 90)

    y += 100
    g.add("scene_gather", "scene", "scene_gather", scene(IMG["speech"], "fade"), cx, y)
    g.add("music_gather", "music", "music_gather", music(M["music_march"]), cx + 180, y)
    y += 90
    g.add("gather", "dialogue", "gather", dlg("narrator", "К Дмитрию пришли полки Сузdalя, Ростова, Нижнего Новгорода, Белозерья. Впервые за десятилетия русские княжества выступили единым строем."), cx, y)
    y += 90
    g.add("gather2", "dialogue", "gather2", dlg("dmitry", "Смотрите: под одним знаменем стоят и молодые дружинники, и седые воеводы. Сегодня мы — одна Русь.", emotion_id="determined"), cx, y)
    y += 90
    g.add("choice_herald", "choice", "choice_herald", choice(
        ("speech", "Произнести речь перед всем войском", True),
        ("quiet", "Готовиться молча — не тревожить воинов", False),
    ), cx, y)
    g.add("herald_speech", "dialogue", "herald_speech", dlg("dmitry", "Воины! Завтра мы идём защищать землю русскую. Кто победит — тот останется в песнях. Кто падёт — не умрёт в сердцах народа!", emotion_id="determined"), cx + 280, y)
    g.add("quiet_prep", "dialogue", "quiet_prep", dlg("narrator", "Князь приказал не поднимать лишнего шума. Войско готовилось спокойно: проверяли доспехи, молились, прощались с близкими."), cx - 280, y)
    y += 100
    g.add("boyar_debate", "dialogue", "boyar_debate", dlg("boyar", "Князь, Мамай втрое сильнее. Может, подождём подкрепления от Литвы?"), cx, y)
    y += 90
    g.add("choice_allies", "choice", "choice_allies", choice(
        ("wait", "Подождать ещё неделю — собрать больше войск", False),
        ("march", "Выступить немедленно — орда не должна укрепиться", True),
    ), cx, y)
    g.add("wait_allies", "dialogue", "wait_allies", dlg("narrator", "Ещё три дня ушли на сбор союзников. К рати присоединились отряды из дальних уездов, но Мамай тоже получил подмогу."), cx - 280, y)
    g.add("hurry_allies", "dialogue", "hurry_allies", dlg("dmitry", "Каждый день промедления — новый город в огне. Войско выступает на рассвете!", emotion_id="determined"), cx + 280, y)

    y += 100
    g.add("sergius_call", "dialogue", "sergius_call", dlg("sergius", "Великий князь, не иди на брань без молитвы. Приди в монастырь — дам благословение тебе и всему войску. Без веры сила оружия мертва."), cx, y)
    y += 90
    g.add("choice_blessing", "choice", "choice_blessing", choice(
        ("blessing", "Принять благословение преподобного Сергия", True),
        ("hurry", "Отказаться — войско уже на марше", False),
    ), cx, y)
    g.add("scene_monastery", "scene", "scene_monastery", scene(IMG["monastery"]), cx + 280, y)
    g.add("music_monastery", "music", "music_monastery", music(M["music_monastery"]), cx + 420, y)
    g.add("path_blessing", "dialogue", "path_blessing", dlg("sergius", "Иди, сын. Правое дело сильнее ордынской сабли. Пересвет и Ослябя пойдут с тобой — монахи станут ратниками ради Руси."), cx + 280, y + 90)
    g.add("unlock_blessing", "unlock_cg", "unlock_blessing", {"item_id": "cg_blessing"}, cx + 280, y + 180)
    g.add("path_hurry", "dialogue", "path_hurry", dlg("dmitry", "Время не ждёт, преподобный отче. Благословите нас молитвой на пути — мы уже выступаем.", emotion_id="determined"), cx - 280, y)

    y += 200
    g.add("scene_march", "scene", "scene_march", scene(IMG["march_road"]), cx, y)
    y += 90
    g.add("march", "dialogue", "march", dlg("narrator", "Русское войско двинулось на юг. Дружинники пели песни, кузнецы чинили доспехи в походных повозках. 7 сентября полки вышли к реке Непрядве."), cx, y)
    y += 90
    g.add("march2", "dialogue", "march2", dlg("peresvet", "Великий князь, разведчики докладывают: Мамай занял Куликово поле у переправы через Дон. Отступать некуда — только вперёд!"), cx, y)
    y += 90
    g.add("choice_oleg", "choice", "choice_oleg", choice(
        ("ask", "Просить князя Олега не предавать — держать фланг", True),
        ("ignore", "Не тратить время — Олег сам решит", False),
    ), cx, y)
    g.add("oleg_yes", "dialogue", "oleg_yes", dlg("narrator", "Гонцы вернулись: Олег Рязанский пообещал не переходить на сторону Мамая и прикрыть левый фланг."), cx + 280, y)
    g.add("oleg_no", "dialogue", "oleg_no", dlg("boyar", "Олег ненадёжен, князь. Но сейчас важнее занять поле до рассвета."), cx - 280, y)

    y += 100
    g.add("scene_field", "scene", "scene_field", scene(IMG["field"]), cx, y)
    y += 90
    g.add("field", "dialogue", "field", dlg("narrator", "Против русского строя — многочисленная орда: татары, половцы, наёмники. Знамёна Мамая видны за дымом костров."), cx, y)
    g.add("music_prebattle", "music", "music_prebattle", music(M["music_prebattle"]), cx + 180, y)
    y += 90
    g.add("field2", "dialogue", "field2", dlg("dmitry", "Воины! Завтра решится судьба Руси. Кто дрогнет — тот предаст не меня, а землю русскую.", emotion_id="determined"), cx, y)
    y += 90
    g.add("choice_night", "choice", "choice_night", choice(
        ("pray", "Провести ночь в молитве с войском", True),
        ("rest", "Дать войскам отдых перед рассветом", False),
    ), cx, y)
    g.add("music_night", "music", "music_night", music(M["music_night"]), cx, y - 40)
    g.add("night_pray", "dialogue", "night_pray", dlg("sergius", "Господи, благослови рать на подвиг. Пусть каждый воин помнит: он защищает дом, семью и веру."), cx + 280, y)
    g.add("night_rest", "dialogue", "night_rest", dlg("narrator", "Войско отдыхало у костров. Кузнецы точили клинки, лучники проверяли тетивы. Тишина перед бурей."), cx - 280, y)
    g.add("sfx_campfire", "sound", "sfx_campfire", sfx(M["sound_campfire"]), cx - 280, y + 40)

    y += 100
    g.add("dawn", "dialogue", "dawn", dlg("narrator", "Рассвет над Куликовым полем. Туман стелется по траве. Два строя сходятся — русский и ордынский."), cx, y)
    y += 90
    g.add("choice_peresvet", "choice", "choice_peresvet", choice(
        ("allow", "Благословить поединок Пересвета", True),
        ("forbid", "Запретить — беречь монахов-ратников", False),
    ), cx, y)
    g.add("forbid_warn", "dialogue", "forbid_warn", dlg("peresvet", "Князь, без поединка дух войска ослабнет. Но приказ есть приказ — я всё равно выйду первым."), cx - 280, y)
    y += 90
    g.add("duel_offer", "dialogue", "duel_offer", dlg("peresvet", "Великий князь! Дозволь мне и моему брату Ослябе бросить вызов ордынским богатырям. Пусть исход поединка предскажет судьбу битвы!"), cx, y)
    y += 90
    g.add("scene_duel", "scene", "scene_duel", scene(IMG["duel"], "fade"), cx, y)
    g.add("sfx_horse", "sound", "sfx_horse", sfx(M["sound_horse"]), cx + 160, y)
    y += 90
    g.add("duel", "dialogue", "duel", dlg("narrator", "Александр Пересвет сел на коня и ринулся на богатыря Челубея. Копья сломались, кони сбились — оба воина пали замертво. Но дух русского войска вспыхнул как огонь."), cx, y)
    y += 90
    g.add("unlock_duel", "unlock_cg", "unlock_duel", {"item_id": "cg_duel"}, cx, y)
    y += 80
    g.add("duel_after", "dialogue", "duel_after", dlg("dmitry", "Пересвет пал, но не напрасно! Вперёд, за Русь!", emotion_id="determined"), cx, y)

    y += 90
    g.add("choice_tactic", "choice", "choice_tactic", choice(
        ("flank", "Удар «Тихого полка» из засады", True),
        ("frontal", "Прямой натиск на центр орды", False),
    ), cx, y)
    g.add("flank", "dialogue", "flank", dlg("narrator", "Когда центр схлестнулся, из леса ударил «Тихий полк» князя Владимира Андреевича. Орда не выдержала двойного удара и дрогнула."), cx + 280, y)
    g.add("frontal", "dialogue", "frontal", dlg("narrator", "Русские полки пошли в лобовую атаку. Первые ряды падали под градом стрел, но строй не сломился — ордынский центр начал отступать."), cx - 280, y)

    y += 100
    g.add("scene_battle", "scene", "scene_battle", scene(IMG["battle"], "dissolve"), cx, y)
    g.add("music_battle", "music", "music_battle", music(M["music_battle"], fade=0), cx + 180, y)
    g.add("sfx_battle", "sound", "sfx_battle", sfx(M["sound_battle"]), cx + 320, y)
    y += 90
    g.add("unlock_battle", "unlock_cg", "unlock_battle", {"item_id": "cg_battle"}, cx, y)
    y += 80
    g.add("victory", "dialogue", "victory", dlg("dmitry", "Победа! Мамай бежал, оставив стан и сокровища. Сегодня Русь доказала: мы можем побеждать Орду в честном бою!", emotion_id="determined"), cx, y)

    y += 90
    g.add("choice_pursue", "choice", "choice_pursue", choice(
        ("pursue", "Преследовать бегущую орду", True),
        ("help", "Остаться с ранеными на поле", False),
    ), cx, y)
    g.add("pursue_path", "dialogue", "pursue_path", dlg("narrator", "Отборная конница гнала противника до самого Дона. Мамай бежал в Крым, бросив богатства и знамёна."), cx + 280, y)
    g.add("ending_pursue1", "dialogue", "ending_pursue1", dlg("dmitry", "Орда больше не смеет смотреть на нас свысока. Пусть весь мир знает: русская рать умеет довершать победу!", emotion_id="determined"), cx + 280, y + 90)
    g.add("ending_pursue2", "dialogue", "ending_pursue2", dlg("narrator", "КОНЦОВКА: «Погоня за ордой». Дмитрий Донской навсегда вошёл в историю как неумолимый защитник Руси."), cx + 280, y + 180)
    g.add("help_path", "dialogue", "help_path", dlg("dmitry", "Победа не должна сделать нас жестокими. Спасайте раненых — и своих, и пленных.", emotion_id="neutral"), cx - 280, y)
    g.add("ending_mercy1", "dialogue", "ending_mercy1", dlg("sergius", "Ты победил не только мечом, но и милосердием. Такая победа сильнее любой добычи."), cx - 280, y + 90)
    g.add("ending_mercy2", "dialogue", "ending_mercy2", dlg("narrator", "КОНЦОВКА: «Милость победившего». Летописи помнят князя, который не забыл о человечности на поле брани."), cx - 280, y + 180)

    y += 100
    g.add("scene_victory", "scene", "scene_victory", scene(IMG["battle_wide"]), cx, y)
    g.add("music_victory", "music", "music_victory", music(M["music_victory"]), cx + 180, y)
    y += 90
    g.add("epilogue", "dialogue", "epilogue", dlg("narrator", "Куликовская битва стала поворотом истории. Дмитрий Иванович получил прозвание Донской. Объединённая Русь сделала первый шаг к освобождению от ордынского ига."), cx, y)
    y += 90
    g.add("unlock_victory", "unlock_cg", "unlock_victory", {"item_id": "cg_victory"}, cx, y)
    y += 90
    g.add("choice_memorial", "choice", "choice_memorial", choice(
        ("cinematic", "Посмотреть хронику битвы (видео)", True),
        ("leave", "Завершить — вернуться в меню", False),
    ), cx, y)
    g.add("scene_video", "scene", "scene_video", scene(M["video_cinematic"], "fade"), cx + 280, y)
    g.add("unlock_video", "unlock_cg", "unlock_video", {"item_id": "cg_cinematic"}, cx + 280, y + 80)
    g.add("ending_chronicle", "dialogue", "ending_chronicle", dlg("narrator", "КОНЦОВКА: «Хроника Куликова». Куликово поле навсегда останется в памяти народа — местом, где единство победило страх."), cx + 280, y + 160)
    y += 80
    g.add("ending_legend", "dialogue", "ending_legend", dlg("narrator", "КОНЦОВКА: «Легенда Донского». Память о Пересвете, Сергии и князе Дмитрии живёт в летописях и песнях до сих пор."), cx - 280, y)
    g.add("set_frontal", "set_variable", "set_frontal", {"name": "frontal_attack", "value": True}, cx - 520, y)
    g.add("victory_costly", "dialogue", "victory_costly", dlg("narrator", "Победа далась ценой: тысячи ратников полегли в лобовой атаке. КОНЦОВКА: «Пиррова победа» — Русь победила, но земля оплакала героев."), cx - 520, y + 80)
    g.add("cond_victory", "condition", "cond_victory", {"expression": "frontal_attack === true"}, cx - 520, y + 160)
    g.add("ending_spy", "dialogue", "ending_spy", dlg("narrator", "КОНЦОВКА: «Тайный ход». Благодаря разведке вы знали слабости орды — победа досталась хитростью не меньше, чем мечу."), cx - 720, y + 80)
    g.add("set_spy", "set_variable", "set_spy", {"name": "used_spies", "value": True}, cx - 720, y)
    g.add("cond_spy_epilogue", "condition", "cond_spy_epilogue", {"expression": "used_spies === true"}, cx - 720, y + 160)
    g.add("end", "end", "end", {}, cx, y)

    # Edges
    g.link("loading", "main_menu", edge_name="sys-loading-menu")
    g.link("main_menu", "start", "flow", "sys-menu-start")
    g.link("main_menu", "settings", "settings", "sys-menu-settings")

    g.link("start", "scene_moscow")
    g.link("scene_moscow", "intro")
    g.link("intro", "intro2")
    g.link("intro2", "choice_scouts")
    g.link("choice_scouts", "trust_scouts", "trust")
    g.link("choice_scouts", "set_spy")
    g.link("set_spy", "spy_report")
    g.link("trust_scouts", "threat")
    g.link("spy_report", "threat")
    g.link("threat", "choice_tribute")
    g.link("choice_tribute", "path_refuse", "refuse")
    g.link("choice_tribute", "path_pay", "pay")
    g.link("path_refuse", "scene_gather")
    g.link("path_pay", "path_pay2")
    g.link("path_pay2", "scene_gather")

    g.link("scene_gather", "music_gather")
    g.link("music_gather", "gather")
    g.link("gather", "gather2")
    g.link("gather2", "choice_herald")
    g.link("choice_herald", "herald_speech", "speech")
    g.link("choice_herald", "quiet_prep", "quiet")
    g.link("herald_speech", "boyar_debate")
    g.link("quiet_prep", "boyar_debate")
    g.link("boyar_debate", "choice_allies")
    g.link("choice_allies", "wait_allies", "wait")
    g.link("choice_allies", "hurry_allies", "march")
    g.link("wait_allies", "sergius_call")
    g.link("hurry_allies", "sergius_call")

    g.link("sergius_call", "choice_blessing")
    g.link("choice_blessing", "scene_monastery", "blessing")
    g.link("choice_blessing", "path_hurry", "hurry")
    g.link("scene_monastery", "music_monastery")
    g.link("music_monastery", "path_blessing")
    g.link("path_blessing", "unlock_blessing")
    g.link("unlock_blessing", "scene_march")
    g.link("path_hurry", "scene_march")

    g.link("scene_march", "march")
    g.link("march", "march2")
    g.link("march2", "choice_oleg")
    g.link("choice_oleg", "oleg_yes", "ask")
    g.link("choice_oleg", "oleg_no", "ignore")
    g.link("oleg_yes", "scene_field")
    g.link("oleg_no", "scene_field")
    g.link("scene_field", "field")
    g.link("field", "music_prebattle")
    g.link("music_prebattle", "field2")
    g.link("field2", "choice_night")
    g.link("choice_night", "night_pray", "pray")
    g.link("choice_night", "night_rest", "rest")
    g.link("night_pray", "music_night")
    g.link("music_night", "dawn")
    g.link("night_rest", "sfx_campfire")
    g.link("sfx_campfire", "music_night")

    g.link("dawn", "choice_peresvet")
    g.link("choice_peresvet", "duel_offer", "allow")
    g.link("choice_peresvet", "forbid_warn", "forbid")
    g.link("forbid_warn", "duel_offer")
    g.link("duel_offer", "scene_duel")
    g.link("scene_duel", "sfx_horse")
    g.link("sfx_horse", "duel")
    g.link("duel", "unlock_duel")
    g.link("unlock_duel", "duel_after")
    g.link("duel_after", "choice_tactic")
    g.link("choice_tactic", "flank", "flank")
    g.link("choice_tactic", "frontal", "set_frontal")
    g.link("set_frontal", "frontal")
    g.link("flank", "scene_battle")
    g.link("frontal", "scene_battle")
    g.link("scene_battle", "music_battle")
    g.link("music_battle", "sfx_battle")
    g.link("sfx_battle", "unlock_battle")
    g.link("unlock_battle", "cond_victory")
    g.link("cond_victory", "victory_costly", "true")
    g.link("cond_victory", "victory", "false")
    g.link("victory_costly", "choice_pursue")
    g.link("victory", "choice_pursue")
    g.link("choice_pursue", "pursue_path", "pursue")
    g.link("choice_pursue", "help_path", "help")
    g.link("pursue_path", "ending_pursue1")
    g.link("ending_pursue1", "ending_pursue2")
    g.link("ending_pursue2", "scene_victory")
    g.link("help_path", "ending_mercy1")
    g.link("ending_mercy1", "ending_mercy2")
    g.link("ending_mercy2", "scene_victory")
    g.link("scene_victory", "music_victory")
    g.link("music_victory", "epilogue")
    g.link("epilogue", "cond_spy_epilogue")
    g.link("cond_spy_epilogue", "ending_spy", "true")
    g.link("cond_spy_epilogue", "unlock_victory", "false")
    g.link("ending_spy", "unlock_victory")
    g.link("unlock_victory", "choice_memorial")
    g.link("choice_memorial", "scene_video", "cinematic")
    g.link("choice_memorial", "ending_legend", "leave")
    g.link("ending_legend", "end")
    g.link("scene_video", "unlock_video")
    g.link("unlock_video", "ending_chronicle")
    g.link("ending_chronicle", "end")

    return g.nodes, g.edges


def update_asset_kinds(cur: sqlite3.Cursor) -> None:
    cg_ids = [
        M["video_cinematic"],
        IMG["speech"],
        IMG["duel"],
        IMG["battle"],
        IMG["battle_wide"],
        IMG["monastery"],
    ]
    for asset_id in cg_ids:
        cur.execute(
            "UPDATE assets SET kind = 'cg' WHERE id = ? AND project_id = ?",
            (asset_id, PROJECT_ID),
        )


def main() -> None:
    import_media(DB_PATH)
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    metadata = build_metadata()
    nodes, edges = build_graph()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id FROM projects WHERE id = ?", (PROJECT_ID,))
    if not cur.fetchone():
        raise SystemExit(f"Project not found: {PROJECT_ID}")

    cur.execute(
        "UPDATE projects SET title = ?, metadata = ? WHERE id = ?",
        ("Дмитрий Донской", json.dumps(metadata, ensure_ascii=False), PROJECT_ID),
    )

    cur.execute("DELETE FROM graph_edges WHERE project_id = ?", (PROJECT_ID,))
    cur.execute("DELETE FROM graph_nodes WHERE project_id = ?", (PROJECT_ID,))

    cur.executemany(
        "INSERT INTO graph_nodes (id, project_id, type, label, data, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?, ?)",
        nodes,
    )
    cur.executemany(
        "INSERT INTO graph_edges (id, project_id, source_node_id, target_node_id, source_handle) VALUES (?, ?, ?, ?, ?)",
        edges,
    )

    update_asset_kinds(cur)

    conn.commit()
    conn.close()
    print(f"Seeded «Дмитрий Донской» — nodes: {len(nodes)}, edges: {len(edges)}")


if __name__ == "__main__":
    main()
