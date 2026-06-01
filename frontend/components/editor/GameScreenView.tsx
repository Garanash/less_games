"use client";

import type { Asset } from "@/lib/api";
import {
  getActiveLoader,
  type GameScreensConfig,
  type MainMenuItem,
  type SettingsItem,
} from "@/lib/game-screens";
import {
  elementStyleToCss,
  mergeElementStyle,
  progressBarToCss,
  type ElementStyle,
} from "@/lib/screen-styles";

type GameScreenViewProps = {
  screen: "loading" | "main_menu" | "settings";
  config: GameScreensConfig;
  assets: Asset[];
  projectTitle: string;
  onMenuAction?: (action: MainMenuItem["action"]) => void;
  onSettingsBack?: () => void;
};

function assetUrl(assets: Asset[], assetId: string): string | undefined {
  return assets.find((a) => a.id === assetId)?.url;
}

function posStyle(x: number, y: number, style?: ElementStyle): React.CSSProperties {
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
    ...(style ? elementStyleToCss(style) : {}),
  };
}

function StyledText({
  text,
  x,
  y,
  variant,
  style,
}: {
  text: string;
  x: number;
  y: number;
  variant: "title" | "subtitle" | "text";
  style?: ElementStyle;
}) {
  const merged = mergeElementStyle(variant === "title" ? "title" : variant === "subtitle" ? "subtitle" : "text", style);
  if (!text) return null;
  return (
    <div className="absolute whitespace-pre-wrap" style={posStyle(x, y, merged)}>
      {text}
    </div>
  );
}

function StyledButton({
  label,
  x,
  y,
  style,
  onClick,
}: {
  label: string;
  x: number;
  y: number;
  style: ElementStyle;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className="absolute transition hover:brightness-110"
      style={posStyle(x, y, style)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function GameScreenView({
  screen,
  config,
  assets,
  projectTitle,
  onMenuAction,
  onSettingsBack,
}: GameScreenViewProps) {
  if (screen === "loading") {
    const loader = getActiveLoader(config);
    const bg = assetUrl(assets, loader.background_asset_id);
    const bar = loader.progress_bar;
    return (
      <div className="absolute inset-0 z-30 bg-black">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain object-center" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
        )}
        <StyledText
          text={loader.title || projectTitle}
          x={loader.title_pos.x}
          y={loader.title_pos.y}
          variant="title"
          style={loader.title_style}
        />
        <StyledText
          text={loader.subtitle}
          x={loader.subtitle_pos.x}
          y={loader.subtitle_pos.y}
          variant="subtitle"
          style={loader.subtitle_style}
        />
        {loader.tip_text && (
          <StyledText
            text={loader.tip_text}
            x={loader.tip_pos.x}
            y={loader.tip_pos.y}
            variant="text"
            style={loader.tip_style}
          />
        )}
        {bar?.visible !== false && bar && (
          <div className="absolute overflow-hidden" style={progressBarToCss(bar)}>
            <div
              className="h-1/2 w-1/2 animate-pulse"
              style={{
                height: "100%",
                backgroundColor: bar.color,
                borderRadius: `${bar.border_radius}px`,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (screen === "main_menu") {
    const menu = config.main_menu;
    const bg = assetUrl(assets, menu.background_asset_id);
    const defaultButtonStyle = mergeElementStyle("button", menu.button_style);
    return (
      <div className="absolute inset-0 z-30 bg-black">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain object-center" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
        )}
        <StyledText
          text={menu.title || projectTitle}
          x={menu.title_pos.x}
          y={menu.title_pos.y}
          variant="title"
          style={menu.title_style}
        />
        {menu.items.map((item) => (
          <StyledButton
            key={item.id}
            label={item.label}
            x={item.x}
            y={item.y}
            style={mergeElementStyle("button", menu.button_style, item.style)}
            onClick={(e) => {
              e.stopPropagation();
              onMenuAction?.(item.action);
            }}
          />
        ))}
      </div>
    );
  }

  const settings = config.settings;
  const bg = assetUrl(assets, settings.background_asset_id);
  const backStyle = mergeElementStyle("button", settings.back_button.style);
  const defaultControlStyle = mergeElementStyle("control", settings.control_style);

  return (
    <div className="absolute inset-0 z-30 bg-black">
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain object-center" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
      )}
      <StyledText
        text={settings.title}
        x={settings.title_pos.x}
        y={settings.title_pos.y}
        variant="title"
        style={settings.title_style}
      />
      {settings.items.map((item) => (
        <SettingsControl
          key={item.id}
          item={item}
          style={mergeElementStyle("control", settings.control_style, item.style)}
        />
      ))}
      <StyledButton
        label={settings.back_button.label}
        x={settings.back_button.x}
        y={settings.back_button.y}
        style={backStyle}
        onClick={(e) => {
          e.stopPropagation();
          onSettingsBack?.();
        }}
      />
    </div>
  );
}

function SettingsControl({ item, style }: { item: SettingsItem; style: ElementStyle }) {
  const css = elementStyleToCss(style);
  const position: React.CSSProperties = {
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: "translate(-50%, -50%)",
  };

  if (item.type === "slider") {
    return (
      <div className="absolute w-40" style={{ ...position, ...css }}>
        <div className="mb-1" style={{ fontSize: css.fontSize, color: css.color }}>
          {item.label}
        </div>
        <input type="range" defaultValue={Number(item.defaultValue) || 50} className="w-full" readOnly />
      </div>
    );
  }

  return (
    <label className="absolute flex cursor-default items-center gap-2" style={{ ...position, ...css }}>
      <input type="checkbox" defaultChecked={Boolean(item.defaultValue)} readOnly />
      {item.label}
    </label>
  );
}
