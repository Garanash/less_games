export type CheatAction = "unlock_all_gallery" | "unlock_gallery_item" | "set_flag";

export type CheatCode = {
  id: string;
  code: string;
  label: string;
  action: CheatAction;
  target_id?: string;
  flag_value?: string | number | boolean;
};

export type GalleryItem = {
  id: string;
  label: string;
  asset_id: string;
  thumbnail_asset_id?: string;
  unlock_by_default?: boolean;
};

export type GalleryConfig = {
  enabled: boolean;
  title: string;
  background_asset_id: string;
  items: GalleryItem[];
  cheats: CheatCode[];
  cheat_input_enabled: boolean;
};

export type SaveConfig = {
  enabled: boolean;
  slot_count: number;
};

export const DEFAULT_GALLERY: GalleryConfig = {
  enabled: true,
  title: "Галерея",
  background_asset_id: "",
  items: [],
  cheats: [
    {
      id: "unlock_all",
      code: "unlockall",
      label: "Открыть всю галерею",
      action: "unlock_all_gallery",
    },
  ],
  cheat_input_enabled: true,
};

export const DEFAULT_SAVE_CONFIG: SaveConfig = {
  enabled: true,
  slot_count: 6,
};

export function parseGalleryConfig(metadata: Record<string, unknown> | undefined): GalleryConfig {
  const raw = metadata?.gallery;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GALLERY, items: [], cheats: [...DEFAULT_GALLERY.cheats] };

  const data = raw as Record<string, unknown>;
  const items = Array.isArray(data.items)
    ? data.items.map((item, i) => normalizeGalleryItem(item as Partial<GalleryItem>, i))
    : [];

  const cheats = Array.isArray(data.cheats)
    ? data.cheats.map((c, i) => normalizeCheat(c as Partial<CheatCode>, i))
    : DEFAULT_GALLERY.cheats;

  return {
    enabled: data.enabled !== false,
    title: String(data.title ?? DEFAULT_GALLERY.title),
    background_asset_id: String(data.background_asset_id ?? ""),
    items,
    cheats,
    cheat_input_enabled: data.cheat_input_enabled !== false,
  };
}

export function parseSaveConfig(metadata: Record<string, unknown> | undefined): SaveConfig {
  const raw = metadata?.save_config;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SAVE_CONFIG };

  const data = raw as Record<string, unknown>;
  return {
    enabled: data.enabled !== false,
    slot_count: typeof data.slot_count === "number" ? Math.min(12, Math.max(1, data.slot_count)) : 6,
  };
}

function normalizeGalleryItem(item: Partial<GalleryItem>, index: number): GalleryItem {
  return {
    id: String(item.id ?? `cg_${index}`),
    label: String(item.label ?? `CG ${index + 1}`),
    asset_id: String(item.asset_id ?? ""),
    thumbnail_asset_id: item.thumbnail_asset_id ? String(item.thumbnail_asset_id) : undefined,
    unlock_by_default: Boolean(item.unlock_by_default),
  };
}

function normalizeCheat(cheat: Partial<CheatCode>, index: number): CheatCode {
  return {
    id: String(cheat.id ?? `cheat_${index}`),
    code: String(cheat.code ?? "").toLowerCase().trim(),
    label: String(cheat.label ?? `Чит ${index + 1}`),
    action: (cheat.action as CheatAction) ?? "unlock_all_gallery",
    target_id: cheat.target_id ? String(cheat.target_id) : undefined,
    flag_value: cheat.flag_value as CheatCode["flag_value"],
  };
}

export function defaultUnlockedGalleryIds(gallery: GalleryConfig): Set<string> {
  return new Set(gallery.items.filter((i) => i.unlock_by_default).map((i) => i.id));
}

export function applyCheatCode(
  code: string,
  gallery: GalleryConfig,
  unlockedIds: Set<string>,
  variables: Record<string, unknown>,
): { unlockedIds: Set<string>; variables: Record<string, unknown>; matched: boolean; message: string } {
  const normalized = code.toLowerCase().trim();
  const cheat = gallery.cheats.find((c) => c.code.toLowerCase() === normalized);
  if (!cheat) {
    return { unlockedIds, variables, matched: false, message: "Неверный код" };
  }

  const nextUnlocked = new Set(unlockedIds);
  const nextVars = { ...variables };

  if (cheat.action === "unlock_all_gallery") {
    gallery.items.forEach((item) => nextUnlocked.add(item.id));
    return { unlockedIds: nextUnlocked, variables: nextVars, matched: true, message: cheat.label };
  }

  if (cheat.action === "unlock_gallery_item" && cheat.target_id) {
    nextUnlocked.add(cheat.target_id);
    const item = gallery.items.find((i) => i.id === cheat.target_id);
    return {
      unlockedIds: nextUnlocked,
      variables: nextVars,
      matched: true,
      message: item ? `Открыто: ${item.label}` : cheat.label,
    };
  }

  if (cheat.action === "set_flag" && cheat.target_id) {
    nextVars[cheat.target_id] = cheat.flag_value ?? true;
    return { unlockedIds: nextUnlocked, variables: nextVars, matched: true, message: cheat.label };
  }

  return { unlockedIds, variables, matched: false, message: "Чит не настроен" };
}
