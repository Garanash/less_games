export const LAYOUT_STORAGE_KEYS = [
  "lessgame-layout-preview-h",
  "lessgame-layout-sidebar-w",
  "lessgame-layout-tree-w",
  "lessgame-layout-preview-collapsed",
  "lessgame-layout-tree-collapsed",
  "lessgame-layout-canvas-collapsed",
  "lessgame-layout-sidebar-collapsed",
  "lessgame-layout-debug-collapsed",
] as const;

export const DEFAULT_LAYOUT = {
  previewHeight: 240,
  sidebarWidth: 280,
  treeWidth: 220,
  previewCollapsed: false,
  treeCollapsed: false,
  canvasCollapsed: false,
  sidebarCollapsed: false,
  debugCollapsed: false,
} as const;

export function clearEditorLayoutStorage() {
  for (const key of LAYOUT_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function dispatchEditorLayoutReset() {
  window.dispatchEvent(new CustomEvent("lessgame:layout-reset"));
}
