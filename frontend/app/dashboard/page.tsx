"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    retry: false,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects(),
    enabled: userQuery.isSuccess,
  });

  const createMutation = useMutation({
    mutationFn: (projectTitle: string) => api.createProject(projectTitle),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setTitle("");
      setShowForm(false);
      router.push(`/editor/${project.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title: newTitle }: { id: string; title: string }) =>
      api.updateProject(id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingId(null);
      setEditTitle("");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.duplicateProject(id),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/editor/${project.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  if (userQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-400">Загрузка...</div>;
  }

  if (userQuery.isError) {
    router.push("/login");
    return null;
  }

  const projectCount = projectsQuery.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Less Game Editor</h1>
            <p className="text-sm text-zinc-400">
              {userQuery.data?.email} · {projectCount} {projectCount === 1 ? "проект" : "проектов"}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={async () => {
              await api.logout();
              router.push("/login");
            }}
          >
            Выйти
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Мои проекты</h2>
            <p className="text-sm text-zinc-500">Создавайте и переключайтесь между несколькими играми</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} className="mr-2 inline" />
            Новый проект
          </Button>
        </div>

        {showForm && (
          <form
            className="mb-6 flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) createMutation.mutate(title.trim());
            }}
          >
            <Input
              placeholder="Название игры"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              Создать
            </Button>
          </form>
        )}

        {projectsQuery.isLoading && <p className="text-zinc-400">Загрузка проектов...</p>}

        {!projectsQuery.isLoading && projectCount === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center text-zinc-500">
            Проектов пока нет. Создайте первую игру!
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data?.map((project) => (
            <div
              key={project.id}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-indigo-500/50"
            >
              {editingId === project.id ? (
                <form
                  className="mb-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editTitle.trim()) {
                      updateMutation.mutate({ id: project.id, title: editTitle.trim() });
                    }
                  }}
                >
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
                  <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                    OK
                  </Button>
                </form>
              ) : (
                <>
                  <Link href={`/editor/${project.id}`} className="block">
                    <h3 className="mb-1 font-medium group-hover:text-indigo-300">{project.title}</h3>
                    <p className="text-xs text-zinc-500">Обновлён: {formatDate(project.updated_at)}</p>
                  </Link>
                </>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link href={`/editor/${project.id}`}>
                  <Button size="sm" variant="secondary">
                    Открыть
                  </Button>
                </Link>
                <button
                  type="button"
                  title="Переименовать"
                  onClick={() => {
                    setEditingId(project.id);
                    setEditTitle(project.title);
                  }}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  title="Дублировать"
                  onClick={() => duplicateMutation.mutate(project.id)}
                  disabled={duplicateMutation.isPending}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => {
                    if (confirm(`Удалить проект «${project.title}»?`)) deleteMutation.mutate(project.id);
                  }}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
