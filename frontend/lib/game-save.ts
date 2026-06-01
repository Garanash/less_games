import type { GraphNode } from "@/lib/api";

export type SaveSlotData = {
  currentNodeId: string;
  variables: Record<string, unknown>;
  unlockedGalleryIds: string[];
  savedAt: string;
  label: string;
};

export type SaveSlot = SaveSlotData | null;

const STORAGE_PREFIX = "less_game_saves_";

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function loadSaveSlots(projectId: string, slotCount: number): SaveSlot[] {
  if (typeof window === "undefined") return Array.from({ length: slotCount }, () => null);
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    const parsed = raw ? (JSON.parse(raw) as SaveSlot[]) : [];
    const slots: SaveSlot[] = Array.from({ length: slotCount }, (_, i) => parsed[i] ?? null);
    return slots;
  } catch {
    return Array.from({ length: slotCount }, () => null);
  }
}

export function writeSaveSlot(projectId: string, slotIndex: number, data: SaveSlotData, slotCount: number): void {
  if (typeof window === "undefined") return;
  const slots = loadSaveSlots(projectId, slotCount);
  slots[slotIndex] = data;
  localStorage.setItem(storageKey(projectId), JSON.stringify(slots));
}

export function clearSaveSlot(projectId: string, slotIndex: number, slotCount: number): void {
  if (typeof window === "undefined") return;
  const slots = loadSaveSlots(projectId, slotCount);
  slots[slotIndex] = null;
  localStorage.setItem(storageKey(projectId), JSON.stringify(slots));
}

export function formatSaveLabel(node: GraphNode | undefined, savedAt: string): string {
  const date = new Date(savedAt);
  const time = date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return node ? `${node.label} · ${time}` : time;
}
