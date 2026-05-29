"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";

import { BLOCK_TYPES, DEFAULT_NODE_DATA, type GraphEdge, type GraphNode } from "@/lib/api";
import { isProtectedEdge, isSystemBlockType } from "@/lib/system-blocks";
import { useEditorTheme } from "./EditorThemeProvider";
import { nodeTypes } from "./nodes/GameNode";
import { useEditorStore } from "./store";
import { ViewportBridge } from "./ViewportBridge";

function toFlowNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: "gameNode",
    position: n.position,
    deletable: !isSystemBlockType(n.type),
    data: {
      nodeType: n.type,
      label: n.label,
      summary: summarizeNode(n),
      options: n.type === "choice" ? (n.data.options as unknown[]) : undefined,
    },
  }));
}

function toFlowEdges(edges: GraphEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
  }));
}

function summarizeNode(node: GraphNode): string {
  const data = node.data;
  switch (node.type) {
    case "dialogue":
      return String(data.text ?? "").slice(0, 40);
    case "scene":
      return String(data.transition ?? "dissolve");
    case "choice":
      return `${(data.options as unknown[])?.length ?? 0} вариантов`;
    case "condition":
      return String(data.expression ?? "");
    case "jump":
      return String(data.target_label ?? "");
    case "loading":
      return "экран загрузки";
    case "main_menu":
      return "главное меню";
    case "settings":
      return "экран настроек";
    default:
      return "";
  }
}

function fromFlowNodes(nodes: Node[], original: GraphNode[]): GraphNode[] {
  const originalMap = new Map(original.map((n) => [n.id, n]));
  return nodes.map((n) => {
    const prev = originalMap.get(n.id);
    return {
      id: n.id,
      type: String(n.data.nodeType ?? prev?.type ?? "start"),
      label: String(n.data.label ?? prev?.label ?? "node"),
      data: prev?.data ?? {},
      position: n.position,
    };
  });
}

function fromFlowEdges(edges: Edge[]): GraphEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
  }));
}

type FlowCanvasProps = {
  onGraphChange: (nodes: GraphNode[], edges: GraphEdge[]) => void;
};

export function FlowCanvas({ onGraphChange }: FlowCanvasProps) {
  const { theme } = useEditorTheme();
  const storeNodes = useEditorStore((s) => s.nodes);
  const storeEdges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const setNodesStore = useEditorStore((s) => s.setNodes);
  const setEdgesStore = useEditorStore((s) => s.setEdges);
  const isSyncingRef = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(storeNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(storeEdges));

  const storeNodeIds = useMemo(() => storeNodes.map((n) => n.id).join(","), [storeNodes]);
  const nodeDataKey = useMemo(
    () => storeNodes.map((n) => `${n.id}:${n.label}:${JSON.stringify(n.data)}`).join("|"),
    [storeNodes],
  );

  useEffect(() => {
    isSyncingRef.current = true;
    setNodes((current) => {
      const currentById = new Map(current.map((n) => [n.id, n]));
      return storeNodes.map((storeNode) => {
        const existing = currentById.get(storeNode.id);
        const flowNode = toFlowNodes([storeNode])[0];
        return {
          ...flowNode,
          selected: storeNode.id === selectedNodeId,
          position: existing?.position ?? flowNode.position,
        };
      });
    });
    setEdges(toFlowEdges(storeEdges));
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [nodeDataKey, storeNodeIds, storeEdges, selectedNodeId, setNodes, setEdges, storeNodes]);

  const emitChange = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const graphNodes = fromFlowNodes(nextNodes, storeNodes);
      const graphEdges = fromFlowEdges(nextEdges);
      setNodesStore(graphNodes);
      setEdgesStore(graphEdges);
      onGraphChange(graphNodes, graphEdges);
    },
    [onGraphChange, setEdgesStore, setNodesStore, storeNodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = addEdge({ ...connection, id: uuidv4() }, edges);
      setEdges(nextEdges);
      emitChange(nodes, nextEdges);
    },
    [edges, emitChange, nodes, setEdges],
  );

  const onNodeDragStop = useCallback(() => {
    emitChange(nodes, edges);
  }, [emitChange, nodes, edges]);

  const onNodesDelete = useCallback(() => {
    emitChange(nodes, edges);
  }, [emitChange, nodes, edges]);

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      const filtered = changes.filter((change) => {
        if (change.type !== "remove") return true;
        const edge = edges.find((e) => e.id === change.id);
        return edge ? !isProtectedEdge(edge, storeNodes) : true;
      });
      if (filtered.length > 0) {
        onEdgesChange(filtered);
      }
    },
    [edges, onEdgesChange, storeNodes],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      if (isSyncingRef.current) return;
      if (selected.length > 0) {
        selectNode(selected[0].id);
      }
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const blockColors = useMemo(
    () => Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.color])),
    [],
  );

  const gridMinor = theme === "light" ? "#d4d4d8" : "#1c1c22";
  const gridMajor = theme === "light" ? "#a1a1aa" : "#26262e";
  const minimapMask = theme === "light" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";

  return (
    <div className="h-full w-full rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        colorMode={theme}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Lines} gap={20} lineWidth={0.4} color={gridMinor} />
        <Background
          id="grid-major"
          variant={BackgroundVariant.Lines}
          gap={100}
          lineWidth={0.5}
          color={gridMajor}
        />
        <ViewportBridge />
        <Controls />
        <MiniMap
          nodeColor={(node) => blockColors[String(node.data?.nodeType)] ?? "#71717a"}
          maskColor={minimapMask}
          bgColor={theme === "light" ? "#f4f4f5" : "#18181b"}
        />
      </ReactFlow>
    </div>
  );
}

export function createNode(
  type: string,
  index: number,
  position?: { x: number; y: number },
): GraphNode {
  const label =
    type === "start" || type === "loading" || type === "main_menu" || type === "settings"
      ? type
      : type === "label"
        ? `label_${index}`
        : `${type}_${index}`;

  const defaultPosition = {
    x: 120 + (index % 4) * 220,
    y: 80 + Math.floor(index / 4) * 120,
  };

  return {
    id: uuidv4(),
    type,
    label,
    data: { ...(DEFAULT_NODE_DATA[type] ?? {}) },
    position: position ?? defaultPosition,
  };
}
