"use client";

import type { SaveSlot } from "@/lib/game-save";

type GameSaveSlotsViewProps = {
  title: string;
  mode: "save" | "load";
  slots: SaveSlot[];
  canSave: boolean;
  onSelectSlot: (index: number) => void;
  onDeleteSlot?: (index: number) => void;
  onBack: () => void;
};

export function GameSaveSlotsView({
  title,
  mode,
  slots,
  canSave,
  onSelectSlot,
  onDeleteSlot,
  onBack,
}: GameSaveSlotsViewProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 px-4 py-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button type="button" className="text-xs text-zinc-300 hover:text-white" onClick={onBack}>
          Назад
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mode === "save" && !canSave && (
          <p className="mb-2 text-xs text-amber-400">Начните игру, чтобы сохранить прогресс.</p>
        )}
        {slots.map((slot, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 p-2"
          >
            <button
              type="button"
              disabled={mode === "save" && !canSave}
              onClick={() => onSelectSlot(index)}
              className="min-w-0 flex-1 text-left text-xs text-zinc-200 hover:text-indigo-300 disabled:opacity-40"
            >
              <span className="font-medium">Слот {index + 1}</span>
              {slot ? (
                <span className="mt-0.5 block truncate text-[10px] text-zinc-500">{slot.label}</span>
              ) : (
                <span className="mt-0.5 block text-[10px] text-zinc-600">Пусто</span>
              )}
            </button>
            {slot && onDeleteSlot && (
              <button
                type="button"
                className="shrink-0 text-[10px] text-red-400 hover:text-red-300"
                onClick={() => onDeleteSlot(index)}
              >
                Удалить
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
