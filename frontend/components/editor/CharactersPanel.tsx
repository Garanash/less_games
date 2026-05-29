"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Asset, ProjectCharacter } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CharactersPanelProps = {
  characters: ProjectCharacter[];
  assets: Asset[];
  onChange: (characters: ProjectCharacter[]) => void;
};

export function CharactersPanel({ characters, assets, onChange }: CharactersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const characterSprites = assets.filter((a) => a.kind === "character");

  const addCharacter = () => {
    const id = `char_${characters.length + 1}`;
    onChange([
      ...characters,
      { id, display_name: `Персонаж ${characters.length + 1}`, color: "#c8ffc8" },
    ]);
    setEditingId(id);
  };

  const updateCharacter = (id: string, patch: Partial<ProjectCharacter>) => {
    onChange(characters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCharacter = (id: string) => {
    if (id === "narrator") {
      alert("Рассказчика нельзя удалить");
      return;
    }
    if (confirm("Удалить персонажа?")) {
      onChange(characters.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--editor-border)] p-4">
        <p className="text-xs text-[var(--editor-muted)]">Используются в блоках «Диалог» и «Показать»</p>
        <Button size="sm" onClick={addCharacter}>
          <Plus size={14} className="mr-1" />
          Добавить
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {characters.map((char) => (
          <div
            key={char.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              editingId === char.id
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-[var(--editor-border)] bg-[var(--editor-surface-alt)]",
            )}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between text-left"
              onClick={() => setEditingId(editingId === char.id ? null : char.id)}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: char.color }} />
                <span className="font-medium text-[var(--editor-text)]">{char.display_name}</span>
                <span className="text-xs text-[var(--editor-muted)]">({char.id})</span>
              </div>
              {char.id !== "narrator" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCharacter(char.id);
                  }}
                  className="text-[var(--editor-muted)] hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </button>

            {editingId === char.id && (
              <div className="mt-3 space-y-3 border-t border-[var(--editor-border)] pt-3">
                <div>
                  <Label>ID (Ren&apos;Py)</Label>
                  <Input value={char.id} disabled className="opacity-60" />
                </div>
                <div>
                  <Label>Имя в диалогах</Label>
                  <Input
                    value={char.display_name}
                    onChange={(e) => updateCharacter(char.id, { display_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Цвет имени</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={char.color}
                      onChange={(e) => updateCharacter(char.id, { color: e.target.value })}
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={char.color}
                      onChange={(e) => updateCharacter(char.id, { color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Спрайт по умолчанию</Label>
                  <Select
                    value={char.default_sprite_asset_id ?? ""}
                    onChange={(e) =>
                      updateCharacter(char.id, { default_sprite_asset_id: e.target.value || undefined })
                    }
                  >
                    <option value="">— не выбран —</option>
                    {characterSprites.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.filename}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
