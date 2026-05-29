"use client";

import { ScenePropertiesPanel } from "./ScenePropertiesPanel";
import type { ProjectCharacter } from "@/lib/api";

type EditorSidebarProps = {
  characters: ProjectCharacter[];
  onDeleteNode: (nodeId: string) => void;
  onDirty: () => void;
};

export function EditorSidebar({ characters, onDeleteNode, onDirty }: EditorSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)]">
      <div className="shrink-0 border-b border-[var(--editor-border)] px-3 py-2">
        <h2 className="text-xs font-semibold text-[var(--editor-text)]">Свойства блока</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScenePropertiesPanel
          characters={characters}
          onDeleteNode={onDeleteNode}
          onDirty={onDirty}
        />
      </div>
    </div>
  );
}
