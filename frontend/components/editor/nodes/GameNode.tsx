"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { BLOCK_TYPES } from "@/lib/api";

function getBlockColor(type: string) {
  return BLOCK_TYPES.find((b) => b.type === type)?.color ?? "#71717a";
}

function getBlockLabel(type: string) {
  return BLOCK_TYPES.find((b) => b.type === type)?.label ?? type;
}

export function GameNode({ data, selected }: NodeProps) {
  const nodeType = String(data.nodeType ?? "start");
  const color = getBlockColor(nodeType);
  const title = String(data.label ?? getBlockLabel(nodeType));
  const summary = String(data.summary ?? "");

  const hasTrueFalse = nodeType === "condition";
  const hasChoice = nodeType === "choice";
  const isMainMenu = nodeType === "main_menu";
  const isSettings = nodeType === "settings";
  const isLoading = nodeType === "loading";

  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 bg-[var(--editor-surface)] px-3 py-2 shadow-[var(--editor-shadow)] ${
        selected ? "border-indigo-500 ring-1 ring-indigo-500/30" : "border-[var(--editor-border)]"
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 6 }}
    >
      {!hasTrueFalse && !isLoading && (
        <Handle
          type="target"
          position={isSettings ? Position.Left : Position.Top}
          className="!bg-[var(--editor-muted)]"
        />
      )}

      <div className="text-xs uppercase tracking-wide text-[var(--editor-muted)]">{getBlockLabel(nodeType)}</div>
      <div className="font-medium text-[var(--editor-text)]">{title}</div>
      {summary && <div className="mt-1 truncate text-xs text-[var(--editor-muted)]">{summary}</div>}

      {hasTrueFalse ? (
        <>
          <Handle id="true" type="source" position={Position.Bottom} style={{ left: "30%" }} className="!bg-green-500" />
          <Handle id="false" type="source" position={Position.Bottom} style={{ left: "70%" }} className="!bg-red-500" />
          <Handle type="target" position={Position.Top} className="!bg-[var(--editor-muted)]" />
        </>
      ) : hasChoice ? (
        <>
          <Handle type="target" position={Position.Top} className="!bg-[var(--editor-muted)]" />
          {(data.options as Array<{ handle: string }> | undefined)?.map((opt, i) => (
            <Handle
              key={opt.handle || i}
              id={opt.handle || `option_${i}`}
              type="source"
              position={Position.Bottom}
              style={{ left: `${((i + 1) / (((data.options as unknown[])?.length || 1) + 1)) * 100}%` }}
              className="!bg-amber-400"
            />
          ))}
        </>
      ) : isMainMenu ? (
        <>
          <Handle id="flow" type="source" position={Position.Bottom} className="!bg-[var(--editor-muted)]" />
          <Handle
            id="settings"
            type="source"
            position={Position.Right}
            className="!bg-violet-400"
          />
        </>
      ) : !isSettings && nodeType !== "end" ? (
        <Handle type="source" position={Position.Bottom} className="!bg-[var(--editor-muted)]" />
      ) : null}
    </div>
  );
}

export const nodeTypes = {
  gameNode: GameNode,
};
