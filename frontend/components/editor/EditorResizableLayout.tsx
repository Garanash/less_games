"use client";

import { ChevronDown, PanelLeft, PanelRight, PanelTop } from "lucide-react";
import { cloneElement, isValidElement, useCallback, useEffect, useRef, useState } from "react";

import { GameStructureTree } from "@/components/editor/GameStructureTree";
import { clearEditorLayoutStorage, DEFAULT_LAYOUT, dispatchEditorLayoutReset } from "@/lib/editor-layout-storage";
import { cn } from "@/lib/utils";

type ResizeHandleProps = {
  axis: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  onResizeStart?: () => void;
};

export function ResizeHandle({ axis, onResize, onResizeEnd, onResizeStart }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);
  const handleRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  const onResizeStartRef = useRef(onResizeStart);

  onResizeRef.current = onResize;
  onResizeEndRef.current = onResizeEnd;
  onResizeStartRef.current = onResizeStart;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const pos = axis === "horizontal" ? e.clientY : e.clientX;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      onResizeRef.current(delta);
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      onResizeEndRef.current?.();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [axis]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    lastPos.current = axis === "horizontal" ? e.clientY : e.clientX;
    onResizeStartRef.current?.();
    handleRef.current?.setPointerCapture(e.pointerId);
  };

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation={axis === "horizontal" ? "horizontal" : "vertical"}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative z-20 shrink-0 touch-none select-none",
        axis === "horizontal"
          ? "flex h-2 w-full cursor-row-resize items-center justify-center py-1"
          : "flex w-2 cursor-col-resize justify-center self-stretch px-1",
      )}
    >
      <div
        className={cn(
          "rounded-full bg-[var(--editor-border)] opacity-60 transition-all group-hover:opacity-100 group-hover:bg-indigo-400 group-active:bg-indigo-500",
          axis === "horizontal" ? "h-1 w-12" : "h-12 w-1",
        )}
      />
    </div>
  );
}

const STORAGE_PREVIEW = "lessgame-layout-preview-h";
const STORAGE_SIDEBAR = "lessgame-layout-sidebar-w";
const STORAGE_TREE = "lessgame-layout-tree-w";
const STORAGE_PREVIEW_COLLAPSED = "lessgame-layout-preview-collapsed";
const STORAGE_TREE_COLLAPSED = "lessgame-layout-tree-collapsed";
const STORAGE_CANVAS_COLLAPSED = "lessgame-layout-canvas-collapsed";
const STORAGE_SIDEBAR_COLLAPSED = "lessgame-layout-sidebar-collapsed";

const PREVIEW_MIN = 140;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 560;
const TREE_MIN = 140;
const TREE_MAX = 480;
const CANVAS_MIN = 240;
const HANDLE_SIZE = 8;

type EditorResizableLayoutProps = {
  preview: React.ReactNode;
  canvas: React.ReactNode;
  sidebar: React.ReactNode;
  layoutResetKey?: number;
};

function CollapsedStrip({
  label,
  icon: Icon,
  onExpand,
  orientation,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onExpand: () => void;
  orientation: "horizontal" | "vertical-left" | "vertical-right";
}) {
  if (orientation === "horizontal") {
    return (
      <button
        type="button"
        onClick={onExpand}
        className="flex h-9 w-full shrink-0 items-center justify-center gap-2 border border-[var(--editor-border)] bg-[var(--editor-surface)] text-xs text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
      >
        <ChevronDown size={14} />
        <Icon size={14} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onExpand}
      title={`Развернуть: ${label}`}
      className={cn(
        "flex h-full w-8 shrink-0 flex-col items-center gap-2 bg-[var(--editor-surface)] py-3 text-[10px] text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]",
        orientation === "vertical-left" ? "border-r border-[var(--editor-border)]" : "border-l border-[var(--editor-border)]",
      )}
    >
      <Icon size={14} />
      <span className="[writing-mode:vertical-rl] rotate-180">{label}</span>
      {orientation === "vertical-left" ? (
        <ChevronDown size={14} className="rotate-90" />
      ) : (
        <ChevronDown size={14} className="-rotate-90" />
      )}
    </button>
  );
}

function PanelHeader({
  title,
  onCollapse,
  collapseTitle,
  collapseDirection = "left",
}: {
  title: string;
  onCollapse: () => void;
  collapseTitle: string;
  collapseDirection?: "left" | "right";
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--editor-border)] px-3 py-1.5">
      <span className="min-w-0 truncate text-xs font-semibold text-[var(--editor-text)]">{title}</span>
      <button
        type="button"
        onClick={onCollapse}
        title={collapseTitle}
        className="shrink-0 rounded p-0.5 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
      >
        <ChevronDown size={14} className={collapseDirection === "right" ? "rotate-90" : "-rotate-90"} />
      </button>
    </div>
  );
}

function loadLayoutFromStorage(container: HTMLDivElement | null) {
  const storedPreview = localStorage.getItem(STORAGE_PREVIEW);
  const storedSidebar = localStorage.getItem(STORAGE_SIDEBAR);
  const storedTree = localStorage.getItem(STORAGE_TREE);

  const previewHeight = storedPreview
    ? Number(storedPreview)
    : container
      ? Math.max(PREVIEW_MIN, Math.round(container.clientHeight * 0.28))
      : DEFAULT_LAYOUT.previewHeight;

  return {
    previewHeight,
    sidebarWidth: storedSidebar ? Number(storedSidebar) : DEFAULT_LAYOUT.sidebarWidth,
    treeWidth: storedTree ? Number(storedTree) : DEFAULT_LAYOUT.treeWidth,
    previewCollapsed: localStorage.getItem(STORAGE_PREVIEW_COLLAPSED) === "1",
    treeCollapsed: localStorage.getItem(STORAGE_TREE_COLLAPSED) === "1",
    canvasCollapsed: localStorage.getItem(STORAGE_CANVAS_COLLAPSED) === "1",
    sidebarCollapsed: localStorage.getItem(STORAGE_SIDEBAR_COLLAPSED) === "1",
  };
}

export function resetEditorLayoutUi() {
  clearEditorLayoutStorage();
  dispatchEditorLayoutReset();
}

export function EditorResizableLayout({ preview, canvas, sidebar, layoutResetKey = 0 }: EditorResizableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const treeWidthRef = useRef<number>(DEFAULT_LAYOUT.treeWidth);
  const sidebarWidthRef = useRef<number>(DEFAULT_LAYOUT.sidebarWidth);

  const [previewHeight, setPreviewHeight] = useState<number>(DEFAULT_LAYOUT.previewHeight);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_LAYOUT.sidebarWidth);
  const [treeWidth, setTreeWidth] = useState<number>(DEFAULT_LAYOUT.treeWidth);
  const [previewCollapsed, setPreviewCollapsed] = useState<boolean>(DEFAULT_LAYOUT.previewCollapsed);
  const [treeCollapsed, setTreeCollapsed] = useState<boolean>(DEFAULT_LAYOUT.treeCollapsed);
  const [canvasCollapsed, setCanvasCollapsed] = useState<boolean>(DEFAULT_LAYOUT.canvasCollapsed);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(DEFAULT_LAYOUT.sidebarCollapsed);
  const [ready, setReady] = useState(false);

  treeWidthRef.current = treeWidth;
  sidebarWidthRef.current = sidebarWidth;

  const getContainerWidth = () => containerRef.current?.clientWidth ?? 1200;

  const clampPreviewHeight = useCallback((height: number) => {
    const container = containerRef.current;
    if (!container) return height;
    const max = Math.max(PREVIEW_MIN, container.clientHeight - 120);
    return Math.min(Math.max(height, PREVIEW_MIN), max);
  }, []);

  const clampTreeWidth = useCallback(
    (width: number, containerWidth = getContainerWidth()) => {
      const sidebarSpace = sidebarCollapsed ? 32 : sidebarWidthRef.current + HANDLE_SIZE;
      const available = containerWidth - CANVAS_MIN - sidebarSpace - HANDLE_SIZE * 2;
      const max = Math.max(TREE_MIN, Math.min(TREE_MAX, available));
      return Math.min(Math.max(width, TREE_MIN), max);
    },
    [sidebarCollapsed],
  );

  const clampSidebarWidth = useCallback(
    (width: number, containerWidth = getContainerWidth()) => {
      const treeSpace = treeCollapsed ? 32 : treeWidthRef.current + HANDLE_SIZE;
      const available = containerWidth - CANVAS_MIN - treeSpace - HANDLE_SIZE * 2;
      const max = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, available));
      return Math.min(Math.max(width, SIDEBAR_MIN), max);
    },
    [treeCollapsed],
  );

  const fitPanelsToContainer = useCallback(() => {
    if (isDraggingRef.current) return;
    const cw = getContainerWidth();
    setPreviewHeight((h) => clampPreviewHeight(h));
    setTreeWidth((w) => clampTreeWidth(w, cw));
    setSidebarWidth((w) => clampSidebarWidth(w, cw));
  }, [clampPreviewHeight, clampTreeWidth, clampSidebarWidth]);

  const applyStoredLayout = useCallback(() => {
    const loaded = loadLayoutFromStorage(containerRef.current);
    const cw = getContainerWidth();
    setPreviewHeight(clampPreviewHeight(loaded.previewHeight));
    setTreeWidth(clampTreeWidth(loaded.treeWidth, cw));
    setSidebarWidth(clampSidebarWidth(loaded.sidebarWidth, cw));
    setPreviewCollapsed(loaded.previewCollapsed);
    setTreeCollapsed(loaded.treeCollapsed);
    setCanvasCollapsed(loaded.canvasCollapsed);
    setSidebarCollapsed(loaded.sidebarCollapsed);
  }, [clampPreviewHeight, clampTreeWidth, clampSidebarWidth]);

  useEffect(() => {
    applyStoredLayout();
    setReady(true);
  }, [applyStoredLayout]);

  useEffect(() => {
    if (layoutResetKey === 0) return;
    applyStoredLayout();
  }, [layoutResetKey, applyStoredLayout]);

  useEffect(() => {
    if (!ready) return;
    const container = containerRef.current;
    if (!container) return;

    fitPanelsToContainer();
    const ro = new ResizeObserver(() => fitPanelsToContainer());
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready, fitPanelsToContainer]);

  const persistPreview = useCallback(() => {
    localStorage.setItem(STORAGE_PREVIEW, String(previewHeight));
  }, [previewHeight]);

  const persistSidebar = useCallback(() => {
    localStorage.setItem(STORAGE_SIDEBAR, String(sidebarWidth));
  }, [sidebarWidth]);

  const persistTree = useCallback(() => {
    localStorage.setItem(STORAGE_TREE, String(treeWidth));
  }, [treeWidth]);

  const togglePreview = useCallback(() => {
    setPreviewCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_PREVIEW_COLLAPSED, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleTree = useCallback(() => {
    setTreeCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_TREE_COLLAPSED, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleCanvas = useCallback(() => {
    setCanvasCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_CANVAS_COLLAPSED, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_SIDEBAR_COLLAPSED, next ? "1" : "0");
      return next;
    });
  }, []);

  const previewNode = isValidElement(preview)
    ? cloneElement(preview as React.ReactElement<{ onTogglePreviewCollapse?: () => void }>, {
        onTogglePreviewCollapse: togglePreview,
      })
    : preview;

  const sidebarNode = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<{ hideHeader?: boolean }>, { hideHeader: true })
    : sidebar;

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col p-2">
      {previewCollapsed ? (
        <CollapsedStrip label="Превью" icon={PanelTop} onExpand={togglePreview} orientation="horizontal" />
      ) : (
        <>
          <div className="min-h-0 shrink-0 overflow-hidden" style={{ height: previewHeight }}>
            {previewNode}
          </div>
          <ResizeHandle
            axis="horizontal"
            onResizeStart={() => {
              isDraggingRef.current = true;
            }}
            onResize={(delta) => setPreviewHeight((h) => clampPreviewHeight(h + delta))}
            onResizeEnd={() => {
              isDraggingRef.current = false;
              persistPreview();
            }}
          />
        </>
      )}

      <div className="flex min-h-0 flex-1">
        {treeCollapsed ? (
          <GameStructureTree collapsed onToggleCollapse={toggleTree} />
        ) : (
          <>
            <div className="min-h-0 shrink-0 overflow-hidden" style={{ width: treeWidth }}>
              <GameStructureTree onToggleCollapse={toggleTree} />
            </div>
            <ResizeHandle
              axis="vertical"
              onResizeStart={() => {
                isDraggingRef.current = true;
              }}
              onResize={(delta) => setTreeWidth((w) => clampTreeWidth(w + delta))}
              onResizeEnd={() => {
                isDraggingRef.current = false;
                persistTree();
              }}
            />
          </>
        )}

        {canvasCollapsed ? (
          <CollapsedStrip label="Канвас" icon={PanelLeft} onExpand={toggleCanvas} orientation="vertical-left" />
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]">
            <PanelHeader title="Схема" onCollapse={toggleCanvas} collapseTitle="Свернуть канвас" />
            <div className="min-h-0 flex-1 overflow-hidden">{canvas}</div>
          </div>
        )}

        {sidebarCollapsed ? (
          <CollapsedStrip label="Свойства" icon={PanelRight} onExpand={toggleSidebar} orientation="vertical-right" />
        ) : (
          <>
            {!canvasCollapsed && (
              <ResizeHandle
                axis="vertical"
                onResizeStart={() => {
                  isDraggingRef.current = true;
                }}
                onResize={(delta) => setSidebarWidth((w) => clampSidebarWidth(w - delta))}
                onResizeEnd={() => {
                  isDraggingRef.current = false;
                  persistSidebar();
                }}
              />
            )}
            <div
              className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)]"
              style={{ width: sidebarWidth }}
            >
              <PanelHeader title="Свойства" onCollapse={toggleSidebar} collapseTitle="Свернуть свойства" collapseDirection="right" />
              <div className="min-h-0 flex-1 overflow-hidden">{sidebarNode}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
