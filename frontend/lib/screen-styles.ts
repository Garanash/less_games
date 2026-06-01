import type { CSSProperties } from "react";

export type TextAlign = "left" | "center" | "right";
export type FontWeight = "normal" | "medium" | "semibold" | "bold";

export type ElementStyle = {
  color?: string;
  font_size?: number;
  font_weight?: FontWeight;
  background_color?: string;
  border_color?: string;
  border_width?: number;
  border_radius?: number;
  padding_x?: number;
  padding_y?: number;
  opacity?: number;
  text_align?: TextAlign;
  max_width_percent?: number;
  backdrop_blur?: boolean;
};

export type ProgressBarConfig = {
  x: number;
  y: number;
  width_percent: number;
  height: number;
  color: string;
  background_color: string;
  border_radius: number;
  visible: boolean;
};

export type ScreenElementVariant = "title" | "subtitle" | "text" | "button" | "control";

const FONT_WEIGHT_CSS: Record<FontWeight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const DEFAULT_PROGRESS_BAR: ProgressBarConfig = {
  x: 50,
  y: 92,
  width_percent: 32,
  height: 4,
  color: "#6366f1",
  background_color: "#27272a",
  border_radius: 999,
  visible: true,
};

export const DEFAULT_ELEMENT_STYLES: Record<ScreenElementVariant, ElementStyle> = {
  title: {
    color: "#ffffff",
    font_size: 28,
    font_weight: "bold",
    text_align: "center",
    max_width_percent: 90,
    opacity: 100,
  },
  subtitle: {
    color: "#d4d4d8",
    font_size: 14,
    font_weight: "normal",
    text_align: "center",
    max_width_percent: 90,
    opacity: 100,
  },
  text: {
    color: "#71717a",
    font_size: 12,
    font_weight: "normal",
    text_align: "center",
    max_width_percent: 85,
    opacity: 100,
  },
  button: {
    color: "#ffffff",
    font_size: 12,
    font_weight: "medium",
    background_color: "rgba(0, 0, 0, 0.5)",
    border_color: "rgba(113, 113, 122, 0.8)",
    border_width: 1,
    border_radius: 6,
    padding_x: 16,
    padding_y: 6,
    text_align: "center",
    opacity: 100,
    backdrop_blur: true,
  },
  control: {
    color: "#e4e4e7",
    font_size: 12,
    font_weight: "normal",
    background_color: "rgba(24, 24, 27, 0.85)",
    border_color: "rgba(63, 63, 70, 0.9)",
    border_width: 1,
    border_radius: 6,
    padding_x: 12,
    padding_y: 8,
    text_align: "left",
    opacity: 100,
    backdrop_blur: true,
  },
};

export function mergeElementStyle(
  variant: ScreenElementVariant,
  ...layers: (ElementStyle | undefined)[]
): ElementStyle {
  const merged: ElementStyle = { ...DEFAULT_ELEMENT_STYLES[variant] };
  for (const layer of layers) {
    if (!layer) continue;
    Object.assign(merged, layer);
  }
  return merged;
}

export function normalizeElementStyle(
  value: Partial<ElementStyle> | undefined,
  variant: ScreenElementVariant,
): ElementStyle {
  return mergeElementStyle(variant, value);
}

export function normalizeProgressBar(value: Partial<ProgressBarConfig> | undefined): ProgressBarConfig {
  return {
    x: typeof value?.x === "number" ? value.x : DEFAULT_PROGRESS_BAR.x,
    y: typeof value?.y === "number" ? value.y : DEFAULT_PROGRESS_BAR.y,
    width_percent:
      typeof value?.width_percent === "number" ? value.width_percent : DEFAULT_PROGRESS_BAR.width_percent,
    height: typeof value?.height === "number" ? value.height : DEFAULT_PROGRESS_BAR.height,
    color: String(value?.color ?? DEFAULT_PROGRESS_BAR.color),
    background_color: String(value?.background_color ?? DEFAULT_PROGRESS_BAR.background_color),
    border_radius:
      typeof value?.border_radius === "number" ? value.border_radius : DEFAULT_PROGRESS_BAR.border_radius,
    visible: value?.visible !== false,
  };
}

export function elementStyleToCss(style: ElementStyle): CSSProperties {
  const css: CSSProperties = {
    color: style.color,
    fontSize: style.font_size ? `${style.font_size}px` : undefined,
    fontWeight: style.font_weight ? FONT_WEIGHT_CSS[style.font_weight] : undefined,
    backgroundColor: style.background_color,
    borderColor: style.border_color,
    borderWidth: style.border_width != null ? `${style.border_width}px` : undefined,
    borderStyle: style.border_width != null && style.border_width > 0 ? "solid" : undefined,
    borderRadius: style.border_radius != null ? `${style.border_radius}px` : undefined,
    paddingLeft: style.padding_x != null ? `${style.padding_x}px` : undefined,
    paddingRight: style.padding_x != null ? `${style.padding_x}px` : undefined,
    paddingTop: style.padding_y != null ? `${style.padding_y}px` : undefined,
    paddingBottom: style.padding_y != null ? `${style.padding_y}px` : undefined,
    opacity: style.opacity != null ? style.opacity / 100 : undefined,
    textAlign: style.text_align,
    maxWidth: style.max_width_percent != null ? `${style.max_width_percent}%` : undefined,
  };

  if (style.backdrop_blur) {
    css.backdropFilter = "blur(4px)";
  }

  return css;
}

export function progressBarToCss(bar: ProgressBarConfig): CSSProperties {
  return {
    left: `${bar.x}%`,
    top: `${bar.y}%`,
    width: `${bar.width_percent}%`,
    height: `${bar.height}px`,
    backgroundColor: bar.background_color,
    borderRadius: `${bar.border_radius}px`,
    transform: "translate(-50%, -50%)",
  };
}
