import aioboto3

from app.config import get_settings


class S3Storage:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _client_kwargs(self) -> dict:
        return {
            "service_name": "s3",
            "endpoint_url": self.settings.s3_endpoint_url,
            "aws_access_key_id": self.settings.s3_access_key,
            "aws_secret_access_key": self.settings.s3_secret_key,
            "region_name": self.settings.s3_region,
        }

    async def upload(self, key: str, data: bytes, content_type: str) -> str:
        session = aioboto3.Session()
        async with session.client(**self._client_kwargs()) as client:
            await client.put_object(
                Bucket=self.settings.s3_bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return key

    async def download(self, key: str) -> bytes:
        session = aioboto3.Session()
        async with session.client(**self._client_kwargs()) as client:
            response = await client.get_object(Bucket=self.settings.s3_bucket, Key=key)
            return await response["Body"].read()

    async def delete(self, key: str) -> None:
        session = aioboto3.Session()
        async with session.client(**self._client_kwargs()) as client:
            await client.delete_object(Bucket=self.settings.s3_bucket, Key=key)

    def public_url(self, key: str) -> str:
        return f"{self.settings.s3_public_url.rstrip('/')}/{key}"
