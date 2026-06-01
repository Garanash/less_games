"use client";

import { ScenePropertiesPanel } from "./ScenePropertiesPanel";
import type { ProjectCharacter } from "@/lib/api";
import type { GalleryConfig } from "@/lib/gallery";

type EditorSidebarProps = {
  characters: ProjectCharacter[];
  gallery: GalleryConfig;
  onDeleteNode: (nodeId: string) => void;
  onDirty: () => void;
  hideHeader?: boolean;
};

export function EditorSidebar({ characters, gallery, onDeleteNode, onDirty, hideHeader }: EditorSidebarProps) {
  return (
    <div
      className={
        hideHeader
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)]"
      }
    >
      {!hideHeader && (
        <div className="shrink-0 border-b border-[var(--editor-border)] px-3 py-2">
          <h2 className="text-xs font-semibold text-[var(--editor-text)]">Свойства</h2>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScenePropertiesPanel
          characters={characters}
          gallery={gallery}
          onDeleteNode={onDeleteNode}
          onDirty={onDirty}
        />
      </div>
    </div>
  );
}
