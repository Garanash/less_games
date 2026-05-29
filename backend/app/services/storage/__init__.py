from functools import lru_cache

from app.config import get_settings
from app.services.storage.base import StorageAdapter
from app.services.storage.local import LocalStorage
from app.services.storage.s3 import S3Storage


@lru_cache
def get_storage() -> StorageAdapter:
    backend = get_settings().storage_backend.lower()
    if backend == "s3":
        return S3Storage()
    return LocalStorage()
