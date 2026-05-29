"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EditorModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
};

export function EditorModal({ open, onClose, title, subtitle, children, wide }: EditorModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] shadow-2xl",
          wide ? "max-w-4xl" : "max-w-2xl",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--editor-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--editor-text)]">{title}</h2>
            {subtitle && <p className="text-sm text-[var(--editor-muted)]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)]"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="flex shrink-0 justify-end border-t border-[var(--editor-border)] px-5 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
