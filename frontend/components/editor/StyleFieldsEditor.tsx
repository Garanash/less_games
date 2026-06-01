"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_ELEMENT_STYLES,
  type ElementStyle,
  type FontWeight,
  type ScreenElementVariant,
  type TextAlign,
} from "@/lib/screen-styles";

type StyleFieldsEditorProps = {
  label?: string;
  variant: ScreenElementVariant;
  value: ElementStyle;
  onChange: (style: ElementStyle) => void;
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  const hex = value?.startsWith("#") ? value : "#ffffff";
  return (
    <div>
      <Label className="text-[10px] text-[var(--editor-muted)]">{label}</Label>
      <div className="flex gap-1">
        <input
          type="color"
          value={hex.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-[var(--editor-border)] bg-transparent"
        />
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff или rgba(...)"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export function StyleFieldsEditor({ label, variant, value, onChange }: StyleFieldsEditorProps) {
  const set = (patch: Partial<ElementStyle>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]/50 p-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--editor-muted)]">
          {label ?? "Оформление"}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-[10px]"
          onClick={() => onChange({ ...DEFAULT_ELEMENT_STYLES[variant] })}
        >
          <RotateCcw size={10} />
          Сброс
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Цвет текста" value={value.color} onChange={(color) => set({ color })} />
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Размер шрифта</Label>
          <Input
            type="number"
            min={8}
            max={96}
            value={value.font_size ?? ""}
            onChange={(e) => set({ font_size: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Начертание</Label>
          <Select
            value={value.font_weight ?? "normal"}
            onChange={(e) => set({ font_weight: e.target.value as FontWeight })}
            className="h-8 text-xs"
          >
            <option value="normal">Обычный</option>
            <option value="medium">Medium</option>
            <option value="semibold">Semibold</option>
            <option value="bold">Жирный</option>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Выравнивание</Label>
          <Select
            value={value.text_align ?? "center"}
            onChange={(e) => set({ text_align: e.target.value as TextAlign })}
            className="h-8 text-xs"
          >
            <option value="left">Слева</option>
            <option value="center">По центру</option>
            <option value="right">Справа</option>
          </Select>
        </div>
      </div>

      {(variant === "button" || variant === "control") && (
        <ColorField
          label="Фон"
          value={value.background_color}
          onChange={(background_color) => set({ background_color })}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        <ColorField
          label="Рамка"
          value={value.border_color}
          onChange={(border_color) => set({ border_color })}
        />
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Толщина</Label>
          <Input
            type="number"
            min={0}
            max={8}
            value={value.border_width ?? 0}
            onChange={(e) => set({ border_width: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Скругление</Label>
          <Input
            type="number"
            min={0}
            max={48}
            value={value.border_radius ?? 0}
            onChange={(e) => set({ border_radius: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {(variant === "button" || variant === "control") && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-[var(--editor-muted)]">Отступ X</Label>
            <Input
              type="number"
              min={0}
              max={64}
              value={value.padding_x ?? 0}
              onChange={(e) => set({ padding_x: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-[var(--editor-muted)]">Отступ Y</Label>
            <Input
              type="number"
              min={0}
              max={64}
              value={value.padding_y ?? 0}
              onChange={(e) => set({ padding_y: Number(e.target.value) })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Прозрачность %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={value.opacity ?? 100}
            onChange={(e) => set({ opacity: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Макс. ширина %</Label>
          <Input
            type="number"
            min={10}
            max={100}
            value={value.max_width_percent ?? 90}
            onChange={(e) => set({ max_width_percent: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {(variant === "button" || variant === "control") && (
        <label className="flex items-center gap-2 text-[10px] text-[var(--editor-muted)]">
          <input
            type="checkbox"
            checked={Boolean(value.backdrop_blur)}
            onChange={(e) => set({ backdrop_blur: e.target.checked })}
          />
          Размытие фона (backdrop blur)
        </label>
      )}
    </div>
  );
}
