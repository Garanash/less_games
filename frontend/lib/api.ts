export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail: unknown = undefined;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    let message = `Request failed: ${response.status}`;
    if (typeof detail === "object" && detail && "detail" in detail) {
      const d = (detail as { detail: unknown }).detail;
      message = typeof d === "string" ? d : JSON.stringify(d);
    }
    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ id: string; email: string; is_verified: boolean }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  me: () => request<{ id: string; email: string; is_verified: boolean }>("/auth/me"),

  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  listProjects: () =>
    request<Array<ProjectSummary>>("/projects"),

  createProject: (title: string) =>
    request<ProjectSummary>("/projects", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  updateProject: (id: string, data: { title?: string; metadata?: Record<string, unknown> }) =>
    request<ProjectSummary>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getProject: (id: string) => request<ProjectSummary>(`/projects/${id}`),

  duplicateProject: (id: string) =>
    request<ProjectSummary>(`/projects/${id}/duplicate`, { method: "POST" }),

  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  getGraph: (projectId: string) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/projects/${projectId}/graph`),

  saveGraph: (projectId: string, graph: { nodes: GraphNode[]; edges: GraphEdge[] }) =>
    request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/projects/${projectId}/graph`, {
      method: "PATCH",
      body: JSON.stringify(graph),
    }),

  listAssets: (projectId: string) =>
    request<Asset[]>(`/projects/${projectId}/assets`),

  uploadAsset: (projectId: string, kind: string, file: File) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    return request<Asset>(`/projects/${projectId}/assets`, {
      method: "POST",
      body: form,
    });
  },

  deleteAsset: (projectId: string, assetId: string) =>
    request<void>(`/projects/${projectId}/assets/${assetId}`, { method: "DELETE" }),

  renameAsset: (projectId: string, assetId: string, filename: string) =>
    request<Asset>(`/projects/${projectId}/assets/${assetId}`, {
      method: "PATCH",
      body: JSON.stringify({ filename }),
    }),

  previewState: (projectId: string, nodeId: string) =>
    request<PreviewState>(`/projects/${projectId}/preview-state?node_id=${nodeId}`),

  exportRenpy: async (projectId: string, title: string, platform?: string) => {
    const params = platform ? `?platform=${platform}` : "";
    const response = await fetch(`${API_URL}/projects/${projectId}/export/renpy${params}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new ApiError("Export failed", response.status, detail);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = platform ? `_${platform}` : "";
    link.download = `${title.replace(/\s+/g, "_")}_renpy${suffix}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export type CharacterEmotion = {
  /** Stable key for React lists (never changes after creation). */
  ui_key?: string;
  id: string;
  label: string;
  asset_id: string;
};

export type ProjectCharacter = {
  id: string;
  display_name: string;
  color: string;
  /** @deprecated use emotions + default_emotion_id */
  default_sprite_asset_id?: string;
  emotions?: CharacterEmotion[];
  default_emotion_id?: string;
};

export const DEFAULT_CHARACTERS: ProjectCharacter[] = [
  { id: "narrator", display_name: "Рассказчик", color: "#aaaaaa" },
];

export type ProjectSummary = {
  id: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type GraphNode = {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  position: { x: number; y: number };
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
};

export type Asset = {
  id: string;
  kind: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
};

export type PreviewState = {
  background?: { asset_id: string; url: string; transition?: string } | null;
  characters: Array<{
    character_id: string;
    asset_id: string;
    url: string;
    position: string;
  }>;
  dialogue?: { character: string; text: string; emotion_id?: string } | null;
  music?: { asset_id: string; url: string; fade?: number; loop?: boolean } | null;
  sound?: { asset_id: string; url: string } | null;
  effect?: { type: string; params?: Record<string, unknown> } | null;
  uiScreen?: "loading" | "main_menu" | "settings" | "gallery" | "save" | "load";
  variables: Record<string, unknown>;
};

export const BLOCK_TYPES = [
  { type: "loading", label: "Загрузка", color: "#0ea5e9" },
  { type: "main_menu", label: "Главное меню", color: "#6366f1" },
  { type: "settings", label: "Настройки", color: "#8b5cf6" },
  { type: "start", label: "Старт", color: "#22c55e" },
  { type: "scene", label: "Сцена", color: "#3b82f6" },
  { type: "dialogue", label: "Диалог", color: "#a855f7" },
  { type: "choice", label: "Выбор", color: "#f59e0b" },
  { type: "show_character", label: "Показать", color: "#06b6d4" },
  { type: "hide_character", label: "Скрыть", color: "#64748b" },
  { type: "music", label: "Музыка", color: "#ec4899" },
  { type: "sound", label: "Звук", color: "#f97316" },
  { type: "effect", label: "Эффект", color: "#8b5cf6" },
  { type: "set_variable", label: "Переменная", color: "#14b8a6" },
  { type: "unlock_cg", label: "Открыть CG", color: "#e879f9" },
  { type: "condition", label: "Условие", color: "#ef4444" },
  { type: "jump", label: "Переход", color: "#6366f1" },
  { type: "label", label: "Метка", color: "#84cc16" },
  { type: "end", label: "Конец", color: "#71717a" },
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number]["type"];

export const DEFAULT_NODE_DATA: Record<string, Record<string, unknown>> = {
  loading: {},
  main_menu: {},
  settings: {},
  start: {
    title: "",
    background_asset_id: "",
    music_asset_id: "",
    intro_character: "narrator",
    intro_text: "",
  },
  scene: { asset_id: "", transition: "dissolve" },
  dialogue: { character: "narrator", text: "", emotion_id: "", effect_type: "", effect_params: {} },
  choice: { options: [{ handle: "option_0", text: "Вариант 1", highlight: false }] },
  show_character: { character_id: "hero", emotion_id: "neutral", asset_id: "", position: "center" },
  hide_character: { character_id: "hero" },
  music: { asset_id: "", fade: 0, loop: true },
  sound: { asset_id: "" },
  effect: { effect_type: "dissolve", params: {} },
  set_variable: { name: "score", value: 0 },
  unlock_cg: { item_id: "" },
  condition: { expression: "score > 0" },
  jump: { target_label: "" },
  label: { name: "scene_2" },
  end: {},
};
