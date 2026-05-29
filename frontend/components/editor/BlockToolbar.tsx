"use client";

import { Package } from "lucide-react";
import { getBlockIcon } from "@/lib/block-icons";
import { BLOCK_TYPES } from "@/lib/api";
import { isSystemBlockType } from "@/lib/system-blocks";
import { Button } from "@/components/ui/button";
import { createNode } from "./FlowCanvas";
import { useEditorStore } from "./store";

type BlockToolbarProps = {
  onAddNode: (node: ReturnType<typeof createNode>) => void;
  onBuildClick: () => void;
  exportLoading?: boolean;
};

export function BlockToolbar({ onAddNode, onBuildClick, exportLoading }: BlockToolbarProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const selectNode = useEditorStore((s) => s.selectNode);
  const getAddNodePosition = useEditorStore((s) => s.getAddNodePosition);
  const isSaving = useEditorStore((s) => s.isSaving);

  const handleAddBlock = (type: string) => {
    if (isSystemBlockType(type)) return;
    if (type === "start" && nodes.some((n) => n.type === "start")) {
      alert("Блок «Старт» может быть только один");
      return;
    }
    const node = createNode(type, nodes.length, getAddNodePosition());
    onAddNode(node);
    selectNode(node.id);
  };

  const availableBlocks = BLOCK_TYPES.filter((b) => !isSystemBlockType(b.type));

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--editor-border)] bg-[var(--editor-surface)] px-3 py-1.5">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--editor-muted)]">
        Блоки
      </span>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {availableBlocks.map((block) => {
          const Icon = getBlockIcon(block.type);
          return (
            <button
              key={block.type}
              type="button"
              onClick={() => handleAddBlock(block.type)}
              title={block.label}
              className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--editor-border)] bg-[var(--editor-surface-alt)] px-2 py-1 text-[10px] text-[var(--editor-text)] shadow-[var(--editor-shadow)] transition hover:border-indigo-500/50 hover:bg-[var(--editor-surface-hover)]"
            >
              <Icon size={12} style={{ color: block.color }} />
              {block.label}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-l border-[var(--editor-border)] pl-2">
        {isSaving && <span className="text-[10px] text-[var(--editor-muted)]">Сохранение...</span>}
        <Button onClick={onBuildClick} disabled={exportLoading} size="sm" className="h-7 text-xs">
          <Package size={12} />
          {exportLoading ? "Сборка..." : "Собрать игру"}
        </Button>
      </div>
    </div>
  );
}
