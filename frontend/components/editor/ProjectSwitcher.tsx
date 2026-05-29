"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProjectSwitcherProps = {
  currentProjectId: string;
  currentTitle: string;
};

export function ProjectSwitcher({ currentProjectId, currentTitle }: ProjectSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--editor-btn-secondary-border)] bg-[var(--editor-btn-secondary-bg)] px-3 py-1.5 text-sm text-[var(--editor-btn-secondary-text)] shadow-[var(--editor-shadow)] hover:bg-[var(--editor-surface-hover)]"
      >
        <FolderOpen size={16} className="shrink-0 text-indigo-500" />
        <span className="max-w-[200px] truncate">{currentTitle}</span>
        <ChevronDown size={14} className="shrink-0 text-[var(--editor-muted)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] py-2 shadow-lg">
            <div className="border-b border-[var(--editor-border)] px-3 pb-2 text-xs uppercase tracking-wide text-[var(--editor-muted)]">
              Проекты ({projects.length})
            </div>
            <div className="max-h-64 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (project.id !== currentProjectId) {
                      router.push(`/editor/${project.id}`);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[var(--editor-surface-hover)]",
                    project.id === currentProjectId
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                      : "text-[var(--editor-text)]",
                  )}
                >
                  <span className="truncate">{project.title}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--editor-border)] p-2">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--editor-text)] hover:bg-[var(--editor-surface-hover)]"
              >
                <Plus size={14} />
                Все проекты / создать
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
