from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    is_verified: bool

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    metadata: dict[str, Any] | None = None


class ProjectResponse(BaseModel):
    id: UUID
    title: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_project(cls, project) -> "ProjectResponse":
        return cls(
            id=project.id,
            title=project.title,
            metadata=project.metadata_ or {},
            created_at=project.created_at,
            updated_at=project.updated_at,
        )


class GraphNodeSchema(BaseModel):
    id: UUID
    type: str
    label: str
    data: dict[str, Any] = Field(default_factory=dict)
    position: dict[str, float]

    @classmethod
    def from_model(cls, node) -> "GraphNodeSchema":
        return cls(
            id=node.id,
            type=node.type,
            label=node.label,
            data=node.data or {},
            position={"x": node.pos_x, "y": node.pos_y},
        )


class GraphEdgeSchema(BaseModel):
    id: UUID
    source: UUID
    target: UUID
    sourceHandle: str | None = None

    @classmethod
    def from_model(cls, edge) -> "GraphEdgeSchema":
        return cls(
            id=edge.id,
            source=edge.source_node_id,
            target=edge.target_node_id,
            sourceHandle=edge.source_handle,
        )


class GraphUpdate(BaseModel):
    nodes: list[GraphNodeSchema]
    edges: list[GraphEdgeSchema]


class GraphResponse(BaseModel):
    nodes: list[GraphNodeSchema]
    edges: list[GraphEdgeSchema]


class AssetResponse(BaseModel):
    id: UUID
    kind: str
    filename: str
    mime_type: str
    size_bytes: int
    url: str

    model_config = {"from_attributes": True}


class PreviewStateResponse(BaseModel):
    background: dict[str, Any] | None = None
    characters: list[dict[str, Any]] = Field(default_factory=list)
    dialogue: dict[str, Any] | None = None
    music: dict[str, Any] | None = None
    sound: dict[str, Any] | None = None
    effect: dict[str, Any] | None = None
    variables: dict[str, Any] = Field(default_factory=dict)


class ExportValidationError(BaseModel):
    errors: list[str]
