"use client";

import { Bug } from "lucide-react";

import type { GraphNode, PreviewState } from "@/lib/api";
import type { GameSession } from "@/lib/game-player";

type PreviewDebugPanelProps = {
  selectedNode: GraphNode | null;
  displayState: PreviewState | null;
  isPlaying: boolean;
  gameSession: GameSession | null;
};

export function PreviewDebugPanel({
  selectedNode,
  displayState,
  isPlaying,
  gameSession,
}: PreviewDebugPanelProps) {
  const variables = isPlaying && gameSession ? gameSession.variables : (displayState?.variables ?? {});
  const varEntries = Object.entries(variables);

  return (
    <aside className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pl-3 text-[9px] leading-tight">
      <div className="mb-1.5 flex shrink-0 items-center gap-1.5 font-semibold text-[var(--editor-text)]">
        <Bug size={11} className="shrink-0 text-indigo-400" />
        Отладка
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 content-start">
        <Section title="Режим">
          <Row label="Состояние" value={isPlaying ? "Игра" : "Редактор"} />
          {isPlaying && gameSession?.wait && <Row label="Ожидание" value={gameSession.wait} />}
        </Section>

        {selectedNode && (
          <Section title="Блок">
            <Row label="Тип" value={selectedNode.type} />
            <Row label="Метка" value={selectedNode.label} />
          </Section>
        )}

        <Section title="Медиа">
          <Row
            label="Музыка"
            value={displayState?.music?.url.split("/").pop() ?? "—"}
          />
          <Row
            label="Звук"
            value={displayState?.sound?.url.split("/").pop() ?? "—"}
          />
          <Row label="Персонажи" value={String(displayState?.characters.length ?? 0)} />
        </Section>

        <Section title="Переменные">
          {varEntries.length === 0 ? (
            <p className="text-[var(--editor-muted)]">—</p>
          ) : (
            varEntries.slice(0, 4).map(([key, val]) => (
              <Row key={key} label={key} value={String(val)} />
            ))
          )}
        </Section>
      </div>

      {displayState?.dialogue && (
        <div className="mt-1 shrink-0 border-t border-[var(--editor-border)] pt-1">
          <div className="mb-0.5 text-[8px] font-semibold uppercase text-[var(--editor-muted)]">Диалог</div>
          <Row label="Кто" value={displayState.dialogue.character} />
          <p className="line-clamp-2 text-[var(--editor-text)]">{displayState.dialogue.text}</p>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--editor-muted)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-1 py-px">
      <span className="shrink-0 text-[var(--editor-muted)]">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium text-[var(--editor-text)]" title={value}>
        {value}
      </span>
    </div>
  );
}
