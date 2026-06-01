"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ElementPosition } from "@/lib/game-screens";
import { elementStyleToCss, type ElementStyle } from "@/lib/screen-styles";

export type CanvasElement = {
  id: string;
  label: string;
  pos: ElementPosition;
  variant?: "title" | "button" | "text" | "control" | "subtitle";
  style?: ElementStyle;
};

type ScreenCanvasEditorProps = {
  backgroundUrl?: string;
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: ElementPosition) => void;
};

function clampPercent(value: number): number {
  return Math.max(4, Math.min(96, value));
}

export function ScreenCanvasEditor({
  backgroundUrl,
  elements,
  selectedId,
  onSelect,
  onMove,
}: ScreenCanvasEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origin: ElementPosition } | null>(
    null,
  );

  const handlePointerDown = useCallback(
    (id: string, pos: ElementPosition, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(id);
      dragRef.current = { id, startX: event.clientX, startY: event.clientY, origin: pos };
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [onSelect],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dx = ((event.clientX - drag.startX) / rect.width) * 100;
      const dy = ((event.clientY - drag.startY) / rect.height) * 100;

      onMove(drag.id, {
        x: clampPercent(drag.origin.x + dx),
        y: clampPercent(drag.origin.y + dy),
      });
    },
    [onMove],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[var(--editor-muted)]">Перетащите элементы на превью экрана</p>
      <div
        ref={canvasRef}
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--editor-border)] bg-[var(--editor-screen-bg)]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--editor-screen-gradient-from)] to-[var(--editor-screen-gradient-to)]" />
        )}

        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--editor-border) 1px, transparent 1px), linear-gradient(to bottom, var(--editor-border) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />

        {elements.map((el) => {
          const selected = selectedId === el.id;
          const customStyle = el.style ? elementStyleToCss(el.style) : undefined;
          return (
            <div
              key={el.id}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => handlePointerDown(el.id, el.pos, e)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing",
                !el.style && el.variant === "title" && "max-w-[85%] px-2 py-1 text-center text-sm font-bold text-[var(--editor-screen-title)] drop-shadow-sm",
                !el.style &&
                  el.variant === "subtitle" &&
                  "max-w-[85%] px-2 py-1 text-center text-xs text-[var(--editor-muted)] drop-shadow-sm",
                !el.style &&
                  el.variant === "button" &&
                  "max-w-[85%] rounded-md border border-[var(--editor-border)] bg-[var(--editor-surface)]/90 px-2 py-1 text-center text-xs text-[var(--editor-text)] shadow-[var(--editor-shadow)] backdrop-blur-sm",
                !el.style &&
                  el.variant === "control" &&
                  "max-w-[85%] rounded-md border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]/95 px-2 py-1 text-[10px] text-[var(--editor-text)] backdrop-blur-sm",
                !el.style &&
                  el.variant === "text" &&
                  "max-w-[85%] px-2 py-1 text-center text-[10px] text-[var(--editor-screen-title)] drop-shadow-sm",
                selected && "ring-2 ring-indigo-400 ring-offset-1 ring-offset-transparent",
              )}
              style={{ left: `${el.pos.x}%`, top: `${el.pos.y}%`, ...customStyle }}
            >
              {el.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
