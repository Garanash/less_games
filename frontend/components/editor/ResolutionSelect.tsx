"use client";

import { ChevronDown, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { getScreenResolution, SCREEN_RESOLUTIONS } from "@/lib/screen-resolutions";

type ResolutionSelectProps = {
  value: string;
  onChange: (id: string) => void;
};

export function ResolutionSelect({ value, onChange }: ResolutionSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = getScreenResolution(value);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface)] px-2 py-1.5 text-xs text-[var(--editor-text)] shadow-[var(--editor-shadow)] hover:bg-[var(--editor-surface-hover)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Monitor size={14} className="shrink-0 text-[var(--editor-muted)]" />
        <span className="whitespace-nowrap">
          {current.label} — <span className="text-[var(--editor-muted)]">{current.hint}</span>
        </span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-[var(--editor-muted)] transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface)] py-1 shadow-lg"
        >
          {SCREEN_RESOLUTIONS.map((res) => {
            const selected = res.id === value;
            return (
              <li key={res.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(res.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left text-xs transition-colors",
                    selected
                      ? "bg-indigo-600 text-white"
                      : "text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]",
                  )}
                >
                  <span className="font-medium">{res.label}</span>
                  <span className={selected ? "text-indigo-100" : "text-[var(--editor-muted)]"}>
                    {res.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
