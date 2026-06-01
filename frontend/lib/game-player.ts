import type { Asset, GraphEdge, GraphNode, PreviewState, ProjectCharacter } from "@/lib/api";
import { resolveCharacterSpriteAsset } from "@/lib/character-utils";
import { applyCheatCode, defaultUnlockedGalleryIds, type GalleryConfig, type SaveConfig } from "@/lib/gallery";
import type { SaveSlotData } from "@/lib/game-save";
import type { GameScreensConfig, MainMenuItem } from "@/lib/game-screens";

export type ChoiceOption = {
  handle: string;
  text: string;
  targetId: string;
  highlight?: boolean;
};

export type GameSession = {
  currentNodeId: string | null;
  state: PreviewState;
  variables: Record<string, unknown>;
  wait: "click" | "choice" | "menu" | "settings" | "gallery" | "save" | "load" | "ended" | null;
  choices: ChoiceOption[];
  visibleCharacters: Map<string, PreviewState["characters"][number]>;
  settingsOverlayFromMenu: boolean;
  galleryFromMenu: boolean;
  unlockedGalleryIds: Set<string>;
  saveMode: "save" | "load";
};

export type PlayContext = {
  gameScreens: GameScreensConfig;
  characters: ProjectCharacter[];
  projectTitle: string;
  gallery: GalleryConfig;
  saveConfig: SaveConfig;
  projectId: string;
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

function findMainMenuNode(nodes: GraphNode[]): GraphNode | null {
  return nodes.find((n) => n.type === "main_menu") ?? null;
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

function charById(characters: ProjectCharacter[], id: string): ProjectCharacter | undefined {
  return characters.find((c) => c.id === id);
}

function applyNodeEffects(
  node: GraphNode,
  session: GameSession,
  assets: Asset[],
  context: PlayContext,
): GameSession {
  const data = node.data ?? {};
  const next: GameSession = {
    ...session,
    state: {
      ...session.state,
      characters: [...session.state.characters],
      uiScreen: undefined,
    },
    variables: { ...session.variables },
    visibleCharacters: new Map(session.visibleCharacters),
    settingsOverlayFromMenu: false,
    galleryFromMenu: session.galleryFromMenu,
    unlockedGalleryIds: new Set(session.unlockedGalleryIds),
    saveMode: session.saveMode,
  };

  if (node.type === "loading") {
    next.state.uiScreen = "loading";
    next.state.dialogue = null;
    next.state.background = undefined;
  }

  if (node.type === "main_menu") {
    next.state.uiScreen = "main_menu";
    next.state.dialogue = null;
    const musicId = context.gameScreens.main_menu.music_asset_id;
    const musicAsset = musicId ? assetById(assets, musicId) : undefined;
    if (musicAsset) {
      next.state.music = { asset_id: musicId, url: musicAsset.url, fade: 0, loop: true };
    }
  }

  if (node.type === "settings") {
    next.state.uiScreen = "settings";
    next.state.dialogue = null;
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
    const charId = String(data.character_id ?? "character");
    const charMeta = charById(context.characters, charId);
    const assetId = resolveCharacterSpriteAsset(charMeta, {
      emotion_id: String(data.emotion_id ?? ""),
      asset_id: String(data.asset_id ?? ""),
    });
    const asset = assetId ? assetById(assets, assetId) : undefined;
    if (asset) {
      next.visibleCharacters.set(charId, {
        character_id: charId,
        asset_id: assetId!,
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
    const charId = String(data.character ?? "narrator");
    const charMeta = charById(context.characters, charId);
    const emotionId = String(data.emotion_id ?? "");
    if (charId !== "narrator" && emotionId) {
      const resolvedAssetId = resolveCharacterSpriteAsset(charMeta, { emotion_id: emotionId });
      const asset = resolvedAssetId ? assetById(assets, resolvedAssetId) : undefined;
      if (asset) {
        const existing = next.visibleCharacters.get(charId);
        next.visibleCharacters.set(charId, {
          character_id: charId,
          asset_id: resolvedAssetId!,
          url: asset.url,
          position: existing?.position ?? "center",
        });
        next.state.characters = Array.from(next.visibleCharacters.values());
      }
    }
    const effectType = String(data.effect_type ?? "");
    if (effectType) {
      next.state.effect = {
        type: effectType,
        params: (data.effect_params as Record<string, unknown>) ?? {},
      };
    }
    next.state.dialogue = {
      character: charId,
      text: String(data.text ?? ""),
      emotion_id: emotionId || undefined,
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

  if (node.type === "unlock_cg") {
    const itemId = String(data.item_id ?? "");
    if (itemId) {
      next.unlockedGalleryIds = new Set(session.unlockedGalleryIds);
      next.unlockedGalleryIds.add(itemId);
    }
    next.state.dialogue = null;
  }

  if (node.type === "end") {
    next.state.dialogue = null;
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

  if (node.type === "settings") {
    return outgoing[0]?.targetId ?? null;
  }

  return outgoing[0]?.targetId ?? null;
}

export function createGameSession(
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
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
    settingsOverlayFromMenu: false,
    galleryFromMenu: false,
    unlockedGalleryIds: defaultUnlockedGalleryIds(context.gallery),
    saveMode: "load",
  };

  return stepToInteraction(session, nodes, edges, assets, context);
}

function buildChoiceOptions(node: GraphNode, adj: Map<string, AdjEntry[]>): ChoiceOption[] {
  const options =
    (node.data?.options as Array<{ handle: string; text: string; highlight?: boolean }>) ?? [];
  const outgoing = getOutgoing(adj, node.id);

  return options
    .map((opt, index) => {
      const handle = opt.handle || `option_${index}`;
      const edge = outgoing.find((e) => e.handle === handle) ?? outgoing[index];
      return {
        handle,
        text: opt.text || `Вариант ${index + 1}`,
        targetId: edge?.targetId ?? "",
        highlight: Boolean(opt.highlight),
      };
    })
    .filter((opt) => opt.targetId);
}

export function stepToInteraction(
  session: GameSession,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
): GameSession {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const adj = buildAdjacency(edges);

  let current = session;
  let nodeId: string | null = session.currentNodeId;

  while (nodeId) {
    const node = nodesById.get(nodeId);
    if (!node) break;

    current = applyNodeEffects(node, { ...current, currentNodeId: nodeId }, assets, context);

    if (node.type === "end") {
      const menuNode = findMainMenuNode(nodes);
      if (menuNode) {
        return stepToInteraction(
          {
            ...current,
            currentNodeId: menuNode.id,
            wait: null,
            choices: [],
            variables: {},
            visibleCharacters: new Map(),
            galleryFromMenu: false,
            state: {
              ...current.state,
              characters: [],
              dialogue: null,
              background: undefined,
              music: undefined,
              sound: undefined,
              effect: undefined,
              variables: {},
            },
          },
          nodes,
          edges,
          assets,
          context,
        );
      }
      return { ...current, wait: "ended", choices: [] };
    }

    if (node.type === "loading") {
      return { ...current, wait: "click", choices: [] };
    }

    if (node.type === "main_menu") {
      return { ...current, wait: "menu", choices: [] };
    }

    if (node.type === "settings") {
      return { ...current, wait: "settings", choices: [], settingsOverlayFromMenu: false };
    }

    if (node.type === "dialogue" || (node.type === "start" && current.state.dialogue?.text)) {
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
  context: PlayContext,
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
    context,
  );
}

export function selectGameChoice(
  session: GameSession,
  handle: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
): GameSession {
  if (session.wait !== "choice") return session;

  const choice = session.choices.find((c) => c.handle === handle);
  if (!choice?.targetId) return session;

  return stepToInteraction(
    { ...session, currentNodeId: choice.targetId, wait: null, choices: [] },
    nodes,
    edges,
    assets,
    context,
  );
}

export function handleMenuAction(
  session: GameSession,
  action: MainMenuItem["action"],
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
): GameSession {
  if (session.wait !== "menu" || !session.currentNodeId) return session;

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const node = nodesById.get(session.currentNodeId);
  if (!node || node.type !== "main_menu") return session;

  if (action === "start") {
    const adj = buildAdjacency(edges);
    const nextId = resolveNextNodeId(node, adj, nodes, session.variables);
    return stepToInteraction(
      { ...session, currentNodeId: nextId, wait: null, choices: [] },
      nodes,
      edges,
      assets,
      context,
    );
  }

  if (action === "settings") {
    return {
      ...session,
      wait: "settings",
      settingsOverlayFromMenu: true,
      state: { ...session.state, uiScreen: "settings", dialogue: null },
    };
  }

  if (action === "load") {
    if (!context.saveConfig.enabled) {
      return {
        ...session,
        state: {
          ...session.state,
          uiScreen: undefined,
          dialogue: { character: "narrator", text: "Сохранения отключены" },
        },
        wait: "click",
      };
    }
    return {
      ...session,
      wait: "load",
      saveMode: "load",
      galleryFromMenu: true,
      state: { ...session.state, uiScreen: "load", dialogue: null },
    };
  }

  if (action === "save") {
    if (!context.saveConfig.enabled) {
      return {
        ...session,
        state: {
          ...session.state,
          uiScreen: undefined,
          dialogue: { character: "narrator", text: "Сохранения отключены" },
        },
        wait: "click",
      };
    }
    return {
      ...session,
      wait: "save",
      saveMode: "save",
      galleryFromMenu: true,
      state: { ...session.state, uiScreen: "save", dialogue: null },
    };
  }

  if (action === "gallery") {
    if (!context.gallery.enabled) {
      return {
        ...session,
        state: {
          ...session.state,
          uiScreen: undefined,
          dialogue: { character: "narrator", text: "Галерея отключена" },
        },
        wait: "click",
      };
    }
    return {
      ...session,
      wait: "gallery",
      galleryFromMenu: true,
      state: { ...session.state, uiScreen: "gallery", dialogue: null },
    };
  }

  if (action === "quit") {
    return {
      ...session,
      wait: "ended",
      state: {
        ...session.state,
        uiScreen: undefined,
        dialogue: { character: "narrator", text: "Выход из игры" },
      },
    };
  }

  return session;
}

export function handleSettingsBack(
  session: GameSession,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
): GameSession {
  if (session.wait !== "settings" || !session.currentNodeId) return session;

  if (session.settingsOverlayFromMenu) {
    return {
      ...session,
      wait: "menu",
      settingsOverlayFromMenu: false,
      state: { ...session.state, uiScreen: "main_menu", dialogue: null },
    };
  }

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
    context,
  );
}

export function handleGalleryBack(session: GameSession): GameSession {
  if (session.wait !== "gallery") return session;
  if (session.galleryFromMenu) {
    return {
      ...session,
      wait: "menu",
      galleryFromMenu: false,
      state: { ...session.state, uiScreen: "main_menu", dialogue: null },
    };
  }
  return {
    ...session,
    wait: "click",
    state: { ...session.state, uiScreen: undefined, dialogue: null },
  };
}

export function handleSaveScreenBack(session: GameSession): GameSession {
  if (session.wait !== "save" && session.wait !== "load") return session;
  if (session.galleryFromMenu) {
    return {
      ...session,
      wait: "menu",
      galleryFromMenu: false,
      state: { ...session.state, uiScreen: "main_menu", dialogue: null },
    };
  }
  return {
    ...session,
    wait: "click",
    state: { ...session.state, uiScreen: undefined, dialogue: null },
  };
}

export function applyCheatToSession(session: GameSession, code: string, context: PlayContext): GameSession {
  const result = applyCheatCode(code, context.gallery, session.unlockedGalleryIds, session.variables);
  if (!result.matched) return session;
  return {
    ...session,
    unlockedGalleryIds: result.unlockedIds,
    variables: result.variables,
    state: {
      ...session.state,
      variables: result.variables,
      dialogue: { character: "narrator", text: result.message },
    },
    wait: session.wait === "menu" || session.wait === "gallery" ? session.wait : "click",
  };
}

export function sessionToSaveData(session: GameSession, label: string): SaveSlotData | null {
  if (!session.currentNodeId) return null;
  return {
    currentNodeId: session.currentNodeId,
    variables: { ...session.variables },
    unlockedGalleryIds: Array.from(session.unlockedGalleryIds),
    savedAt: new Date().toISOString(),
    label,
  };
}

export function restoreSessionFromSave(
  data: SaveSlotData,
  nodes: GraphNode[],
  edges: GraphEdge[],
  assets: Asset[],
  context: PlayContext,
): GameSession | null {
  const session: GameSession = {
    currentNodeId: data.currentNodeId,
    state: { characters: [], variables: data.variables },
    variables: { ...data.variables },
    wait: null,
    choices: [],
    visibleCharacters: new Map(),
    settingsOverlayFromMenu: false,
    galleryFromMenu: false,
    unlockedGalleryIds: new Set(data.unlockedGalleryIds),
    saveMode: "load",
  };
  return stepToInteraction(session, nodes, edges, assets, context);
}

export function openInGameSave(session: GameSession): GameSession {
  return {
    ...session,
    wait: "save",
    saveMode: "save",
    galleryFromMenu: false,
    state: { ...session.state, uiScreen: "save", dialogue: null },
  };
}

export function openInGameLoad(session: GameSession): GameSession {
  return {
    ...session,
    wait: "load",
    saveMode: "load",
    galleryFromMenu: false,
    state: { ...session.state, uiScreen: "load", dialogue: null },
  };
}
