"use client";

import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

import { useEditorStore } from "./store";

const GRID_SIZE = 20;

export function ViewportBridge() {
  const { screenToFlowPosition } = useReactFlow();
  const setGetAddNodePosition = useEditorStore((s) => s.setGetAddNodePosition);

  useEffect(() => {
    setGetAddNodePosition(() => {
      const pane = document.querySelector(".react-flow__pane")?.getBoundingClientRect();
      if (!pane) return { x: 200, y: 200 };

      const flowPos = screenToFlowPosition({
        x: pane.left + pane.width / 2,
        y: pane.top + pane.height / 2,
      });

      const nodeCount = useEditorStore.getState().nodes.length;
      const offset = (nodeCount % 5) * 24;

      return {
        x: Math.round((flowPos.x - 90 + offset) / GRID_SIZE) * GRID_SIZE,
        y: Math.round((flowPos.y - 40 + offset) / GRID_SIZE) * GRID_SIZE,
      };
    });
  }, [screenToFlowPosition, setGetAddNodePosition]);

  return null;
}

export { GRID_SIZE };
