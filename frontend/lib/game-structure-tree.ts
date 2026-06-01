import type { GraphEdge, GraphNode } from "@/lib/api";

export type StructureTreeItem = {
  key: string;
  nodeId: string;
  label: string;
  type: string;
  branchHint?: string;
  depth: number;
  isCycle?: boolean;
  children: StructureTreeItem[];
};

function sortEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort((a, b) => {
    const ha = a.sourceHandle ?? "";
    const hb = b.sourceHandle ?? "";
    return ha.localeCompare(hb);
  });
}

function buildSubtree(
  nodeId: string,
  depth: number,
  ancestorPath: Set<string>,
  byId: Map<string, GraphNode>,
  outEdges: Map<string, GraphEdge[]>,
  branchHint?: string,
): StructureTreeItem | null {
  const node = byId.get(nodeId);
  if (!node) return null;

  const isCycle = ancestorPath.has(nodeId);
  const item: StructureTreeItem = {
    key: `${nodeId}:${branchHint ?? "main"}:${depth}`,
    nodeId,
    label: node.label,
    type: node.type,
    branchHint,
    depth,
    isCycle,
    children: [],
  };

  if (isCycle) return item;

  const path = new Set(ancestorPath);
  path.add(nodeId);
  const outgoing = sortEdges(outEdges.get(nodeId) ?? []);

  if (node.type === "choice") {
    const options =
      (node.data?.options as Array<{ handle: string; text: string }> | undefined) ?? [];
    const used = new Set<string>();
    for (const opt of options) {
      const edge = outgoing.find((e) => e.sourceHandle === opt.handle);
      if (!edge) continue;
      used.add(edge.id);
      const child = buildSubtree(edge.target, depth + 1, path, byId, outEdges, opt.text);
      if (child) item.children.push(child);
    }
    for (const edge of outgoing) {
      if (used.has(edge.id)) continue;
      const child = buildSubtree(edge.target, depth + 1, path, byId, outEdges, edge.sourceHandle ?? "→");
      if (child) item.children.push(child);
    }
    return item;
  }

  if (node.type === "condition") {
    for (const [handle, hint] of [
      ["true", "да"],
      ["false", "нет"],
    ] as const) {
      const edge = outgoing.find((e) => e.sourceHandle === handle);
      if (edge) {
        const child = buildSubtree(edge.target, depth + 1, path, byId, outEdges, hint);
        if (child) item.children.push(child);
      }
    }
    return item;
  }

  if (node.type === "main_menu" || node.type === "loading") {
    for (const edge of outgoing) {
      const child = buildSubtree(edge.target, depth + 1, path, byId, outEdges);
      if (child) item.children.push(child);
    }
    return item;
  }

  if (node.type === "jump" || node.type === "end") {
    return item;
  }

  const linear =
    outgoing.find((e) => !e.sourceHandle || e.sourceHandle === "default" || e.sourceHandle === "flow") ??
    outgoing[0];
  if (linear) {
    const child = buildSubtree(linear.target, depth + 1, path, byId, outEdges);
    if (child) item.children.push(child);
  }

  return item;
}

function collectReachable(item: StructureTreeItem, set: Set<string>) {
  set.add(item.nodeId);
  item.children.forEach((child) => collectReachable(child, set));
}

export function buildGameStructureTree(nodes: GraphNode[], edges: GraphEdge[]): StructureTreeItem[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outEdges = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const list = outEdges.get(edge.source) ?? [];
    list.push(edge);
    outEdges.set(edge.source, list);
  }

  const roots: StructureTreeItem[] = [];
  const loading = nodes.find((n) => n.type === "loading");
  const start = nodes.find((n) => n.type === "start");

  if (loading) {
    const tree = buildSubtree(loading.id, 0, new Set(), byId, outEdges);
    if (tree) roots.push(tree);
  } else if (start) {
    const tree = buildSubtree(start.id, 0, new Set(), byId, outEdges);
    if (tree) roots.push(tree);
  }

  const reachable = new Set<string>();
  roots.forEach((root) => collectReachable(root, reachable));

  const orphans = nodes
    .filter((n) => !reachable.has(n.id))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((n) => ({
      key: `orphan:${n.id}`,
      nodeId: n.id,
      label: n.label,
      type: n.type,
      depth: 0,
      children: [],
    }));

  if (orphans.length > 0) {
    roots.push({
      key: "orphans",
      nodeId: "",
      label: "Не связано",
      type: "group",
      depth: 0,
      children: orphans,
    });
  }

  return roots;
}
