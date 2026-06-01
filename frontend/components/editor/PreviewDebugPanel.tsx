"use client";

import { Bug, ChevronLeft, ChevronRight } from "lucide-react";

import type { GraphNode, PreviewState } from "@/lib/api";
import type { GameSession } from "@/lib/game-player";
import { cn } from "@/lib/utils";

type PreviewDebugPanelProps = {
  selectedNode: GraphNode | null;
  displayState: PreviewState | null;
  isPlaying: boolean;
  gameSession: GameSession | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function PreviewDebugPanel({
  selectedNode,
  displayState,
  isPlaying,
  gameSession,
  collapsed,
  onToggleCollapse,
}: PreviewDebugPanelProps) {
  const variables = isPlaying && gameSession ? gameSession.variables : (displayState?.variables ?? {});
  const varEntries = Object.entries(variables);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Развернуть отладку"
        className="flex h-full w-9 shrink-0 flex-col items-center justify-center gap-2 self-stretch border-l border-[var(--editor-border)] bg-[var(--editor-surface-alt)] py-3 text-[10px] text-[var(--editor-muted)] transition hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
      >
        <Bug size={14} className="text-indigo-400" />
        <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">Отладка</span>
        <ChevronLeft size={14} />
      </button>
    );
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col self-stretch overflow-hidden border-l border-[var(--editor-border)] bg-[var(--editor-surface-alt)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--editor-border)] px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--editor-text)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15">
            <Bug size={13} className="text-indigo-400" />
          </span>
          Отладка
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Свернуть отладку"
            className="rounded-md p-1 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        <DebugCard title="Режим">
          <Row label="Состояние" value={isPlaying ? "Игра" : "Редактор"} highlight={isPlaying} />
          {isPlaying && gameSession?.wait && <Row label="Ожидание" value={gameSession.wait} />}
        </DebugCard>

        {selectedNode && (
          <DebugCard title="Блок">
            <Row label="Тип" value={selectedNode.type} />
            <Row label="Метка" value={selectedNode.label} />
          </DebugCard>
        )}

        <DebugCard title="Медиа">
          <Row label="Музыка" value={displayState?.music?.url.split("/").pop() ?? "—"} />
          <Row label="Звук" value={displayState?.sound?.url.split("/").pop() ?? "—"} />
          <Row label="Персонажи" value={String(displayState?.characters.length ?? 0)} />
        </DebugCard>

        <DebugCard title="Переменные">
          {varEntries.length === 0 ? (
            <p className="text-[10px] text-[var(--editor-muted)]">Нет переменных</p>
          ) : (
            varEntries.slice(0, 8).map(([key, val]) => <Row key={key} label={key} value={String(val)} />)
          )}
        </DebugCard>

        {displayState?.dialogue && (
          <DebugCard title="Диалог">
            <Row label="Кто" value={displayState.dialogue.character} />
            <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-[var(--editor-text)]">
              {displayState.dialogue.text}
            </p>
          </DebugCard>
        )}
      </div>
    </aside>
  );
}

function DebugCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface)]/80 p-2.5">
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--editor-muted)]">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 text-[10px]">
      <span className="shrink-0 text-[var(--editor-muted)]">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate font-medium",
          highlight ? "text-emerald-400" : "text-[var(--editor-text)]",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
