import { v4 as uuidv4 } from "uuid";

import { DEFAULT_NODE_DATA, type GraphEdge, type GraphNode } from "@/lib/api";

export const SYSTEM_BLOCK_TYPES = ["loading", "main_menu", "settings", "start"] as const;
export type SystemBlockType = (typeof SYSTEM_BLOCK_TYPES)[number];

export function isSystemBlockType(type: string): type is SystemBlockType {
  return (SYSTEM_BLOCK_TYPES as readonly string[]).includes(type);
}

export function isProtectedEdge(edge: GraphEdge, nodes: GraphNode[]): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const source = byId.get(edge.source);
  const target = byId.get(edge.target);
  if (!source || !target) return false;
  return (
    (source.type === "loading" && target.type === "main_menu") ||
    (source.type === "main_menu" && target.type === "start") ||
    (source.type === "main_menu" && target.type === "settings")
  );
}

function hasEdge(edges: GraphEdge[], source: string, target: string): boolean {
  return edges.some((e) => e.source === source && e.target === target);
}

function edgeKey(edge: Pick<GraphEdge, "source" | "target" | "sourceHandle">): string {
  return `${edge.source}|${edge.target}|${edge.sourceHandle ?? ""}`;
}

function dedupeEdges(edges: GraphEdge[]): { edges: GraphEdge[]; changed: boolean } {
  const seen = new Set<string>();
  let changed = false;
  const next: GraphEdge[] = [];

  for (const edge of edges) {
    if (edge.source === edge.target) {
      changed = true;
      continue;
    }
    const key = edgeKey(edge);
    if (seen.has(key)) {
      changed = true;
      continue;
    }
    seen.add(key);
    next.push(edge);
  }

  return { edges: next, changed };
}

function dedupeSystemNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { nodes: GraphNode[]; edges: GraphEdge[]; changed: boolean } {
  let changed = false;
  const remap = new Map<string, string>();
  let nextNodes = [...nodes];

  for (const type of SYSTEM_BLOCK_TYPES) {
    const matches = nextNodes.filter((n) => n.type === type);
    if (matches.length <= 1) continue;

    const [canonical, ...duplicates] = matches;
    for (const dup of duplicates) {
      remap.set(dup.id, canonical.id);
    }
    nextNodes = nextNodes.filter((n) => n.type !== type || n.id === canonical.id);
    changed = true;
  }

  if (remap.size === 0) {
    return { nodes: nextNodes, edges, changed: false };
  }

  let nextEdges = edges.map((edge) => ({
    ...edge,
    source: remap.get(edge.source) ?? edge.source,
    target: remap.get(edge.target) ?? edge.target,
  }));

  const deduped = dedupeEdges(nextEdges);
  nextEdges = deduped.edges;
  changed = changed || deduped.changed;

  return { nodes: nextNodes, edges: nextEdges, changed };
}

function createSystemNode(
  type: SystemBlockType,
  position: { x: number; y: number },
  projectTitle?: string,
): GraphNode {
  const label = type;
  const data =
    type === "start"
      ? {
          title: projectTitle ?? "",
          background_asset_id: "",
          music_asset_id: "",
          intro_character: "narrator",
          intro_text: "",
        }
      : { ...(DEFAULT_NODE_DATA[type] ?? {}) };

  return {
    id: uuidv4(),
    type,
    label,
    data,
    position,
  };
}

export function ensureSystemGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  projectTitle?: string,
): { nodes: GraphNode[]; edges: GraphEdge[]; changed: boolean } {
  const deduped = dedupeSystemNodes(nodes, edges);
  let nextNodes = deduped.nodes;
  let nextEdges = deduped.edges;
  let changed = deduped.changed;

  let loading = nextNodes.find((n) => n.type === "loading");
  let mainMenu = nextNodes.find((n) => n.type === "main_menu");
  let settings = nextNodes.find((n) => n.type === "settings");
  let start = nextNodes.find((n) => n.type === "start");

  if (!start) {
    start = createSystemNode("start", { x: 720, y: 160 }, projectTitle);
    nextNodes.push(start);
    changed = true;
  }

  if (!loading) {
    loading = createSystemNode("loading", { x: 80, y: 160 });
    nextNodes.unshift(loading);
    changed = true;
  }

  if (!mainMenu) {
    mainMenu = createSystemNode("main_menu", { x: 300, y: 160 });
    const insertAt = nextNodes.findIndex((n) => n.id === loading!.id) + 1;
    nextNodes.splice(insertAt, 0, mainMenu);
    changed = true;
  }

  if (!settings) {
    settings = createSystemNode("settings", { x: 500, y: 160 });
    nextNodes.push(settings);
    changed = true;
  }

  if (!hasEdge(nextEdges, loading.id, mainMenu.id)) {
    nextEdges.push({ id: uuidv4(), source: loading.id, target: mainMenu.id, sourceHandle: null });
    changed = true;
  }

  if (!hasEdge(nextEdges, mainMenu.id, start.id)) {
    nextEdges.push({
      id: uuidv4(),
      source: mainMenu.id,
      target: start.id,
      sourceHandle: "flow",
    });
    changed = true;
  }

  if (!hasEdge(nextEdges, mainMenu.id, settings.id)) {
    nextEdges.push({
      id: uuidv4(),
      source: mainMenu.id,
      target: settings.id,
      sourceHandle: "settings",
    });
    changed = true;
  }

  const normalized = dedupeEdges(nextEdges);
  if (normalized.changed) {
    nextEdges = normalized.edges;
    changed = true;
  }

  return { nodes: nextNodes, edges: nextEdges, changed };
}
