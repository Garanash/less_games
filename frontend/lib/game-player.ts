import type { Asset, GraphEdge, GraphNode, PreviewState } from "@/lib/api";

export type ChoiceOption = {
  handle: string;
  text: string;
  targetId: string;
};

export type GameSession = {
  currentNodeId: string | null;
  state: PreviewState;
  variables: Record<string, unknown>;
  wait: "click" | "choice" | "ended" | null;
  choices: ChoiceOption[];
  visibleCharacters: Map<string, PreviewState["characters"][number]>;
};

type AdjEntry = { targetId: string; handle: string | null };

function buildAdjacency(edges: GraphEdge[]): Map<string, AdjEntry[]> {
  const adj = new Map<string, AdjEntry[]>();
  for (const edge of edges) {
    const list = adj.get(edge.source) ?? [];
    list.push({ targetId: edge.target, handle: edge.sourceHandle ?? null });
    adj.set(edge.source, list);
  }
  return adj;
}

function assetById(assets: Asset[], id: string): Asset | undefined {
  return assets.find((a) => a.id === id);
}

function findStartNode(nodes: GraphNode[]): GraphNode | null {
  return nodes.find((n) => n.type === "start") ?? null;
}

function findEntryNode(nodes: GraphNode[]): GraphNode | null {
  return nodes.find((n) => n.type === "loading") ?? findStartNode(nodes);
}

function findNodeByLabel(nodes: GraphNode[], label: string): GraphNode | null {
  return (
    nodes.find((n) => n.label === label) ??
    nodes.find((n) => n.type === "label" && String(n.data?.name ?? n.label) === label) ??
    null
  );
}

function evaluateCondition(expression: string, variables: Record<string, unknown>): boolean {
  try {
    const keys = Object.keys(variables);
    const values = keys.map((key) => variables[key]);
    const fn = new Function(...keys, `return Boolean(${expression})`);
    return Boolean(fn(...values));
  } catch {
    return false;
  }
}

function applyNodeEffects(
  node: GraphNode,
  session: GameSession,
  assets: Asset[],
): GameSession {
  const data = node.data ?? {};
  const next: GameSession = {
    ...session,
    state: {
      ...session.state,
      characters: [...session.state.characters],
    },
    variables: { ...session.variables },
    visibleCharacters: new Map(session.visibleCharacters),
  };

  if (node.type === "loading") {
    next.state.dialogue = {
      character: "narrator",
      text: "Загрузка…",
    };
    next.state.effect = { type: "loading_screen", params: {} };
  }

  if (node.type === "main_menu") {
    next.state.dialogue = {
      character: "narrator",
      text: "Главное меню",
    };
    next.state.effect = { type: "main_menu", params: {} };
  }

  if (node.type === "settings") {
    next.state.dialogue = {
      character: "narrator",
      text: "Настройки",
    };
    next.state.effect = { type: "settings", params: {} };
  }

  if (node.type === "start") {
    const bgId = String(data.background_asset_id ?? "");
    const bgAsset = assetById(assets, bgId);
    if (bgAsset) {
      next.state.background = { asset_id: bgId, url: bgAsset.url, transition: "dissolve" };
    }
    const musicId = String(data.music_asset_id ?? "");
    const musicAsset = assetById(assets, musicId);
    if (musicAsset) {
      next.state.music = { asset_id: musicId, url: musicAsset.url, fade: 0, loop: true };
    }
    const introText = String(data.intro_text ?? "");
    const title = String(data.title ?? "");
    if (introText || title) {
      next.state.dialogue = {
        character: String(data.intro_character ?? "narrator"),
        text: introText || title,
      };
    } else {
      next.state.dialogue = null;
    }
    if (title && !introText) {
      next.state.effect = { type: "title", params: { title } };
    }
  }

  if (node.type === "scene") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assets, assetId);
    if (asset) {
      next.state.background = {
        asset_id: assetId,
        url: asset.url,
        transition: String(data.transition ?? "dissolve"),
      };
    }
    next.state.dialogue = null;
  }

  if (node.type === "show_character") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assets, assetId);
    const charId = String(data.character_id ?? "character");
    if (asset) {
      next.visibleCharacters.set(charId, {
        character_id: charId,
        asset_id: assetId,
        url: asset.url,
        position: String(data.position ?? "center"),
      });
    }
    next.state.characters = Array.from(next.visibleCharacters.values());
    next.state.dialogue = null;
  }

  if (node.type === "hide_character") {
    const charId = String(data.character_id ?? "character");
    next.visibleCharacters.delete(charId);
    next.state.characters = Array.from(next.visibleCharacters.values());
    next.state.dialogue = null;
  }

  if (node.type === "dialogue") {
    next.state.dialogue = {
      character: String(data.character ?? "narrator"),
      text: String(data.text ?? ""),
    };
  }

  if (node.type === "music") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assets, assetId);
    if (asset) {
      next.state.music = {
        asset_id: assetId,
        url: asset.url,
        fade: Number(data.fade ?? 0),
        loop: Boolean(data.loop ?? true),
      };
    }
    next.state.dialogue = null;
  }

  if (node.type === "sound") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assets, assetId);
    if (asset) {
      next.state.sound = { asset_id: assetId, url: asset.url };
    }
    next.state.dialogue = null;
  }

  if (node.type === "effect") {
    next.state.effect = {
      type: String(data.effect_type ?? "dissolve"),
      params: (data.params as Record<string, unknown>) ?? {},
    };
    next.state.dialogue = null;
  }

  if (node.type === "set_variable") {
    const name = String(data.name ?? "");
    if (name) {
      next.variables[name] = data.value;
      next.state.variables = { ...next.variables };
    }
    next.state.dialogue = null;
  }

  if (node.type === "end") {
    next.state.dialogue = { character: "narrator", text: "Конец игры" };
    next.wait = "ended";
  }

  return next;
}

function getOutgoing(adj: Map<string, AdjEntry[]>, nodeId: string): AdjEntry[] {
  return adj.get(nodeId) ?? [];
}

function resolveNextNodeId(
  node: GraphNode,
  adj: Map<string, AdjEntry[]>,
  nodes: GraphNode[],
  variables: Record<string, unknown>,
  choiceHandle?: string,
): string | null {
  const outgoing = getOutgoing(adj, node.id);

  if (node.type === "choice") {
    const handle = choiceHandle ?? outgoing[0]?.handle;
    const match = outgoing.find((e) => e.handle === handle);
    return match?.targetId ?? null;
  }

  if (node.type === "condition") {
    const result = evaluateCondition(String(node.data?.expression ?? "True"), variables);
    const handle = result ? "true" : "false";
    const match = outgoing.find((e) => e.handle === handle) ?? outgoing[0];
    return match?.targetId ?? null;
  }

  if (node.type === "jump") {
    const targetLabel = String(node.data?.target_label ?? "");
    const target = findNodeByLabel(nodes, targetLabel);
    return target?.id ?? null;
  }

  if (node.type === "main_menu") {
    const startEdge = outgoing.find((e) => {
      const target = nodes.find((n) => n.id === e.targetId);
      return target?.type === "start";
    });
    return startEdge?.targetId ?? outgoing.find((e) => e.handle === "flow")?.targetId ?? null;
  }

  return outgoing[0]?.targetId ?? null;
}

export function createGameSession(
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
): GameSession | null {
  const start = findEntryNode(nodes);
  if (!start) return null;

  const session: GameSession = {
    currentNodeId: start.id,
    state: { characters: [], variables: {} },
    variables: {},
    wait: null,
    choices: [],
    visibleCharacters: new Map(),
  };

  return stepToInteraction(session, nodes, edges, assets);
}

function buildChoiceOptions(
  node: GraphNode,
  adj: Map<string, AdjEntry[]>,
): ChoiceOption[] {
  const options = (node.data?.options as Array<{ handle: string; text: string }>) ?? [];
  const outgoing = getOutgoing(adj, node.id);

  return options.map((opt, index) => {
    const handle = opt.handle || `option_${index}`;
    const edge = outgoing.find((e) => e.handle === handle) ?? outgoing[index];
    return {
      handle,
      text: opt.text || `Вариант ${index + 1}`,
      targetId: edge?.targetId ?? "",
    };
  }).filter((opt) => opt.targetId);
}

export function stepToInteraction(
  session: GameSession,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
): GameSession {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(edges);

  let current = session;
  let nodeId: string | null = session.currentNodeId;

  while (nodeId) {
    const node = nodesById.get(nodeId);
    if (!node) break;

    current = applyNodeEffects(node, { ...current, currentNodeId: nodeId }, assets);

    if (node.type === "end") {
      return { ...current, wait: "ended", choices: [] };
    }

    if (
      node.type === "dialogue" ||
      node.type === "loading" ||
      node.type === "main_menu" ||
      node.type === "settings" ||
      (node.type === "start" && current.state.dialogue?.text)
    ) {
      return { ...current, wait: "click", choices: [] };
    }

    if (node.type === "choice") {
      const choices = buildChoiceOptions(node, adj);
      if (choices.length === 0) {
        nodeId = resolveNextNodeId(node, adj, nodes, current.variables);
        continue;
      }
      return { ...current, wait: "choice", choices };
    }

    nodeId = resolveNextNodeId(node, adj, nodes, current.variables);
    current = { ...current, currentNodeId: nodeId };
  }

  return {
    ...current,
    wait: "ended",
    choices: [],
    state: {
      ...current.state,
      dialogue: { character: "narrator", text: "Конец игры" },
    },
  };
}

export function advanceGame(
  session: GameSession,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
): GameSession {
  if (session.wait !== "click" || !session.currentNodeId) return session;

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(edges);
  const node = nodesById.get(session.currentNodeId);
  if (!node) return session;

  const nextId = resolveNextNodeId(node, adj, nodes, session.variables);
  return stepToInteraction(
    { ...session, currentNodeId: nextId, wait: null, choices: [] },
    nodes,
    edges,
    assets,
  );
}

export function selectGameChoice(
  session: GameSession,
  handle: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
): GameSession {
  if (session.wait !== "choice") return session;

  const choice = session.choices.find((c) => c.handle === handle);
  if (!choice?.targetId) return session;

  return stepToInteraction(
    { ...session, currentNodeId: choice.targetId, wait: null, choices: [] },
    nodes,
    edges,
    assets,
  );
}
