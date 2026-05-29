"use client";

import { Loader2, Monitor, Smartphone, Apple } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BuildPlatform = "windows" | "linux" | "macos" | "android";

type PlatformOption = {
  id: BuildPlatform;
  label: string;
  hint: string;
  icon: typeof Monitor;
};

const PLATFORMS: PlatformOption[] = [
  { id: "windows", label: "Windows", hint: "Ren'Py — сборка .exe", icon: Monitor },
  { id: "linux", label: "Linux", hint: "Ren'Py — x86_64 / ARM", icon: Monitor },
  { id: "macos", label: "macOS", hint: "Ren'Py — .app", icon: Apple },
  { id: "android", label: "Android", hint: "Ren'Py — APK", icon: Smartphone },
];

type BuildGameModalProps = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onBuild: (platform: BuildPlatform) => void;
};

export function BuildGameModal({ open, loading, onClose, onBuild }: BuildGameModalProps) {
  const [platform, setPlatform] = useState<BuildPlatform>("windows");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] shadow-2xl">
        <div className="border-b border-[var(--editor-border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--editor-text)]">Собрать игру</h2>
          <p className="mt-1 text-sm text-[var(--editor-muted)]">
            Выберите платформу — будет скачан проект Ren&apos;Py для сборки под выбранную ОС
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4">
          {PLATFORMS.map((item) => {
            const Icon = item.icon;
            const selected = platform === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlatform(item.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition",
                  selected
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/40"
                    : "border-[var(--editor-border)] bg-[var(--editor-surface-alt)] hover:border-indigo-500/40 hover:bg-[var(--editor-surface-hover)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} className={selected ? "text-indigo-500" : "text-[var(--editor-muted)]"} />
                  <span className="text-sm font-medium text-[var(--editor-text)]">{item.label}</span>
                </div>
                <span className="text-[10px] text-[var(--editor-muted)]">{item.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--editor-border)] px-5 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="button" size="sm" onClick={() => onBuild(platform)} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Сборка...
              </>
            ) : (
              "Скачать проект"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
