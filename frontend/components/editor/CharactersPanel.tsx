"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import type { Asset, CharacterEmotion, ProjectCharacter } from "@/lib/api";
import {
  DEFAULT_EMOTION_ID,
  defaultEmotionsForCharacter,
  normalizeCharacterEmotions,
  renameEmotionInCharacter,
  sanitizeEmotionId,
} from "@/lib/character-utils";
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

type EmotionRowProps = {
  emotion: CharacterEmotion;
  char: ProjectCharacter;
  index: number;
  characterSprites: Asset[];
  canRemove: boolean;
  onPatch: (uiKey: string, patch: Partial<CharacterEmotion>) => void;
  onCommitId: (uiKey: string, rawId: string) => void;
  onRemove: (uiKey: string) => void;
  onSetDefault: (emotionId: string) => void;
};

function EmotionRow({
  emotion,
  char,
  index,
  characterSprites,
  canRemove,
  onPatch,
  onCommitId,
  onRemove,
  onSetDefault,
}: EmotionRowProps) {
  const [idDraft, setIdDraft] = useState(emotion.id);

  useEffect(() => {
    setIdDraft(emotion.id);
  }, [emotion.id]);

  return (
    <div className="grid gap-2 rounded-lg border border-[var(--editor-border)] p-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Название</Label>
          <Input
            value={emotion.label}
            onChange={(e) => onPatch(emotion.ui_key!, { label: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px]">ID (Ren&apos;Py)</Label>
          <Input
            value={idDraft}
            onChange={(e) => setIdDraft(e.target.value)}
            onBlur={() => onCommitId(emotion.ui_key!, idDraft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="happy, sad, angry…"
          />
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Спрайт</Label>
        <Select
          value={emotion.asset_id}
          onChange={(e) => onPatch(emotion.ui_key!, { asset_id: e.target.value })}
        >
          <option value="">— не выбран —</option>
          {characterSprites.map((a) => (
            <option key={a.id} value={a.id}>
              {a.filename}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
          <input
            type="radio"
            name={`default-emotion-${char.id}`}
            checked={char.default_emotion_id === emotion.id}
            onChange={() => onSetDefault(emotion.id)}
          />
          По умолчанию
        </label>
        {canRemove && (
          <button
            type="button"
            className="text-xs text-red-400 hover:text-red-300"
            onClick={() => onRemove(emotion.ui_key!)}
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}

export function CharactersPanel({ characters, assets, onChange }: CharactersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const characterSprites = assets.filter((a) => a.kind === "character");

  const patchCharacters = (next: ProjectCharacter[]) => {
    onChange(next.map(normalizeCharacterEmotions));
  };

  const addCharacter = () => {
    const id = `char_${characters.length + 1}`;
    const emotions = defaultEmotionsForCharacter();
    patchCharacters([
      ...characters,
      {
        id,
        display_name: `Персонаж ${characters.length + 1}`,
        color: "#c8ffc8",
        emotions,
        default_emotion_id: DEFAULT_EMOTION_ID,
      },
    ]);
    setEditingId(id);
  };

  const updateCharacter = (id: string, patch: Partial<ProjectCharacter>) => {
    patchCharacters(characters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateEmotion = (charId: string, uiKey: string, patch: Partial<CharacterEmotion>) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    const emotions = (char.emotions ?? []).map((e) =>
      e.ui_key === uiKey ? { ...e, ...patch } : e,
    );
    updateCharacter(charId, { emotions });
  };

  const commitEmotionId = (charId: string, uiKey: string, rawId: string) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    const index = (char.emotions ?? []).findIndex((e) => e.ui_key === uiKey);
    const nextId = sanitizeEmotionId(rawId, Math.max(index, 0));
    patchCharacters(
      characters.map((c) => (c.id === charId ? renameEmotionInCharacter(c, uiKey, nextId) : c)),
    );
  };

  const addEmotion = (charId: string) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    const emotions = [...(char.emotions ?? defaultEmotionsForCharacter())];
    const label = `Эмоция ${emotions.length + 1}`;
    emotions.push({
      ui_key: uuidv4(),
      id: sanitizeEmotionId(label, emotions.length),
      label,
      asset_id: "",
    });
    updateCharacter(charId, { emotions });
  };

  const removeEmotion = (charId: string, uiKey: string) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    updateCharacter(charId, {
      emotions: (char.emotions ?? []).filter((e) => e.ui_key !== uiKey),
    });
  };

  const removeCharacter = (id: string) => {
    if (id === "narrator") {
      alert("Рассказчика нельзя удалить");
      return;
    }
    if (confirm("Удалить персонажа?")) {
      patchCharacters(characters.filter((c) => c.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--editor-border)] p-4">
        <p className="text-xs text-[var(--editor-muted)]">
          Эмоции → Ren&apos;Py: <code className="text-[10px]">layeredimage</code> и{" "}
          <code className="text-[10px]">show hero happy</code>
        </p>
        <Button size="sm" onClick={addCharacter}>
          <Plus size={14} className="mr-1" />
          Добавить
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {characters.map((char) => {
          const emotions = char.emotions ?? defaultEmotionsForCharacter();
          return (
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

                  {char.id !== "narrator" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Эмоции / спрайты</Label>
                        <Button type="button" size="sm" variant="secondary" onClick={() => addEmotion(char.id)}>
                          <Plus size={12} className="mr-1" />
                          Эмоция
                        </Button>
                      </div>
                      {emotions.map((emotion, index) => (
                        <EmotionRow
                          key={emotion.ui_key ?? `${char.id}-${index}`}
                          emotion={emotion}
                          char={char}
                          index={index}
                          characterSprites={characterSprites}
                          canRemove={emotions.length > 1}
                          onPatch={(uiKey, patch) => updateEmotion(char.id, uiKey, patch)}
                          onCommitId={(uiKey, rawId) => commitEmotionId(char.id, uiKey, rawId)}
                          onRemove={(uiKey) => removeEmotion(char.id, uiKey)}
                          onSetDefault={(emotionId) =>
                            updateCharacter(char.id, { default_emotion_id: emotionId })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
