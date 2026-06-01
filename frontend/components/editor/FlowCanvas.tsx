"use client";



import { useCallback, useEffect, useMemo, useRef } from "react";

import {

  Background,

  BackgroundVariant,

  Controls,

  MiniMap,

  ReactFlow,

  addEdge,

  applyEdgeChanges,

  reconnectEdge,

  useEdgesState,

  useNodesState,

  type Connection,

  type Edge,

  type EdgeChange,

  type Node,

} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { v4 as uuidv4 } from "uuid";



import { edgeTypes } from "@/components/editor/edges/SelectableEdge";

import { BLOCK_TYPES, DEFAULT_NODE_DATA, type GraphEdge, type GraphNode } from "@/lib/api";

import {

  isProtectedEdge,

  isSystemBlockType,

  mergeCanvasGraph,

  splitGraphForCanvas,

} from "@/lib/system-blocks";

import { useEditorTheme } from "./EditorThemeProvider";

import { nodeTypes } from "./nodes/GameNode";

import { useEditorStore } from "./store";

import { ViewportBridge } from "./ViewportBridge";



type ConnectionHighlight = {

  role: "source" | "target";

  handleId?: string | null;

};



function toFlowNodes(nodes: GraphNode[], selectedEdge: GraphEdge | null): Node[] {

  return nodes.map((n) => {

    let connectionHighlight: ConnectionHighlight | undefined;

    if (selectedEdge) {

      if (selectedEdge.source === n.id) {

        connectionHighlight = { role: "source", handleId: selectedEdge.sourceHandle };

      } else if (selectedEdge.target === n.id) {

        connectionHighlight = { role: "target" };

      }

    }



    return {

      id: n.id,

      type: "gameNode",

      position: n.position,

      deletable: !isSystemBlockType(n.type),

      data: {

        nodeType: n.type,

        label: n.label,

        summary: summarizeNode(n),

        options: n.type === "choice" ? (n.data.options as unknown[]) : undefined,

        connectionHighlight,

      },

    };

  });

}



function toFlowEdges(edges: GraphEdge[], allNodes: GraphNode[], selectedEdgeId: string | null): Edge[] {

  return edges.map((e) => {

    const protectedEdge = isProtectedEdge(e, allNodes);

    return {

      id: e.id,

      source: e.source,

      target: e.target,

      sourceHandle: e.sourceHandle ?? undefined,

      type: "selectable",

      selectable: true,

      selected: e.id === selectedEdgeId,

      reconnectable: !protectedEdge,

      deletable: !protectedEdge,

      focusable: true,

    };

  });

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

  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId);

  const selectNode = useEditorStore((s) => s.selectNode);

  const selectEdge = useEditorStore((s) => s.selectEdge);

  const setNodesStore = useEditorStore((s) => s.setNodes);

  const setEdgesStore = useEditorStore((s) => s.setEdges);

  const isSyncingRef = useRef(false);



  const hiddenGraphRef = useRef<{ hiddenNodes: GraphNode[]; hiddenEdges: GraphEdge[] }>({

    hiddenNodes: [],

    hiddenEdges: [],

  });



  const canvasStore = useMemo(

    () => splitGraphForCanvas(storeNodes, storeEdges),

    [storeNodes, storeEdges],

  );



  const selectedCanvasEdge = useMemo(

    () => canvasStore.canvasEdges.find((e) => e.id === selectedEdgeId) ?? null,

    [canvasStore.canvasEdges, selectedEdgeId],

  );



  const [nodes, setNodes, onNodesChange] = useNodesState(

    toFlowNodes(canvasStore.canvasNodes, selectedCanvasEdge),

  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(

    toFlowEdges(canvasStore.canvasEdges, storeNodes, selectedEdgeId),

  );



  hiddenGraphRef.current = {

    hiddenNodes: canvasStore.hiddenNodes,

    hiddenEdges: canvasStore.hiddenEdges,

  };



  const storeNodeIds = useMemo(() => storeNodes.map((n) => n.id).join(","), [storeNodes]);

  const nodeDataKey = useMemo(

    () => storeNodes.map((n) => `${n.id}:${n.label}:${JSON.stringify(n.data)}`).join("|"),

    [storeNodes],

  );



  useEffect(() => {

    isSyncingRef.current = true;

    const split = splitGraphForCanvas(storeNodes, storeEdges);

    const canvasEdge = split.canvasEdges.find((e) => e.id === selectedEdgeId) ?? null;

    hiddenGraphRef.current = {

      hiddenNodes: split.hiddenNodes,

      hiddenEdges: split.hiddenEdges,

    };

    setNodes((current) => {

      const currentById = new Map(current.map((n) => [n.id, n]));

      return split.canvasNodes.map((storeNode) => {

        const existing = currentById.get(storeNode.id);

        const flowNode = toFlowNodes([storeNode], canvasEdge)[0];

        return {

          ...flowNode,

          selected: storeNode.id === selectedNodeId,

          position: existing?.position ?? flowNode.position,

        };

      });

    });

    setEdges(toFlowEdges(split.canvasEdges, storeNodes, selectedEdgeId));

    requestAnimationFrame(() => {

      isSyncingRef.current = false;

    });

  }, [

    nodeDataKey,

    storeNodeIds,

    storeEdges,

    selectedNodeId,

    selectedEdgeId,

    setNodes,

    setEdges,

    storeNodes,

  ]);



  const emitChange = useCallback(

    (nextNodes: Node[], nextEdges: Edge[]) => {

      const canvasGraphNodes = fromFlowNodes(nextNodes, storeNodes);

      const canvasGraphEdges = fromFlowEdges(nextEdges);

      const { nodes: graphNodes, edges: graphEdges } = mergeCanvasGraph(

        canvasGraphNodes,

        canvasGraphEdges,

        hiddenGraphRef.current.hiddenNodes,

        hiddenGraphRef.current.hiddenEdges,

      );

      setNodesStore(graphNodes);

      setEdgesStore(graphEdges);

      onGraphChange(graphNodes, graphEdges);

    },

    [onGraphChange, setEdgesStore, setNodesStore, storeNodes],

  );



  const onConnect = useCallback(

    (connection: Connection) => {

      const nextEdges = addEdge({ ...connection, id: uuidv4(), type: "selectable" }, edges);

      setEdges(nextEdges);

      emitChange(nodes, nextEdges);

    },

    [edges, emitChange, nodes, setEdges],

  );



  const onReconnect = useCallback(

    (oldEdge: Edge, newConnection: Connection) => {

      const nextEdges = reconnectEdge(oldEdge, newConnection, edges);

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

    (changes: EdgeChange[]) => {

      const filtered = changes.filter((change) => {

        if (change.type !== "remove") return true;

        const edge = edges.find((e) => e.id === change.id);

        return edge ? !isProtectedEdge(fromFlowEdges([edge])[0], storeNodes) : true;

      });

      if (filtered.length === 0) return;



      const nextEdges = applyEdgeChanges(filtered, edges);

      onEdgesChange(filtered);

      if (filtered.some((c) => c.type === "remove" || c.type === "replace")) {

        if (filtered.some((c) => c.type === "remove" && c.id === selectedEdgeId)) {

          selectEdge(null);

        }

        emitChange(nodes, nextEdges);

      }

    },

    [edges, onEdgesChange, storeNodes, emitChange, nodes, selectedEdgeId, selectEdge],

  );



  const onSelectionChange = useCallback(

    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {

      if (isSyncingRef.current) return;

      if (selectedEdges.length > 0) {

        selectEdge(selectedEdges[0].id);

        return;

      }

      if (selectedNodes.length > 0) {

        selectNode(selectedNodes[0].id);

        return;

      }

      selectNode(null);

      selectEdge(null);

    },

    [selectEdge, selectNode],

  );



  const onPaneClick = useCallback(() => {

    selectNode(null);

    selectEdge(null);

  }, [selectNode, selectEdge]);



  const onEdgesDelete = useCallback(

    (deleted: Edge[]) => {

      const ids = new Set(deleted.map((e) => e.id));

      if (ids.has(selectedEdgeId ?? "")) {

        selectEdge(null);

      }

    },

    [selectedEdgeId, selectEdge],

  );



  const blockColors = useMemo(

    () => Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.color])),

    [],

  );



  const gridMinor = theme === "light" ? "#d4d4d8" : "#1c1c22";

  const gridMajor = theme === "light" ? "#a1a1aa" : "#26262e";

  const minimapMask = theme === "light" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";



  return (

    <div className="h-full w-full bg-[var(--editor-surface-alt)]">

      <ReactFlow

        nodes={nodes}

        edges={edges}

        onNodesChange={onNodesChange}

        onEdgesChange={handleEdgesChange}

        onConnect={onConnect}

        onReconnect={onReconnect}

        onNodeDragStop={onNodeDragStop}

        onNodesDelete={onNodesDelete}

        onEdgesDelete={onEdgesDelete}

        onSelectionChange={onSelectionChange}

        onPaneClick={onPaneClick}

        nodeTypes={nodeTypes}

        edgeTypes={edgeTypes}

        colorMode={theme}

        snapToGrid

        snapGrid={[20, 20]}

        fitView

        deleteKeyCode={["Backspace", "Delete"]}

        edgesReconnectable

        elementsSelectable

        edgesFocusable

        connectionRadius={28}

        defaultEdgeOptions={{ type: "selectable", selectable: true, focusable: true }}

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


