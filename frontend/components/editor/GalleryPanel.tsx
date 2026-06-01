"use client";

import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import type { Asset } from "@/lib/api";
import type { CheatCode, GalleryConfig, GalleryItem } from "@/lib/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type GalleryPanelProps = {
  config: GalleryConfig;
  saveSlotCount: number;
  assets: Asset[];
  onChange: (config: GalleryConfig) => void;
  onSaveConfigChange: (slotCount: number) => void;
  onAddGalleryMenuItem?: () => void;
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
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="text-xs">
        <option value="">— не выбрано —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.filename}
          </option>
        ))}
      </Select>
    </div>
  );
}

const CHEAT_ACTIONS: { value: CheatCode["action"]; label: string }[] = [
  { value: "unlock_all_gallery", label: "Открыть всю галерею" },
  { value: "unlock_gallery_item", label: "Открыть один CG" },
  { value: "set_flag", label: "Установить флаг (переменную)" },
];

export function GalleryPanel({
  config,
  saveSlotCount,
  assets,
  onChange,
  onSaveConfigChange,
  onAddGalleryMenuItem,
}: GalleryPanelProps) {
  const cgAssets = assets.filter((a) => a.kind === "cg" || a.kind === "background" || a.kind === "character");
  const backgrounds = assets.filter((a) => a.kind === "background");

  const updateItem = (id: string, patch: Partial<GalleryItem>) => {
    onChange({
      ...config,
      items: config.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const updateCheat = (id: string, patch: Partial<CheatCode>) => {
    onChange({
      ...config,
      cheats: config.cheats.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  return (
    <div className="space-y-6 p-1">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--editor-text)]">Галерея CG</h3>
        <label className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          />
          Галерея включена
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Заголовок экрана</Label>
            <Input
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              className="text-xs"
            />
          </div>
          <AssetSelect
            label="Фон экрана"
            value={config.background_asset_id}
            assets={backgrounds}
            onChange={(v) => onChange({ ...config, background_asset_id: v })}
          />
        </div>
        {onAddGalleryMenuItem && (
          <Button type="button" size="sm" variant="secondary" onClick={onAddGalleryMenuItem} className="text-xs">
            Добавить «Галерея» в главное меню
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Изображения галереи</Label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              onChange({
                ...config,
                items: [
                  ...config.items,
                  { id: uuidv4(), label: `CG ${config.items.length + 1}`, asset_id: "" },
                ],
              })
            }
          >
            <Plus size={14} className="mr-1" />
            Добавить
          </Button>
        </div>
        {config.items.length === 0 && (
          <p className="text-xs text-[var(--editor-muted)]">
            Загрузите CG во вкладке «Медиа» → CG, затем добавьте пункты здесь. Открытие — блок «Открыть CG» на
            схеме.
          </p>
        )}
        {config.items.map((item) => (
          <div
            key={item.id}
            className="space-y-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]/60 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <Input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                className="text-xs"
                placeholder="Название"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...config, items: config.items.filter((i) => i.id !== item.id) })}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <AssetSelect
              label="Изображение CG"
              value={item.asset_id}
              assets={cgAssets}
              onChange={(v) => updateItem(item.id, { asset_id: v })}
            />
            <AssetSelect
              label="Миниатюра (опционально)"
              value={item.thumbnail_asset_id ?? ""}
              assets={cgAssets}
              onChange={(v) => updateItem(item.id, { thumbnail_asset_id: v || undefined })}
            />
            <label className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
              <input
                type="checkbox"
                checked={Boolean(item.unlock_by_default)}
                onChange={(e) => updateItem(item.id, { unlock_by_default: e.target.checked })}
              />
              Открыто с начала игры
            </label>
            <p className="font-mono text-[10px] text-[var(--editor-muted)]">ID: {item.id}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Чит-коды</Label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              onChange({
                ...config,
                cheats: [
                  ...config.cheats,
                  { id: uuidv4(), code: "newcode", label: "Новый чит", action: "unlock_all_gallery" },
                ],
              })
            }
          >
            <Plus size={14} />
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
          <input
            type="checkbox"
            checked={config.cheat_input_enabled}
            onChange={(e) => onChange({ ...config, cheat_input_enabled: e.target.checked })}
          />
          Ввод кодов в режиме «Играть» (клавиша `)
        </label>
        {config.cheats.map((cheat) => (
          <div
            key={cheat.id}
            className="space-y-2 rounded-lg border border-[var(--editor-border)] p-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Код</Label>
                <Input
                  value={cheat.code}
                  onChange={(e) => updateCheat(cheat.id, { code: e.target.value.toLowerCase() })}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Описание</Label>
                <Input
                  value={cheat.label}
                  onChange={(e) => updateCheat(cheat.id, { label: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>
            <Select
              value={cheat.action}
              onChange={(e) => updateCheat(cheat.id, { action: e.target.value as CheatCode["action"] })}
              className="text-xs"
            >
              {CHEAT_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
            {(cheat.action === "unlock_gallery_item" || cheat.action === "set_flag") && (
              <div>
                <Label className="text-[10px]">
                  {cheat.action === "set_flag" ? "Имя переменной" : "ID CG"}
                </Label>
                {cheat.action === "unlock_gallery_item" ? (
                  <Select
                    value={cheat.target_id ?? ""}
                    onChange={(e) => updateCheat(cheat.id, { target_id: e.target.value })}
                    className="text-xs"
                  >
                    <option value="">— выберите CG —</option>
                    {config.items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    value={cheat.target_id ?? ""}
                    onChange={(e) => updateCheat(cheat.id, { target_id: e.target.value })}
                    className="text-xs"
                  />
                )}
              </div>
            )}
            {cheat.action === "set_flag" && (
              <div>
                <Label className="text-[10px]">Значение</Label>
                <Input
                  value={String(cheat.flag_value ?? "true")}
                  onChange={(e) => updateCheat(cheat.id, { flag_value: e.target.value })}
                  className="text-xs"
                />
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-red-400"
              onClick={() =>
                onChange({ ...config, cheats: config.cheats.filter((c) => c.id !== cheat.id) })
              }
            >
              Удалить чит
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-2 border-t border-[var(--editor-border)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--editor-text)]">Сохранения (превью)</h3>
        <p className="text-xs text-[var(--editor-muted)]">
          Слоты хранятся в браузере. В экспорте Ren&apos;Py используется стандартное меню загрузки.
        </p>
        <div>
          <Label>Количество слотов (1–12)</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={saveSlotCount}
            onChange={(e) => onSaveConfigChange(Number(e.target.value))}
            className="w-24 text-xs"
          />
        </div>
      </section>
    </div>
  );
}
