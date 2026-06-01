"use client";

import { Image, Music, Trash2, Upload, User, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { Asset } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MEDIA_TABS = [
  { kind: "background", label: "Фоны", icon: Image },
  { kind: "character", label: "Персонажи", icon: User },
  { kind: "cg", label: "CG", icon: Image },
  { kind: "music", label: "Музыка", icon: Music },
  { kind: "sound", label: "Звуки", icon: Volume2 },
  { kind: "voice", label: "Голос", icon: Volume2 },
] as const;

type MediaLibraryPanelProps = {
  assets: Asset[];
  onUpload: (kind: string, file: File) => Promise<void>;
  onDelete: (assetId: string) => Promise<void>;
  onRename?: (assetId: string, filename: string) => Promise<void>;
};

export function MediaLibraryPanel({ assets, onUpload, onDelete, onRename }: MediaLibraryPanelProps) {
  const [activeKind, setActiveKind] = useState<string>("background");
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => assets.filter((a) => a.kind === activeKind), [assets, activeKind]);
  const activeTab = MEDIA_TABS.find((t) => t.kind === activeKind)!;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(activeKind, file);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1 border-b border-[var(--editor-border)] p-2">
        {MEDIA_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = assets.filter((a) => a.kind === tab.kind).length;
          return (
            <button
              key={tab.kind}
              type="button"
              onClick={() => setActiveKind(tab.kind)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition",
                activeKind === tab.kind
                  ? "bg-indigo-600 text-white"
                  : "text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]",
              )}
            >
              <Icon size={12} />
              {tab.label}
              {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="border-b border-[var(--editor-border)] p-4">
        <Label>Загрузить {activeTab.label.toLowerCase()}</Label>
        <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--editor-border)] bg-[var(--editor-surface-alt)] px-4 py-6 hover:border-indigo-500/50 hover:bg-[var(--editor-surface-hover)]">
          <Upload size={20} className="mb-2 text-[var(--editor-muted)]" />
          <span className="text-sm text-[var(--editor-text)]">
            {uploading ? "Загрузка..." : "Выберите файлы или перетащите сюда"}
          </span>
          <span className="mt-1 text-xs text-[var(--editor-muted)]">Можно выбрать несколько файлов</span>
          <input
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            accept={getAccept(activeKind)}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-[var(--editor-muted)]">Нет загруженных файлов</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((asset) => (
              <MediaItem
                key={asset.id}
                asset={asset}
                onDelete={() => onDelete(asset.id)}
                onRename={onRename ? (name) => onRename(asset.id, name) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaItem({
  asset,
  onDelete,
  onRename,
}: {
  asset: Asset;
  onDelete: () => void;
  onRename?: (filename: string) => Promise<void>;
}) {
  const isImage = asset.mime_type.startsWith("image/");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(asset.filename);

  const saveRename = async () => {
    if (onRename && name.trim() && name !== asset.filename) {
      await onRename(name.trim());
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface-alt)] p-2">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--editor-surface-hover)]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
        ) : (
          <Music size={18} className="text-[var(--editor-muted)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setName(asset.filename);
                setEditing(false);
              }
            }}
            className="w-full rounded border border-indigo-500 bg-[var(--editor-input-bg)] px-1 py-0.5 text-sm text-[var(--editor-text)]"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => onRename && setEditing(true)}
            className="truncate text-left text-sm text-[var(--editor-text)] hover:text-indigo-500"
            title={onRename ? "Нажмите для переименования" : asset.filename}
          >
            {asset.filename}
          </button>
        )}
        <p className="text-xs text-[var(--editor-muted)]">{(asset.size_bytes / 1024).toFixed(0)} KB</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded p-1.5 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-red-500"
        title="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function getAccept(kind: string): string {
  switch (kind) {
    case "background":
    case "character":
      return "image/png,image/jpeg,image/webp";
    case "music":
    case "sound":
    case "voice":
      return "audio/mpeg,audio/ogg,audio/wav";
    default:
      return "*/*";
  }
}
