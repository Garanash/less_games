import type { Asset, GraphNode, PreviewState } from "@/lib/api";

export function mergePreviewState(
  apiState: PreviewState | null | undefined,
  selectedNode: GraphNode | null,
  assets: Asset[],
): PreviewState | null {
  if (!selectedNode && !apiState) return null;

  const base: PreviewState = apiState ?? {
    characters: [],
    variables: {},
  };

  if (!selectedNode) return base;

  const data = selectedNode.data ?? {};
  const assetById = (id: string) => assets.find((a) => a.id === id);

  if (selectedNode.type === "start") {
    const bgId = String(data.background_asset_id ?? "");
    const bgAsset = assetById(bgId);
    if (bgAsset) {
      base.background = { asset_id: bgId, url: bgAsset.url, transition: "dissolve" };
    }
    const musicId = String(data.music_asset_id ?? "");
    const musicAsset = assetById(musicId);
    if (musicAsset) {
      base.music = { asset_id: musicId, url: musicAsset.url, fade: 0, loop: true };
    }
    const introText = String(data.intro_text ?? "");
    if (introText || data.title) {
      base.dialogue = {
        character: String(data.intro_character ?? "narrator"),
        text: introText || String(data.title ?? ""),
      };
    }
    if (data.title && !introText) {
      base.effect = { type: "title", params: { title: data.title } };
    }
  }

  if (selectedNode.type === "scene") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assetId);
    if (asset) {
      base.background = {
        asset_id: assetId,
        url: asset.url,
        transition: String(data.transition ?? "dissolve"),
      };
    }
  }

  if (selectedNode.type === "dialogue") {
    base.dialogue = {
      character: String(data.character ?? "narrator"),
      text: String(data.text ?? ""),
    };
  }

  if (selectedNode.type === "show_character") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assetId);
    if (asset) {
      const charId = String(data.character_id ?? "character");
      const existing = base.characters.filter((c) => c.character_id !== charId);
      base.characters = [
        ...existing,
        {
          character_id: charId,
          asset_id: assetId,
          url: asset.url,
          position: String(data.position ?? "center"),
        },
      ];
    }
  }

  if (selectedNode.type === "music") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assetId);
    if (asset) {
      base.music = {
        asset_id: assetId,
        url: asset.url,
        fade: Number(data.fade ?? 0),
        loop: Boolean(data.loop ?? true),
      };
    }
  }

  if (selectedNode.type === "sound") {
    const assetId = String(data.asset_id ?? "");
    const asset = assetById(assetId);
    if (asset) {
      base.sound = { asset_id: assetId, url: asset.url };
    }
  }

  if (selectedNode.type === "effect") {
    base.effect = {
      type: String(data.effect_type ?? "dissolve"),
      params: (data.params as Record<string, unknown>) ?? {},
    };
  }

  return base;
}

export function getBlockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    loading: "Загрузка",
    main_menu: "Главное меню",
    settings: "Настройки",
    start: "Старт",
    scene: "Сцена",
    dialogue: "Диалог",
    choice: "Выбор",
    show_character: "Показать персонажа",
    hide_character: "Скрыть персонажа",
    music: "Музыка",
    sound: "Звук",
    effect: "Эффект",
    set_variable: "Переменная",
    condition: "Условие",
    jump: "Переход",
    label: "Метка",
    unlock_cg: "Открыть CG",
    end: "Конец",
  };
  return labels[type] ?? type;
}
