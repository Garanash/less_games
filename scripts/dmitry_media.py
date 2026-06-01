"""Import audio/video assets for «Дмитрий Донской» into local storage + SQLite."""

from __future__ import annotations

import shutil
import sqlite3
import uuid
from pathlib import Path

PROJECT_ID = "b08ac347-350e-4350-b273-e2ba479f7486"
USER_ID = "2c9ea1c8-9df2-42d2-859a-0efcafebcba5"
DB_PATH = Path(__file__).resolve().parents[1] / "backend" / "lessgame.db"
UPLOADS_DIR = Path(__file__).resolve().parents[1] / "backend" / "uploads"
DOWNLOADS = Path(r"c:\Users\a.dolgov\Downloads")


def media_id(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"dmitry-media:{name}"))


MEDIA = {
    "video_cinematic": media_id("video_cinematic"),
    "music_balalaika": media_id("music_balalaika"),
    "music_march": media_id("music_march"),
    "music_monastery": media_id("music_monastery"),
    "music_night": media_id("music_night"),
    "music_prebattle": media_id("music_prebattle"),
    "music_battle": media_id("music_battle"),
    "music_victory": media_id("music_victory"),
    "sound_battle": media_id("sound_battle"),
    "sound_horse": media_id("sound_horse"),
    "sound_campfire": media_id("sound_campfire"),
}

IMPORTS: list[tuple[str, str, str, str, str]] = [
    (
        "video_cinematic",
        "cg",
        "kulikovo_cinematic.mp4",
        str(DOWNLOADS / "kling_20260601_VIDEO____________5546_0.mp4"),
        "video/mp4",
    ),
    (
        "music_balalaika",
        "music",
        "balalaika_council.mp3",
        str(DOWNLOADS / "short-melody-on-balalaika.mp3"),
        "audio/mpeg",
    ),
    (
        "music_march",
        "music",
        "army_march.mp3",
        str(DOWNLOADS / "the-army-marches-with-careful-steps.mp3"),
        "audio/mpeg",
    ),
    (
        "music_monastery",
        "music",
        "monastery_organ.mp3",
        str(DOWNLOADS / "organist-ancient-church-film-rhythm-background-sound.mp3"),
        "audio/mpeg",
    ),
    (
        "music_night",
        "music",
        "night_ambient.mp3",
        str(DOWNLOADS / "-light-and-silence-bedtime-story-innocence-animated-background-sound.mp3"),
        "audio/mpeg",
    ),
    (
        "music_prebattle",
        "music",
        "prebattle_symphony.mp3",
        str(DOWNLOADS / "simfoniya-bitvyi--nachinaetsya.mp3"),
        "audio/mpeg",
    ),
    (
        "music_battle",
        "music",
        "battle_theme.mp3",
        str(DOWNLOADS / "battle-sword-fight (1).mp3"),
        "audio/mpeg",
    ),
    (
        "music_victory",
        "music",
        "victory_epic.mp3",
        str(DOWNLOADS / "kinematograf--epicheskaya-pobeda.mp3"),
        "audio/mpeg",
    ),
    (
        "sound_battle",
        "sound",
        "battle_swords.mp3",
        str(DOWNLOADS / "battle-sword-fight.mp3"),
        "audio/mpeg",
    ),
    (
        "sound_horse",
        "sound",
        "horse_gallop.mp3",
        str(DOWNLOADS / "the-horse-gallops-on-the-ground.mp3"),
        "audio/mpeg",
    ),
    (
        "sound_campfire",
        "sound",
        "campfire_night.mp3",
        str(DOWNLOADS / "setting-night-fire-burning.mp3"),
        "audio/mpeg",
    ),
]


def import_media(db_path: Path | None = None) -> dict[str, str]:
    db = db_path or DB_PATH
    if not db.exists():
        raise SystemExit(f"Database not found: {db}")

    conn = sqlite3.connect(db)
    cur = conn.cursor()
    imported: dict[str, str] = {}

    for key, kind, filename, source, mime in IMPORTS:
        asset_id = MEDIA[key]
        source_path = Path(source)
        if not source_path.exists():
            print(f"SKIP (missing): {source_path.name}")
            continue

        dest_dir = UPLOADS_DIR / USER_ID / PROJECT_ID / asset_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / filename
        if not dest_file.exists() or dest_file.stat().st_size != source_path.stat().st_size:
            shutil.copy2(source_path, dest_file)

        storage_key = f"{USER_ID}/{PROJECT_ID}/{asset_id}/{filename}"
        size_bytes = dest_file.stat().st_size

        cur.execute("SELECT id FROM assets WHERE id = ?", (asset_id,))
        if cur.fetchone():
            cur.execute(
                """
                UPDATE assets
                SET kind = ?, filename = ?, storage_key = ?, mime_type = ?, size_bytes = ?
                WHERE id = ?
                """,
                (kind, filename, storage_key, mime, size_bytes, asset_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO assets (id, project_id, user_id, kind, filename, storage_key, mime_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (asset_id, PROJECT_ID, USER_ID, kind, filename, storage_key, mime, size_bytes),
            )

        imported[key] = asset_id
        print(f"OK {key} -> {filename} ({size_bytes // 1024} KB)")

    conn.commit()
    conn.close()
    return imported


if __name__ == "__main__":
    import_media()
