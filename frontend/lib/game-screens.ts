import type { ElementStyle, ProgressBarConfig } from "@/lib/screen-styles";
import {
  DEFAULT_PROGRESS_BAR,
  normalizeElementStyle,
  normalizeProgressBar,
} from "@/lib/screen-styles";

export type { ElementStyle, ProgressBarConfig };

export type ElementPosition = {
  x: number;
  y: number;
};

export type MainMenuItem = {
  id: string;
  label: string;
  action: "start" | "settings" | "load" | "save" | "gallery" | "quit";
  x: number;
  y: number;
  style?: ElementStyle;
};

export type SettingsItem = {
  id: string;
  label: string;
  type: "toggle" | "slider" | "button";
  key: string;
  defaultValue: boolean | number | string;
  x: number;
  y: number;
  style?: ElementStyle;
};

export type BackButtonConfig = {
  label: string;
  x: number;
  y: number;
  style?: ElementStyle;
};

export type LoadingScreenConfig = {
  id: string;
  name: string;
  background_asset_id: string;
  title: string;
  subtitle: string;
  tip_text: string;
  title_pos: ElementPosition;
  subtitle_pos: ElementPosition;
  tip_pos: ElementPosition;
  title_style?: ElementStyle;
  subtitle_style?: ElementStyle;
  tip_style?: ElementStyle;
  progress_bar?: ProgressBarConfig;
};

export type GameScreensConfig = {
  loading: {
    active_loader_id: string;
    loaders: LoadingScreenConfig[];
  };
  main_menu: {
    background_asset_id: string;
    music_asset_id: string;
    title: string;
    title_pos: ElementPosition;
    title_style?: ElementStyle;
    button_style?: ElementStyle;
    items: MainMenuItem[];
  };
  settings: {
    background_asset_id: string;
    title: string;
    title_pos: ElementPosition;
    title_style?: ElementStyle;
    control_style?: ElementStyle;
    back_button: BackButtonConfig;
    items: SettingsItem[];
  };
};

export type ScreenTab = "loading" | "main_menu" | "settings";

const CENTER_TOP: ElementPosition = { x: 50, y: 22 };

const DEFAULT_LOADER: LoadingScreenConfig = {
  id: "default",
  name: "Стандартный",
  background_asset_id: "",
  title: "",
  subtitle: "Загрузка...",
  tip_text: "Подсказка: используйте блок «Выбор» для ветвления сюжета.",
  title_pos: { x: 50, y: 38 },
  subtitle_pos: { x: 50, y: 52 },
  tip_pos: { x: 50, y: 88 },
  progress_bar: { ...DEFAULT_PROGRESS_BAR },
};

export const DEFAULT_GAME_SCREENS: GameScreensConfig = {
  loading: {
    active_loader_id: "default",
    loaders: [DEFAULT_LOADER],
  },
  main_menu: {
    background_asset_id: "",
    music_asset_id: "",
    title: "Моя игра",
    title_pos: CENTER_TOP,
    items: [
      { id: "start", label: "Начать игру", action: "start", x: 50, y: 42 },
      { id: "load", label: "Загрузить", action: "load", x: 50, y: 54 },
      { id: "settings", label: "Настройки", action: "settings", x: 50, y: 66 },
      { id: "quit", label: "Выход", action: "quit", x: 50, y: 78 },
    ],
  },
  settings: {
    background_asset_id: "",
    title: "Настройки",
    title_pos: CENTER_TOP,
    back_button: { label: "Назад", x: 50, y: 92 },
    items: [
      { id: "music", label: "Музыка", type: "toggle", key: "music_volume", defaultValue: true, x: 50, y: 40 },
      { id: "sound", label: "Звуки", type: "toggle", key: "sound_volume", defaultValue: true, x: 50, y: 52 },
      { id: "text_speed", label: "Скорость текста", type: "slider", key: "text_speed", defaultValue: 50, x: 50, y: 64 },
      { id: "fullscreen", label: "Полный экран", type: "toggle", key: "fullscreen", defaultValue: false, x: 50, y: 76 },
    ],
  },
};

function pos(value: Partial<ElementPosition> | undefined, fallback: ElementPosition): ElementPosition {
  return {
    x: typeof value?.x === "number" ? value.x : fallback.x,
    y: typeof value?.y === "number" ? value.y : fallback.y,
  };
}

function normalizeMenuItem(item: Partial<MainMenuItem>, index: number): MainMenuItem {
  return {
    id: String(item.id ?? `item_${index}`),
    label: String(item.label ?? "Пункт"),
    action: (item.action as MainMenuItem["action"]) ?? "start",
    x: typeof item.x === "number" ? item.x : 50,
    y: typeof item.y === "number" ? item.y : 42 + index * 12,
  };
}

function normalizeSettingsItem(item: Partial<SettingsItem>, index: number): SettingsItem {
  return {
    id: String(item.id ?? `setting_${index}`),
    label: String(item.label ?? "Настройка"),
    type: (item.type as SettingsItem["type"]) ?? "toggle",
    key: String(item.key ?? `key_${index}`),
    defaultValue: item.defaultValue ?? true,
    x: typeof item.x === "number" ? item.x : 50,
    y: typeof item.y === "number" ? item.y : 40 + index * 12,
  };
}

function normalizeLoader(item: Partial<LoadingScreenConfig>, index: number): LoadingScreenConfig {
  return {
    id: String(item.id ?? `loader_${index}`),
    name: String(item.name ?? `Лоадер ${index + 1}`),
    background_asset_id: String(item.background_asset_id ?? ""),
    title: String(item.title ?? ""),
    subtitle: String(item.subtitle ?? "Загрузка..."),
    tip_text: String(item.tip_text ?? ""),
    title_pos: pos(item.title_pos, DEFAULT_LOADER.title_pos),
    subtitle_pos: pos(item.subtitle_pos, DEFAULT_LOADER.subtitle_pos),
    tip_pos: pos(item.tip_pos, DEFAULT_LOADER.tip_pos),
    title_style: normalizeElementStyle(item.title_style, "title"),
    subtitle_style: normalizeElementStyle(item.subtitle_style, "subtitle"),
    tip_style: normalizeElementStyle(item.tip_style, "text"),
    progress_bar: normalizeProgressBar(item.progress_bar),
  };
}

function normalizeBackButton(item: Partial<BackButtonConfig> | undefined): BackButtonConfig {
  return {
    label: String(item?.label ?? "Назад"),
    x: typeof item?.x === "number" ? item.x : 50,
    y: typeof item?.y === "number" ? item.y : 92,
    style: normalizeElementStyle(item?.style, "button"),
  };
}

export function getActiveLoader(config: GameScreensConfig): LoadingScreenConfig {
  return (
    config.loading.loaders.find((l) => l.id === config.loading.active_loader_id) ??
    config.loading.loaders[0] ??
    DEFAULT_LOADER
  );
}

export function parseGameScreens(metadata: Record<string, unknown> | undefined): GameScreensConfig {
  const raw = metadata?.game_screens;
  if (!raw || typeof raw !== "object") return DEFAULT_GAME_SCREENS;

  const data = raw as Record<string, unknown>;
  const loadingRaw = (data.loading ?? {}) as Record<string, unknown>;

  let loaders: LoadingScreenConfig[];
  if (Array.isArray(loadingRaw.loaders)) {
    loaders = loadingRaw.loaders.map(normalizeLoader);
  } else {
    loaders = [
      normalizeLoader(
        {
          id: "default",
          name: "Стандартный",
          background_asset_id: String(loadingRaw.background_asset_id ?? ""),
          title: String(loadingRaw.title ?? ""),
          subtitle: String(loadingRaw.subtitle ?? ""),
          tip_text: String(loadingRaw.tip_text ?? ""),
          title_pos: loadingRaw.title_pos as ElementPosition,
          subtitle_pos: loadingRaw.subtitle_pos as ElementPosition,
          tip_pos: loadingRaw.tip_pos as ElementPosition,
        },
        0,
      ),
    ];
  }

  const mainMenu = { ...DEFAULT_GAME_SCREENS.main_menu, ...((data.main_menu as object) ?? {}) };
  const settings = { ...DEFAULT_GAME_SCREENS.settings, ...((data.settings as object) ?? {}) };

  return {
    loading: {
      active_loader_id: String(loadingRaw.active_loader_id ?? loaders[0]?.id ?? "default"),
      loaders,
    },
    main_menu: {
      ...mainMenu,
      title_pos: pos(mainMenu.title_pos, DEFAULT_GAME_SCREENS.main_menu.title_pos),
      title_style: normalizeElementStyle(mainMenu.title_style, "title"),
      button_style: normalizeElementStyle(mainMenu.button_style, "button"),
      items: Array.isArray(mainMenu.items)
        ? mainMenu.items.map((item, i) => ({
            ...normalizeMenuItem(item, i),
            style: item.style ? normalizeElementStyle(item.style, "button") : undefined,
          }))
        : DEFAULT_GAME_SCREENS.main_menu.items,
    },
    settings: {
      ...settings,
      title_pos: pos(settings.title_pos, DEFAULT_GAME_SCREENS.settings.title_pos),
      title_style: normalizeElementStyle(settings.title_style, "title"),
      control_style: normalizeElementStyle(settings.control_style, "control"),
      back_button: normalizeBackButton(settings.back_button as Partial<BackButtonConfig>),
      items: Array.isArray(settings.items)
        ? settings.items.map((item, i) => ({
            ...normalizeSettingsItem(item, i),
            style: item.style ? normalizeElementStyle(item.style, "control") : undefined,
          }))
        : DEFAULT_GAME_SCREENS.settings.items,
    },
  };
}

export function nextMenuItemPosition(items: MainMenuItem[]): ElementPosition {
  const last = items[items.length - 1];
  return { x: 50, y: last ? Math.min(last.y + 12, 90) : 42 };
}

export function nextSettingsItemPosition(items: SettingsItem[]): ElementPosition {
  const last = items[items.length - 1];
  return { x: 50, y: last ? Math.min(last.y + 12, 90) : 40 };
}
