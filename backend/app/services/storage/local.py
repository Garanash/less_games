from pathlib import Path

import aiofiles

from app.config import get_settings


class LocalStorage:
    def __init__(self) -> None:
        self.base_dir = Path(get_settings().local_upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    async def upload(self, key: str, data: bytes, content_type: str) -> str:
        path = self._path(key)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return key

    async def download(self, key: str) -> bytes:
        path = self._path(key)
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete(self, key: str) -> None:
        path = self._path(key)
        if path.exists():
            path.unlink()

    def public_url(self, key: str) -> str:
        settings = get_settings()
        return f"{settings.backend_url}/media/{key}"
