import { create } from "zustand";
import type { Asset, GraphEdge, GraphNode, PreviewState } from "@/lib/api";

type EditorState = {
  projectId: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  assets: Asset[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  previewState: PreviewState | null;
  isSaving: boolean;
  setProjectId: (id: string) => void;
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  setAssets: (assets: Asset[]) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  setPreviewState: (state: PreviewState | null) => void;
  setIsSaving: (value: boolean) => void;
  getAddNodePosition: () => { x: number; y: number };
  setGetAddNodePosition: (fn: () => { x: number; y: number }) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: null,
  nodes: [],
  edges: [],
  assets: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  previewState: null,
  isSaving: false,
  setProjectId: (id) => set({ projectId: id }),
  setGraph: (nodes, edges) => set({ nodes, edges }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setAssets: (assets) => set({ assets }),
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    }),
  updateNodeLabel: (id, label) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }),
  setPreviewState: (previewState) => set({ previewState }),
  setIsSaving: (isSaving) => set({ isSaving }),
  getAddNodePosition: () => ({ x: 200, y: 200 }),
  setGetAddNodePosition: (fn) => set({ getAddNodePosition: fn }),
}));
