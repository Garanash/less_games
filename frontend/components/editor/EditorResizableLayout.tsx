"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ResizeHandleProps = {
  axis: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
};

export function ResizeHandle({ axis, onResize, onResizeEnd }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = axis === "horizontal" ? e.clientY : e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const pos = axis === "horizontal" ? e.clientY : e.clientX;
    const delta = pos - lastPos.current;
    lastPos.current = pos;
    onResize(delta);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onResizeEnd?.();
  };

  return (
    <div
      role="separator"
      aria-orientation={axis === "horizontal" ? "horizontal" : "vertical"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "group relative z-10 shrink-0 touch-none select-none bg-transparent",
        axis === "horizontal"
          ? "flex h-3 w-full cursor-row-resize items-center justify-center"
          : "flex w-3 cursor-col-resize justify-center self-stretch",
      )}
    >
      <div
        className={cn(
          "border-[var(--editor-border)] border-dashed opacity-70 transition-opacity group-hover:opacity-100 group-hover:border-indigo-400 group-active:border-indigo-500",
          axis === "horizontal" ? "h-0 w-full border-t" : "h-full w-0 border-l",
        )}
      />
    </div>
  );
}

const STORAGE_PREVIEW = "lessgame-layout-preview-h";
const STORAGE_SIDEBAR = "lessgame-layout-sidebar-w";

const PREVIEW_MIN = 140;
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 520;
const CANVAS_MIN = 280;

type EditorResizableLayoutProps = {
  preview: React.ReactNode;
  canvas: React.ReactNode;
  sidebar: React.ReactNode;
};

export function EditorResizableLayout({ preview, canvas, sidebar }: EditorResizableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewHeight, setPreviewHeight] = useState(240);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [ready, setReady] = useState(false);

  const clampPreviewHeight = useCallback((height: number) => {
    const container = containerRef.current;
    if (!container) return height;
    const max = Math.max(PREVIEW_MIN, container.clientHeight - 160);
    return Math.min(Math.max(height, PREVIEW_MIN), max);
  }, []);

  const clampSidebarWidth = useCallback((width: number) => {
    const container = containerRef.current;
    if (!container) return width;
    const max = Math.max(SIDEBAR_MIN, container.clientWidth - CANVAS_MIN - 16);
    return Math.min(Math.max(width, SIDEBAR_MIN), Math.min(SIDEBAR_MAX, max));
  }, []);

  useEffect(() => {
    const storedPreview = localStorage.getItem(STORAGE_PREVIEW);
    const storedSidebar = localStorage.getItem(STORAGE_SIDEBAR);
    if (storedPreview) setPreviewHeight(Number(storedPreview));
    if (storedSidebar) setSidebarWidth(Number(storedSidebar));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const container = containerRef.current;
    if (!container) return;

    const applyDefaults = () => {
      if (!localStorage.getItem(STORAGE_PREVIEW)) {
        setPreviewHeight((h) => {
          const next = clampPreviewHeight(Math.round(container.clientHeight * 0.28));
          return next === h ? h : next;
        });
      } else {
        setPreviewHeight((h) => {
          const next = clampPreviewHeight(h);
          return next === h ? h : next;
        });
      }
      setSidebarWidth((w) => {
        const next = clampSidebarWidth(w);
        return w === next ? w : next;
      });
    };

    applyDefaults();
    const ro = new ResizeObserver(applyDefaults);
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready, clampPreviewHeight, clampSidebarWidth]);

  const persistPreview = useCallback(() => {
    localStorage.setItem(STORAGE_PREVIEW, String(previewHeight));
  }, [previewHeight]);

  const persistSidebar = useCallback(() => {
    localStorage.setItem(STORAGE_SIDEBAR, String(sidebarWidth));
  }, [sidebarWidth]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col p-2">
      <div className="min-h-0 shrink-0 overflow-hidden" style={{ height: previewHeight }}>
        {preview}
      </div>

      <ResizeHandle
        axis="horizontal"
        onResize={(delta) => setPreviewHeight((h) => clampPreviewHeight(h + delta))}
        onResizeEnd={persistPreview}
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{canvas}</div>

        <ResizeHandle
          axis="vertical"
          onResize={(delta) => setSidebarWidth((w) => clampSidebarWidth(w + delta))}
          onResizeEnd={persistSidebar}
        />

        <div className="min-h-0 shrink-0 overflow-hidden" style={{ width: sidebarWidth }}>
          {sidebar}
        </div>
      </div>
    </div>
  );
}
