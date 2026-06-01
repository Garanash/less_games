"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function SelectableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "#818cf8" : "#71717a",
          filter: selected ? "drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))" : undefined,
        }}
        interactionWidth={20}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-indigo-300 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
            style={{
              transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY}px)`,
            }}
            title="Начало связи"
          />
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-emerald-300 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            style={{
              transform: `translate(-50%, -50%) translate(${targetX}px, ${targetY}px)`,
            }}
            title="Конец связи"
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = {
  selectable: SelectableEdge,
};
