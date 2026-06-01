"use client";

import { Handle, NodeProps, Position } from "@xyflow/react";
import { BLOCK_TYPES } from "@/lib/api";
import { cn } from "@/lib/utils";

type ConnectionHighlight = {
  role: "source" | "target";
  handleId?: string | null;
};

function getBlockColor(type: string) {
  return BLOCK_TYPES.find((b) => b.type === type)?.color ?? "#71717a";
}

function getBlockLabel(type: string) {
  return BLOCK_TYPES.find((b) => b.type === type)?.label ?? type;
}

function handleHighlightClass(active: boolean, baseClass: string) {
  return cn(
    baseClass,
    "transition-transform",
    active &&
      "!z-10 !h-3 !w-3 !scale-125 !border-2 !border-white !ring-2 !ring-indigo-400 !ring-offset-1 !ring-offset-[var(--editor-surface)]",
  );
}

function isHandleHighlighted(
  highlight: ConnectionHighlight | undefined,
  role: "source" | "target",
  handleId?: string | null,
): boolean {
  if (!highlight || highlight.role !== role) return false;
  if (role === "target") return true;
  if (!highlight.handleId) return true;
  return highlight.handleId === handleId;
}

export function GameNode({ data, selected }: NodeProps) {
  const nodeType = String(data.nodeType ?? "start");
  const color = getBlockColor(nodeType);
  const title = String(data.label ?? getBlockLabel(nodeType));
  const summary = String(data.summary ?? "");
  const highlight = data.connectionHighlight as ConnectionHighlight | undefined;

  const hasTrueFalse = nodeType === "condition";
  const hasChoice = nodeType === "choice";
  const isMainMenu = nodeType === "main_menu";
  const isSettings = nodeType === "settings";
  const isLoading = nodeType === "loading";

  const targetActive = isHandleHighlighted(highlight, "target");
  const defaultTarget = handleHighlightClass(targetActive, "!bg-[var(--editor-muted)]");
  const defaultSource = (handleId?: string | null, colorClass = "!bg-[var(--editor-muted)]") =>
    handleHighlightClass(isHandleHighlighted(highlight, "source", handleId), colorClass);

  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 bg-[var(--editor-surface)] px-3 py-2 shadow-[var(--editor-shadow)] ${
        selected ? "border-indigo-500 ring-1 ring-indigo-500/30" : "border-[var(--editor-border)]"
      } ${highlight ? "ring-2 ring-indigo-500/40" : ""}`}
      style={{ borderLeftColor: color, borderLeftWidth: 6 }}
    >
      {!hasTrueFalse && !isLoading && (
        <Handle type="target" position={isSettings ? Position.Left : Position.Top} className={defaultTarget} />
      )}

      <div className="text-xs uppercase tracking-wide text-[var(--editor-muted)]">{getBlockLabel(nodeType)}</div>
      <div className="font-medium text-[var(--editor-text)]">{title}</div>
      {summary && <div className="mt-1 truncate text-xs text-[var(--editor-muted)]">{summary}</div>}

      {hasTrueFalse ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{ left: "30%" }}
            className={defaultSource("true", "!bg-green-500")}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{ left: "70%" }}
            className={defaultSource("false", "!bg-red-500")}
          />
          <Handle type="target" position={Position.Top} className={defaultTarget} />
        </>
      ) : hasChoice ? (
        <>
          <Handle type="target" position={Position.Top} className={defaultTarget} />
          {(data.options as Array<{ handle: string }> | undefined)?.map((opt, i) => {
            const handleId = opt.handle || `option_${i}`;
            return (
              <Handle
                key={handleId}
                id={handleId}
                type="source"
                position={Position.Bottom}
                style={{ left: `${((i + 1) / (((data.options as unknown[])?.length || 1) + 1)) * 100}%` }}
                className={defaultSource(handleId, "!bg-amber-400")}
              />
            );
          })}
        </>
      ) : isMainMenu ? (
        <>
          <Handle
            id="flow"
            type="source"
            position={Position.Bottom}
            className={defaultSource("flow")}
          />
          <Handle
            id="settings"
            type="source"
            position={Position.Right}
            className={defaultSource("settings", "!bg-violet-400")}
          />
        </>
      ) : !isSettings && nodeType !== "end" ? (
        <Handle type="source" position={Position.Bottom} className={defaultSource(null)} />
      ) : null}
    </div>
  );
}

export const nodeTypes = {
  gameNode: GameNode,
};
