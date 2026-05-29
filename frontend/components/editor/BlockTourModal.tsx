"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { BLOCK_TOUR, type BlockTourEntry } from "@/lib/block-tour";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlockTourModalProps = {
  open: boolean;
  onClose: () => void;
  initialType?: string;
};

export function BlockTourModal({ open, onClose, initialType }: BlockTourModalProps) {
  const [activeType, setActiveType] = useState(initialType ?? BLOCK_TOUR[0]?.type ?? "start");

  if (!open) return null;

  const active: BlockTourEntry =
    BLOCK_TOUR.find((b) => b.type === activeType) ?? BLOCK_TOUR[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--editor-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--editor-text)]">Справка по блокам</h2>
            <p className="text-sm text-[var(--editor-muted)]">Узнайте, для чего нужен каждый блок схемы</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-48 shrink-0 overflow-y-auto border-r border-[var(--editor-border)] bg-[var(--editor-surface-alt)] p-2">
            {BLOCK_TOUR.map((block) => (
              <button
                key={block.type}
                type="button"
                onClick={() => setActiveType(block.type)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition",
                  activeType === block.type
                    ? "bg-[var(--editor-surface-hover)] text-[var(--editor-text)]"
                    : "text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: block.color }}
                />
                {block.label}
              </button>
            ))}
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="rounded-lg px-3 py-1 text-sm font-semibold text-white"
                style={{ backgroundColor: active.color }}
              >
                {active.label}
              </span>
              <span className="text-sm text-[var(--editor-muted)]">{active.summary}</span>
            </div>

            <p className="mb-5 text-sm leading-relaxed text-[var(--editor-text)]">{active.description}</p>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--editor-muted)]">
              Советы
            </h3>
            <ul className="space-y-2">
              {active.tips.map((tip) => (
                <li
                  key={tip}
                  className="flex gap-2 text-sm text-[var(--editor-text)] before:shrink-0 before:text-indigo-400 before:content-['•']"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--editor-border)] px-5 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
