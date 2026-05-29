"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import type { Asset } from "@/lib/api";
import {
  getActiveLoader,
  nextMenuItemPosition,
  nextSettingsItemPosition,
  type ElementPosition,
  type GameScreensConfig,
  type LoadingScreenConfig,
  type MainMenuItem,
  type ScreenTab,
  type SettingsItem,
} from "@/lib/game-screens";
import { ScreenCanvasEditor, type CanvasElement } from "@/components/editor/ScreenCanvasEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type GameScreensPanelProps = {
  config: GameScreensConfig;
  assets: Asset[];
  onChange: (config: GameScreensConfig) => void;
  initialTab?: ScreenTab;
};

const SCREEN_TABS: { id: ScreenTab; label: string }[] = [
  { id: "loading", label: "Загрузка" },
  { id: "main_menu", label: "Меню" },
  { id: "settings", label: "Настройки" },
];

const ACTION_LABELS: Record<MainMenuItem["action"], string> = {
  start: "Начать игру",
  load: "Загрузить",
  settings: "Настройки",
  quit: "Выход",
};

const TYPE_LABELS: Record<SettingsItem["type"], string> = {
  toggle: "Переключатель",
  slider: "Ползунок",
  button: "Кнопка",
};

function AssetSelect({
  label,
  value,
  assets,
  onChange,
}: {
  label: string;
  value: string;
  assets: Asset[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="bg-[var(--editor-surface-alt)]">
        <option value="">— не выбрано —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id} className="bg-[var(--editor-surface)] text-[var(--editor-text)]">
            {a.filename}
          </option>
        ))}
      </Select>
    </div>
  );
}

function BlockCard({
  title,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  title: string;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-[var(--editor-surface-alt)]/80 p-3 transition-colors",
        selected ? "border-indigo-500 bg-indigo-500/10" : "border-[var(--editor-border)] hover:border-[var(--editor-border)]",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="text-left text-xs font-semibold text-[var(--editor-text)] hover:text-[var(--editor-text)]"
        >
          {title}
        </button>
        {onDelete && (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0">
            <Trash2 size={13} />
          </Button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PositionFields({
  pos,
  onChange,
}: {
  pos: ElementPosition;
  onChange: (pos: ElementPosition) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[10px] text-[var(--editor-muted)]">X %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={Math.round(pos.x)}
          onChange={(e) => onChange({ ...pos, x: Number(e.target.value) })}
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-[10px] text-[var(--editor-muted)]">Y %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={Math.round(pos.y)}
          onChange={(e) => onChange({ ...pos, y: Number(e.target.value) })}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function GameScreensPanel({ config, assets, onChange, initialTab }: GameScreensPanelProps) {
  const [activeScreen, setActiveScreen] = useState<ScreenTab>(initialTab ?? "loading");
  const [selectedId, setSelectedId] = useState<string>("loading-title");

  useEffect(() => {
    if (initialTab) {
      setActiveScreen(initialTab);
    }
  }, [initialTab]);

  const backgrounds = assets.filter((a) => a.kind === "background");
  const music = assets.filter((a) => a.kind === "music");

  const bgUrl = (id: string) => assets.find((a) => a.id === id)?.url;
  const activeLoader = useMemo(() => getActiveLoader(config), [config]);

  const updateLoading = (patch: Partial<GameScreensConfig["loading"]>) => {
    onChange({ ...config, loading: { ...config.loading, ...patch } });
  };

  const updateActiveLoader = (patch: Partial<LoadingScreenConfig>) => {
    onChange({
      ...config,
      loading: {
        ...config.loading,
        loaders: config.loading.loaders.map((l) =>
          l.id === activeLoader.id ? { ...l, ...patch } : l,
        ),
      },
    });
  };

  const updateMainMenu = (patch: Partial<GameScreensConfig["main_menu"]>) => {
    onChange({ ...config, main_menu: { ...config.main_menu, ...patch } });
  };

  const updateSettings = (patch: Partial<GameScreensConfig["settings"]>) => {
    onChange({ ...config, settings: { ...config.settings, ...patch } });
  };

  const loadingElements: CanvasElement[] = useMemo(
    () => [
      {
        id: "loading-title",
        label: activeLoader.title || "Заголовок",
        pos: activeLoader.title_pos,
        variant: "title",
      },
      {
        id: "loading-subtitle",
        label: activeLoader.subtitle || "Загрузка...",
        pos: activeLoader.subtitle_pos,
        variant: "text",
      },
      {
        id: "loading-tip",
        label: activeLoader.tip_text.slice(0, 40) || "Подсказка",
        pos: activeLoader.tip_pos,
        variant: "text",
      },
    ],
    [activeLoader],
  );

  const menuElements: CanvasElement[] = useMemo(
    () => [
      {
        id: "menu-title",
        label: config.main_menu.title || "Моя игра",
        pos: config.main_menu.title_pos,
        variant: "title",
      },
      ...config.main_menu.items.map((item) => ({
        id: item.id,
        label: item.label,
        pos: { x: item.x, y: item.y },
        variant: "button" as const,
      })),
    ],
    [config.main_menu],
  );

  const settingsElements: CanvasElement[] = useMemo(
    () => [
      {
        id: "settings-title",
        label: config.settings.title || "Настройки",
        pos: config.settings.title_pos,
        variant: "title",
      },
      ...config.settings.items.map((item) => ({
        id: item.id,
        label: `${item.label} (${TYPE_LABELS[item.type]})`,
        pos: { x: item.x, y: item.y },
        variant: "control" as const,
      })),
    ],
    [config.settings],
  );

  const handleCanvasMove = (id: string, pos: ElementPosition) => {
    if (activeScreen === "loading") {
      if (id === "loading-title") updateActiveLoader({ title_pos: pos });
      if (id === "loading-subtitle") updateActiveLoader({ subtitle_pos: pos });
      if (id === "loading-tip") updateActiveLoader({ tip_pos: pos });
      return;
    }
    if (activeScreen === "main_menu") {
      if (id === "menu-title") {
        updateMainMenu({ title_pos: pos });
        return;
      }
      updateMainMenu({
        items: config.main_menu.items.map((item) =>
          item.id === id ? { ...item, x: pos.x, y: pos.y } : item,
        ),
      });
      return;
    }
    if (id === "settings-title") {
      updateSettings({ title_pos: pos });
      return;
    }
    updateSettings({
      items: config.settings.items.map((item) =>
        item.id === id ? { ...item, x: pos.x, y: pos.y } : item,
      ),
    });
  };

  const canvasProps = {
    selectedId,
    onSelect: setSelectedId,
    onMove: handleCanvasMove,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-[var(--editor-border)]">
        {SCREEN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveScreen(tab.id);
              setSelectedId(
                tab.id === "loading"
                  ? "loading-title"
                  : tab.id === "main_menu"
                    ? "menu-title"
                    : "settings-title",
              );
            }}
            className={cn(
              "flex-1 px-2 py-2 text-xs font-medium transition",
              activeScreen === tab.id
                ? "border-b-2 border-indigo-500 text-indigo-300"
                : "text-[var(--editor-muted)] hover:text-[var(--editor-text)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">
        {activeScreen === "loading" && (
          <>
            <div className="flex gap-2">
              <Select
                value={activeLoader.id}
                onChange={(e) => updateLoading({ active_loader_id: e.target.value })}
                className="flex-1 bg-[var(--editor-surface-alt)] text-xs"
              >
                {config.loading.loaders.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[var(--editor-surface)]">
                    {l.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const id = uuidv4();
                  updateLoading({
                    loaders: [
                      ...config.loading.loaders,
                      {
                        id,
                        name: `Лоадер ${config.loading.loaders.length + 1}`,
                        background_asset_id: "",
                        title: "",
                        subtitle: "Загрузка...",
                        tip_text: "",
                        title_pos: { x: 50, y: 38 },
                        subtitle_pos: { x: 50, y: 52 },
                        tip_pos: { x: 50, y: 88 },
                      },
                    ],
                    active_loader_id: id,
                  });
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
            <ScreenCanvasEditor
              backgroundUrl={bgUrl(activeLoader.background_asset_id)}
              elements={loadingElements}
              {...canvasProps}
            />
            <AssetSelect
              label="Фон"
              value={activeLoader.background_asset_id}
              assets={backgrounds}
              onChange={(v) => updateActiveLoader({ background_asset_id: v })}
            />
            <BlockCard title="Название лоадера">
              <Input
                value={activeLoader.name}
                onChange={(e) => updateActiveLoader({ name: e.target.value })}
                className="text-xs"
              />
            </BlockCard>
            <BlockCard
              title="Заголовок"
              selected={selectedId === "loading-title"}
              onSelect={() => setSelectedId("loading-title")}
            >
              <Input
                value={activeLoader.title}
                onChange={(e) => updateActiveLoader({ title: e.target.value })}
                placeholder="Название игры"
                className="text-xs"
              />
              <PositionFields
                pos={activeLoader.title_pos}
                onChange={(p) => updateActiveLoader({ title_pos: p })}
              />
            </BlockCard>
            <BlockCard
              title="Подзаголовок"
              selected={selectedId === "loading-subtitle"}
              onSelect={() => setSelectedId("loading-subtitle")}
            >
              <Input
                value={activeLoader.subtitle}
                onChange={(e) => updateActiveLoader({ subtitle: e.target.value })}
                className="text-xs"
              />
              <PositionFields
                pos={activeLoader.subtitle_pos}
                onChange={(p) => updateActiveLoader({ subtitle_pos: p })}
              />
            </BlockCard>
            <BlockCard
              title="Подсказка"
              selected={selectedId === "loading-tip"}
              onSelect={() => setSelectedId("loading-tip")}
            >
              <Textarea
                rows={2}
                value={activeLoader.tip_text}
                onChange={(e) => updateActiveLoader({ tip_text: e.target.value })}
                className="text-xs"
              />
              <PositionFields
                pos={activeLoader.tip_pos}
                onChange={(p) => updateActiveLoader({ tip_pos: p })}
              />
            </BlockCard>
            {config.loading.loaders.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-red-400"
                onClick={() => {
                  const next = config.loading.loaders.filter((l) => l.id !== activeLoader.id);
                  updateLoading({
                    loaders: next,
                    active_loader_id: next[0]?.id ?? "default",
                  });
                }}
              >
                Удалить этот лоадер
              </Button>
            )}
          </>
        )}

        {activeScreen === "main_menu" && (
          <>
            <ScreenCanvasEditor
              backgroundUrl={bgUrl(config.main_menu.background_asset_id)}
              elements={menuElements}
              {...canvasProps}
            />
            <AssetSelect
              label="Фон"
              value={config.main_menu.background_asset_id}
              assets={backgrounds}
              onChange={(v) => updateMainMenu({ background_asset_id: v })}
            />
            <AssetSelect
              label="Музыка"
              value={config.main_menu.music_asset_id}
              assets={music}
              onChange={(v) => updateMainMenu({ music_asset_id: v })}
            />
            <BlockCard
              title="Заголовок меню"
              selected={selectedId === "menu-title"}
              onSelect={() => setSelectedId("menu-title")}
            >
              <Input
                value={config.main_menu.title}
                onChange={(e) => updateMainMenu({ title: e.target.value })}
                className="text-xs"
              />
              <PositionFields
                pos={config.main_menu.title_pos}
                onChange={(p) => updateMainMenu({ title_pos: p })}
              />
            </BlockCard>

            <div className="space-y-2">
              <Label className="text-xs text-[var(--editor-muted)]">Пункты меню</Label>
              {config.main_menu.items.map((item) => (
                <BlockCard
                  key={item.id}
                  title={item.label || "Пункт меню"}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onDelete={() =>
                    updateMainMenu({
                      items: config.main_menu.items.filter((i) => i.id !== item.id),
                    })
                  }
                >
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updateMainMenu({
                        items: config.main_menu.items.map((i) =>
                          i.id === item.id ? { ...i, label: e.target.value } : i,
                        ),
                      })
                    }
                    placeholder="Текст кнопки"
                    className="text-xs"
                  />
                  <Select
                    value={item.action}
                    onChange={(e) =>
                      updateMainMenu({
                        items: config.main_menu.items.map((i) =>
                          i.id === item.id
                            ? { ...i, action: e.target.value as MainMenuItem["action"] }
                            : i,
                        ),
                      })
                    }
                    className="bg-[var(--editor-surface-alt)] text-xs"
                  >
                    {(Object.keys(ACTION_LABELS) as MainMenuItem["action"][]).map((action) => (
                      <option key={action} value={action} className="bg-[var(--editor-surface)]">
                        {ACTION_LABELS[action]}
                      </option>
                    ))}
                  </Select>
                  <PositionFields
                    pos={{ x: item.x, y: item.y }}
                    onChange={(p) =>
                      updateMainMenu({
                        items: config.main_menu.items.map((i) =>
                          i.id === item.id ? { ...i, x: p.x, y: p.y } : i,
                        ),
                      })
                    }
                  />
                </BlockCard>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  const pos = nextMenuItemPosition(config.main_menu.items);
                  const id = uuidv4();
                  updateMainMenu({
                    items: [
                      ...config.main_menu.items,
                      { id, label: "Новый пункт", action: "start", ...pos },
                    ],
                  });
                  setSelectedId(id);
                }}
              >
                <Plus size={14} className="mr-1" />
                Добавить пункт меню
              </Button>
            </div>
          </>
        )}

        {activeScreen === "settings" && (
          <>
            <ScreenCanvasEditor
              backgroundUrl={bgUrl(config.settings.background_asset_id)}
              elements={settingsElements}
              {...canvasProps}
            />
            <AssetSelect
              label="Фон"
              value={config.settings.background_asset_id}
              assets={backgrounds}
              onChange={(v) => updateSettings({ background_asset_id: v })}
            />
            <BlockCard
              title="Заголовок экрана"
              selected={selectedId === "settings-title"}
              onSelect={() => setSelectedId("settings-title")}
            >
              <Input
                value={config.settings.title}
                onChange={(e) => updateSettings({ title: e.target.value })}
                className="text-xs"
              />
              <PositionFields
                pos={config.settings.title_pos}
                onChange={(p) => updateSettings({ title_pos: p })}
              />
            </BlockCard>

            <div className="space-y-2">
              <Label className="text-xs text-[var(--editor-muted)]">Пункты настроек</Label>
              {config.settings.items.map((item) => (
                <BlockCard
                  key={item.id}
                  title={item.label || "Настройка"}
                  selected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onDelete={() =>
                    updateSettings({
                      items: config.settings.items.filter((i) => i.id !== item.id),
                    })
                  }
                >
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updateSettings({
                        items: config.settings.items.map((i) =>
                          i.id === item.id ? { ...i, label: e.target.value } : i,
                        ),
                      })
                    }
                    className="text-xs"
                  />
                  <Select
                    value={item.type}
                    onChange={(e) =>
                      updateSettings({
                        items: config.settings.items.map((i) =>
                          i.id === item.id
                            ? { ...i, type: e.target.value as SettingsItem["type"] }
                            : i,
                        ),
                      })
                    }
                    className="bg-[var(--editor-surface-alt)] text-xs"
                  >
                    {(Object.keys(TYPE_LABELS) as SettingsItem["type"][]).map((type) => (
                      <option key={type} value={type} className="bg-[var(--editor-surface)]">
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={item.key}
                    onChange={(e) =>
                      updateSettings({
                        items: config.settings.items.map((i) =>
                          i.id === item.id ? { ...i, key: e.target.value } : i,
                        ),
                      })
                    }
                    placeholder="Ключ переменной"
                    className="text-xs"
                  />
                  <PositionFields
                    pos={{ x: item.x, y: item.y }}
                    onChange={(p) =>
                      updateSettings({
                        items: config.settings.items.map((i) =>
                          i.id === item.id ? { ...i, x: p.x, y: p.y } : i,
                        ),
                      })
                    }
                  />
                </BlockCard>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  const pos = nextSettingsItemPosition(config.settings.items);
                  const id = uuidv4();
                  updateSettings({
                    items: [
                      ...config.settings.items,
                      {
                        id,
                        label: "Новая настройка",
                        type: "toggle",
                        key: `option_${config.settings.items.length}`,
                        defaultValue: true,
                        ...pos,
                      },
                    ],
                  });
                  setSelectedId(id);
                }}
              >
                <Plus size={14} className="mr-1" />
                Добавить настройку
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
