"use client";

import { ChevronDown, ChevronRight, ListTree } from "lucide-react";
import { useMemo, useState } from "react";

import { useEditorStore } from "@/components/editor/store";
import { BLOCK_TYPES } from "@/lib/api";
import { getBlockIcon } from "@/lib/block-icons";
import { buildGameStructureTree, type StructureTreeItem } from "@/lib/game-structure-tree";
import { cn } from "@/lib/utils";

type GameStructureTreeProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

function TreeNodeRow({
  item,
  selectedNodeId,
  onSelect,
  defaultExpanded,
}: {
  item: StructureTreeItem;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? item.depth < 2);
  const hasChildren = item.children.length > 0;
  const blockMeta = BLOCK_TYPES.find((b) => b.type === item.type);
  const Icon = getBlockIcon(item.type);
  const isGroup = item.type === "group";
  const isSelected = item.nodeId && selectedNodeId === item.nodeId;

  if (isGroup) {
    return (
      <div className="mt-2">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--editor-muted)]">
          {item.label}
        </div>
        {item.children.map((child) => (
          <TreeNodeRow
            key={child.key}
            item={child}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-stretch"
        style={{ paddingLeft: `${Math.min(item.depth, 8) * 10 + 4}px` }}
      >
        <button
          type="button"
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={cn(
            "flex w-4 shrink-0 items-center justify-center text-[var(--editor-muted)]",
            hasChildren ? "hover:text-[var(--editor-text)]" : "invisible",
          )}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button
          type="button"
          onClick={() => item.nodeId && onSelect(item.nodeId)}
          disabled={!item.nodeId}
          className={cn(
            "mb-0.5 flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] transition",
            isSelected
              ? "bg-indigo-600/20 text-indigo-200 ring-1 ring-indigo-500/40"
              : "text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]",
            item.isCycle && "opacity-70",
          )}
        >
          <Icon size={12} className="shrink-0" style={{ color: blockMeta?.color }} />
          <span className="min-w-0 truncate font-medium">{item.label}</span>
          {item.branchHint && (
            <span className="shrink-0 truncate text-[9px] text-[var(--editor-muted)]">
              ({item.branchHint})
            </span>
          )}
          {item.isCycle && <span className="shrink-0 text-[9px] text-amber-500">↺</span>}
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {item.children.map((child) => (
            <TreeNodeRow
              key={child.key}
              item={child}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GameStructureTree({ collapsed, onToggleCollapse }: GameStructureTreeProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);

  const tree = useMemo(() => buildGameStructureTree(nodes, edges), [nodes, edges]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Развернуть структуру"
        className="flex h-full w-8 shrink-0 flex-col items-center gap-2 border-r border-[var(--editor-border)] bg-[var(--editor-surface)] py-3 text-[10px] text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
      >
        <ListTree size={14} />
        <span className="[writing-mode:vertical-rl] rotate-180">Структура</span>
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--editor-border)] px-2 py-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--editor-text)]">
          <ListTree size={13} className="text-indigo-400" />
          Структура
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Свернуть"
            className="rounded p-0.5 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
          >
            <ChevronDown size={14} className="-rotate-90" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-[var(--editor-muted)]">Нет блоков</p>
        ) : (
          tree.map((item) => (
            <TreeNodeRow
              key={item.key}
              item={item}
              selectedNodeId={selectedNodeId}
              onSelect={selectNode}
            />
          ))
        )}
      </div>
      <div className="shrink-0 border-t border-[var(--editor-border)] px-2 py-1 text-[9px] text-[var(--editor-muted)]">
        {nodes.length} блоков
      </div>
    </div>
  );
}
