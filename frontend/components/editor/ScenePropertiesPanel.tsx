"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BLOCK_TYPES, type Asset, type CharacterEmotion, type GraphEdge, type ProjectCharacter } from "@/lib/api";
import { defaultEmotionsForCharacter, resolveCharacterSpriteAsset } from "@/lib/character-utils";
import { getBlockTypeLabel } from "@/lib/preview";
import { isProtectedEdge } from "@/lib/system-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isSystemBlockType } from "@/lib/system-blocks";
import type { GalleryConfig } from "@/lib/gallery";
import { useEditorStore } from "./store";

type ScenePropertiesPanelProps = {
  characters: ProjectCharacter[];
  gallery: GalleryConfig;
  onDeleteNode: (nodeId: string) => void;
  onDirty: () => void;
};

export function ScenePropertiesPanel({ characters, gallery, onDeleteNode, onDirty }: ScenePropertiesPanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const assets = useEditorStore((s) => s.assets);
  const selectedNodeIdValue = useEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId);
  const selectEdge = useEditorStore((s) => s.selectEdge);
  const setEdges = useEditorStore((s) => s.setEdges);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeIdValue) ?? null,
    [nodes, selectedNodeIdValue],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const edgeProtected = selectedEdge ? isProtectedEdge(selectedEdge, nodes) : false;

  const handleDeleteEdge = useCallback(() => {
    if (!selectedEdge || edgeProtected) return;
    setEdges(edges.filter((e) => e.id !== selectedEdge.id));
    selectEdge(null);
    onDirty();
  }, [selectedEdge, edgeProtected, edges, setEdges, selectEdge, onDirty]);

  const blockMeta = selectedNode ? BLOCK_TYPES.find((b) => b.type === selectedNode.type) : null;

  const sourceNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.source) : null;
  const targetNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.target) : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-[var(--editor-border)] p-4">
        {selectedEdge ? (
          <p className="text-xs text-[var(--editor-muted)]">
            <span className="font-medium text-indigo-300">Связь</span>
            {" · "}
            {sourceNode?.label ?? "?"} → {targetNode?.label ?? "?"}
          </p>
        ) : selectedNode ? (
          <p className="text-xs text-[var(--editor-muted)]">
            <span className="font-medium" style={{ color: blockMeta?.color }}>
              {getBlockTypeLabel(selectedNode.type)}
            </span>
            {" · "}
            {selectedNode.label}
          </p>
        ) : (
          <p className="text-xs text-[var(--editor-muted)]">Выберите блок или связь на схеме</p>
        )}
      </div>

      <div className="flex-1 p-4">
        {selectedEdge ? (
          <EdgePropertiesPanel
            edge={selectedEdge}
            sourceNode={sourceNode ?? undefined}
            targetNode={targetNode ?? undefined}
            protected={edgeProtected}
            onDelete={handleDeleteEdge}
          />
        ) : !selectedNode ? (
          <div className="rounded-lg border border-dashed border-[var(--editor-border)] p-6 text-center text-sm text-[var(--editor-muted)]">
            Кликните на блок или линию между блоками. Перетащите конец линии, чтобы переподключить её.
          </div>
        ) : (
          <>
            {!isSystemBlockType(selectedNode.type) && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onDeleteNode(selectedNode.id)}
                  className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                  Удалить блок
                </button>
              </div>
            )}

            <NodePropertiesForm
              key={selectedNode.id}
              node={selectedNode}
              assets={assets}
              characters={characters}
              gallery={gallery}
              allNodes={nodes}
              onUpdateData={(data) => {
                updateNodeData(selectedNode.id, data);
                onDirty();
              }}
              onUpdateLabel={(label) => {
                updateNodeLabel(selectedNode.id, label);
                onDirty();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function EdgePropertiesPanel({
  edge,
  sourceNode,
  targetNode,
  protected: isProtected,
  onDelete,
}: {
  edge: GraphEdge;
  sourceNode?: { label: string; type: string };
  targetNode?: { label: string; type: string };
  protected: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface-alt)]/50 p-3">
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Начало (источник)</Label>
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--editor-text)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
            {sourceNode ? (
              <>
                <span className="font-medium">{sourceNode.label}</span>
                <span className="text-xs text-[var(--editor-muted)]">
                  ({getBlockTypeLabel(sourceNode.type)})
                </span>
              </>
            ) : (
              edge.source
            )}
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-[var(--editor-muted)]">Конец (цель)</Label>
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--editor-text)]">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {targetNode ? (
              <>
                <span className="font-medium">{targetNode.label}</span>
                <span className="text-xs text-[var(--editor-muted)]">
                  ({getBlockTypeLabel(targetNode.type)})
                </span>
              </>
            ) : (
              edge.target
            )}
          </div>
        </div>
        {edge.sourceHandle && (
          <div>
            <Label className="text-[10px] text-[var(--editor-muted)]">Выход (handle)</Label>
            <p className="mt-1 font-mono text-xs text-indigo-300">{edge.sourceHandle}</p>
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-[var(--editor-muted)]">
        Перетащите <span className="text-indigo-300">синий</span> или{" "}
        <span className="text-emerald-300">зелёный</span> маркер на концах линии, чтобы переподключить
        связь к другому блоку.
      </p>

      {!isProtected ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} />
            Удалить связь
          </button>
        </div>
      ) : (
        <p className="text-xs text-amber-500">Системная связь — удаление и переподключение недоступны.</p>
      )}
    </div>
  );
}

const FORM_DEBOUNCE_MS = 400;

function useDebouncedNodeForm(
  nodeId: string,
  nodeData: Record<string, unknown>,
  nodeLabel: string,
  onUpdateData: (data: Record<string, unknown>) => void,
  onUpdateLabel: (label: string) => void,
) {
  const [localData, setLocalData] = useState(nodeData);
  const [localLabel, setLocalLabel] = useState(nodeLabel);
  const dataTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const labelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalData(nodeData);
    setLocalLabel(nodeLabel);
  }, [nodeId]);

  const setField = useCallback(
    (patch: Record<string, unknown>) => {
      setLocalData((prev) => {
        const next = { ...prev, ...patch };
        if (dataTimer.current) clearTimeout(dataTimer.current);
        dataTimer.current = setTimeout(() => onUpdateData(next), FORM_DEBOUNCE_MS);
        return next;
      });
    },
    [onUpdateData],
  );

  const setImmediate = useCallback(
    (patch: Record<string, unknown>) => {
      setLocalData((prev) => {
        const next = { ...prev, ...patch };
        onUpdateData(next);
        return next;
      });
    },
    [onUpdateData],
  );

  const setLabel = useCallback(
    (label: string) => {
      setLocalLabel(label);
      if (labelTimer.current) clearTimeout(labelTimer.current);
      labelTimer.current = setTimeout(() => onUpdateLabel(label), FORM_DEBOUNCE_MS);
    },
    [onUpdateLabel],
  );

  return { localData, localLabel, setField, setImmediate, setLabel };
}

function NodePropertiesForm({
  node,
  assets,
  characters,
  gallery,
  allNodes,
  onUpdateData,
  onUpdateLabel,
}: {
  node: { id: string; type: string; label: string; data: Record<string, unknown> };
  assets: Asset[];
  characters: ProjectCharacter[];
  gallery: GalleryConfig;
  allNodes: Array<{ id: string; label: string; type: string }>;
  onUpdateData: (data: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}) {
  const { localData, localLabel, setField, setImmediate, setLabel } = useDebouncedNodeForm(
    node.id,
    node.data,
    node.label,
    onUpdateData,
    onUpdateLabel,
  );
  const data = localData;

  return (
    <div className="space-y-3">
      {node.type !== "start" && !isSystemBlockType(node.type) && (
        <div>
          <Label>Метка (Ren'Py)</Label>
          <Input value={localLabel} onChange={(e) => setLabel(e.target.value)} />
        </div>
      )}

      {(node.type === "loading" || node.type === "main_menu" || node.type === "settings") && null}

      {node.type === "start" && (
        <>
          <p className="rounded-lg bg-green-950/30 px-3 py-2 text-xs text-green-300">
            Настройте, что игрок увидит при запуске игры
          </p>
          <div>
            <Label>Заголовок игры</Label>
            <Input
              value={String(data.title ?? "")}
              onChange={(e) => setField({ title: e.target.value })}
              placeholder="Название на экране старта"
            />
          </div>
          <AssetSelect
            label="Фон при старте"
            value={String(data.background_asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "background")}
            onChange={(v) => setImmediate({ background_asset_id: v })}
          />
          <AssetSelect
            label="Музыка при старте"
            value={String(data.music_asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "music")}
            onChange={(v) => setImmediate({ music_asset_id: v })}
          />
          <CharacterSelect
            label="Кто говорит (вступление)"
            value={String(data.intro_character ?? "narrator")}
            characters={characters}
            onChange={(v) => setImmediate({ intro_character: v })}
          />
          <div>
            <Label>Вступительный текст</Label>
            <Textarea
              rows={4}
              value={String(data.intro_text ?? "")}
              onChange={(e) => setField({ intro_text: e.target.value })}
              placeholder="Первые слова при начале игры..."
            />
          </div>
        </>
      )}

      {node.type === "scene" && (
        <>
          <AssetSelect
            label="Фон"
            value={String(data.asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "background")}
            onChange={(v) => setImmediate({ asset_id: v })}
          />
          <div>
            <Label>Переход</Label>
            <Select
              value={String(data.transition ?? "dissolve")}
              onChange={(e) => setImmediate({ transition: e.target.value })}
            >
              <option value="dissolve">Dissolve</option>
              <option value="fade">Fade</option>
              <option value="pixellate">Pixellate</option>
            </Select>
          </div>
        </>
      )}

      {node.type === "dialogue" && (
        <>
          <CharacterSelect
            label="Персонаж"
            value={String(data.character ?? "narrator")}
            characters={characters}
            onChange={(v) => {
              const char = characters.find((c) => c.id === v);
              setImmediate({
                character: v,
                emotion_id: char?.default_emotion_id ?? "",
              });
            }}
          />
          <EmotionField
            character={characters.find((c) => c.id === String(data.character ?? "narrator"))}
            value={String(data.emotion_id ?? "")}
            onChange={(emotionId) => setImmediate({ emotion_id: emotionId })}
            allowEmpty
            emptyLabel="— без смены спрайта —"
          />
          <div>
            <Label>Эффект перед репликой</Label>
            <Select
              value={String(data.effect_type ?? "")}
              onChange={(e) => setImmediate({ effect_type: e.target.value })}
            >
              <option value="">— без эффекта —</option>
              <option value="dissolve">Dissolve</option>
              <option value="fade">Fade</option>
              <option value="shake">Shake</option>
            </Select>
          </div>
          {data.effect_type === "fade" && (
            <div>
              <Label>Длительность fade (сек)</Label>
              <Input
                type="number"
                step="0.1"
                value={Number((data.effect_params as { duration?: number })?.duration ?? 1)}
                onChange={(e) =>
                  setField({
                    effect_params: {
                      ...(data.effect_params as object),
                      duration: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          )}
          <div>
            <Label>Реплика</Label>
            <Textarea
              rows={5}
              value={String(data.text ?? "")}
              onChange={(e) => setField({ text: e.target.value })}
              placeholder="Текст диалога..."
            />
          </div>
          <AssetSelect
            label="Озвучка (опционально)"
            value={String(data.voice_asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "voice" || a.kind === "sound")}
            onChange={(v) => setImmediate({ voice_asset_id: v })}
          />
        </>
      )}

      {node.type === "show_character" && (
        <>
          <CharacterSelect
            label="Персонаж"
            value={String(data.character_id ?? "hero")}
            characters={characters.filter((c) => c.id !== "narrator")}
            onChange={(v) => {
              const char = characters.find((c) => c.id === v);
              const emotionId = char?.default_emotion_id ?? "neutral";
              const assetId = resolveCharacterSpriteAsset(char, { emotion_id: emotionId });
              setImmediate({
                character_id: v,
                emotion_id: emotionId,
                asset_id: assetId ?? "",
              });
            }}
          />
          <EmotionField
            character={characters.find((c) => c.id === String(data.character_id ?? "hero"))}
            value={String(data.emotion_id ?? "")}
            onChange={(emotionId) => {
              const char = characters.find((c) => c.id === String(data.character_id ?? "hero"));
              const assetId = resolveCharacterSpriteAsset(char, { emotion_id: emotionId });
              setImmediate({ emotion_id: emotionId, asset_id: assetId ?? "" });
            }}
          />
          {(() => {
            const char = characters.find((c) => c.id === String(data.character_id ?? "hero"));
            const emotions = char?.emotions ?? [];
            if (emotions.length === 0) {
              return (
                <AssetSelect
                  label="Спрайт (если нет эмоций)"
                  value={String(data.asset_id ?? "")}
                  assets={assets.filter((a) => a.kind === "character")}
                  onChange={(v) => setImmediate({ asset_id: v, emotion_id: "" })}
                />
              );
            }
            return null;
          })()}
          <div>
            <Label>Позиция</Label>
            <Select
              value={String(data.position ?? "center")}
              onChange={(e) => setImmediate({ position: e.target.value })}
            >
              <option value="left">Слева</option>
              <option value="center">По центру</option>
              <option value="right">Справа</option>
            </Select>
          </div>
        </>
      )}

      {node.type === "hide_character" && (
        <CharacterSelect
          label="Скрыть персонажа"
          value={String(data.character_id ?? "hero")}
          characters={characters.filter((c) => c.id !== "narrator")}
          onChange={(v) => setImmediate({ character_id: v })}
        />
      )}

      {node.type === "music" && (
        <>
          <AssetSelect
            label="Трек"
            value={String(data.asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "music")}
            onChange={(v) => setImmediate({ asset_id: v })}
          />
          <div>
            <Label>Fade in (сек)</Label>
            <Input
              type="number"
              value={Number(data.fade ?? 0)}
              onChange={(e) => setField({ fade: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--editor-text)]">
            <input
              type="checkbox"
              checked={Boolean(data.loop ?? true)}
              onChange={(e) => setImmediate({ loop: e.target.checked })}
            />
            Зациклить
          </label>
        </>
      )}

      {node.type === "sound" && (
        <AssetSelect
          label="Звук"
          value={String(data.asset_id ?? "")}
          assets={assets.filter((a) => a.kind === "sound")}
          onChange={(v) => setImmediate({ asset_id: v })}
        />
      )}

      {node.type === "effect" && (
        <>
          <div>
            <Label>Тип эффекта</Label>
            <Select
              value={String(data.effect_type ?? "dissolve")}
              onChange={(e) => setImmediate({ effect_type: e.target.value })}
            >
              <option value="dissolve">Dissolve</option>
              <option value="fade">Fade</option>
              <option value="shake">Shake</option>
            </Select>
          </div>
          {data.effect_type === "fade" && (
            <div>
              <Label>Длительность</Label>
              <Input
                type="number"
                step="0.1"
                value={Number((data.params as { duration?: number })?.duration ?? 1)}
                onChange={(e) =>
                  setField({ params: { ...(data.params as object), duration: Number(e.target.value) } })
                }
              />
            </div>
          )}
        </>
      )}

      {node.type === "set_variable" && (
        <>
          <div>
            <Label>Имя</Label>
            <Input value={String(data.name ?? "var")} onChange={(e) => setField({ name: e.target.value })} />
          </div>
          <div>
            <Label>Значение</Label>
            <Input value={String(data.value ?? "")} onChange={(e) => setField({ value: e.target.value })} />
          </div>
        </>
      )}

      {node.type === "condition" && (
        <div>
          <Label>Выражение</Label>
          <Input
            value={String(data.expression ?? "True")}
            onChange={(e) => setField({ expression: e.target.value })}
            placeholder="score > 0"
          />
          <p className="mt-1 text-xs text-[var(--editor-muted)]">Выходы: true (слева), false (справа)</p>
        </div>
      )}

      {node.type === "jump" && (
        <div>
          <Label>Целевая метка</Label>
          <Select
            value={String(data.target_label ?? "")}
            onChange={(e) => setImmediate({ target_label: e.target.value })}
          >
            <option value="">—</option>
            {allNodes
              .filter((n) => n.type === "label" || n.type === "start")
              .map((n) => (
                <option key={n.id} value={n.label}>
                  {n.label}
                </option>
              ))}
          </Select>
        </div>
      )}

      {node.type === "choice" && (
        <ChoiceEditor
          options={
            (data.options as Array<{ handle: string; text: string; highlight?: boolean }>) ?? []
          }
          onChange={(options) => setField({ options })}
        />
      )}

      {node.type === "label" && (
        <div>
          <Label>Имя метки</Label>
          <Input
            value={String(data.name ?? node.label)}
            onChange={(e) => setField({ name: e.target.value })}
          />
        </div>
      )}

      {node.type === "unlock_cg" && (
        <div>
          <Label>CG для открытия</Label>
          <Select
            value={String(data.item_id ?? "")}
            onChange={(e) => setField({ item_id: e.target.value })}
          >
            <option value="">— выберите —</option>
            {gallery.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          {gallery.items.length === 0 && (
            <p className="mt-1 text-xs text-amber-500">Добавьте изображения в «Галерея»</p>
          )}
        </div>
      )}
    </div>
  );
}

function EmotionField({
  character,
  value,
  onChange,
  allowEmpty,
  emptyLabel = "— не выбрано —",
}: {
  character?: ProjectCharacter;
  value: string;
  onChange: (emotionId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  if (!character || character.id === "narrator") return null;
  const emotions = character.emotions?.length ? character.emotions : defaultEmotionsForCharacter();
  return (
    <div>
      <Label>Эмоция (Ren&apos;Py)</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {emotions.map((emotion) => (
          <option key={emotion.ui_key ?? emotion.id} value={emotion.id}>
            {emotion.label} ({emotion.id}){emotion.asset_id ? "" : " — нет спрайта"}
          </option>
        ))}
      </Select>
      {emotions.every((e) => !e.asset_id) && (
        <p className="mt-1 text-xs text-amber-500">Назначьте спрайты эмоциям в «Персонажи»</p>
      )}
    </div>
  );
}

function CharacterSelect({
  label,
  value,
  characters,
  onChange,
}: {
  label: string;
  value: string;
  characters: ProjectCharacter[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.display_name} ({c.id})
          </option>
        ))}
      </Select>
    </div>
  );
}

function AssetSelect({
  label,
  value,
  assets,
  onChange,
}: {
  label: string;
  value: string;
  assets: Asset[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— не выбрано —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.filename}
          </option>
        ))}
      </Select>
      {assets.length === 0 && (
        <p className="mt-1 text-xs text-[var(--editor-muted)]">Загрузите файлы во вкладке «Медиа»</p>
      )}
    </div>
  );
}

function ChoiceEditor({
  options,
  onChange,
}: {
  options: Array<{ handle: string; text: string; highlight?: boolean }>;
  onChange: (options: Array<{ handle: string; text: string; highlight?: boolean }>) => void;
}) {
  const [localOptions, setLocalOptions] = useState(options);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = useCallback(
    (next: Array<{ handle: string; text: string; highlight?: boolean }>) => {
      setLocalOptions(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(next), FORM_DEBOUNCE_MS);
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      <Label>Варианты выбора</Label>
      {localOptions.map((opt, i) => (
        <div
          key={opt.handle || i}
          className={`space-y-2 rounded-lg border p-2 ${
            opt.highlight
              ? "border-amber-500/60 bg-amber-500/10"
              : "border-[var(--editor-border)]"
          }`}
        >
          <Input
            value={opt.text}
            onChange={(e) => {
              const next = [...localOptions];
              next[i] = { ...next[i], text: e.target.value };
              commit(next);
            }}
            placeholder={`Вариант ${i + 1}`}
          />
          <label className="flex items-center gap-2 text-xs text-[var(--editor-muted)]">
            <input
              type="checkbox"
              checked={Boolean(opt.highlight)}
              onChange={(e) => {
                const next = [...localOptions];
                next[i] = { ...next[i], highlight: e.target.checked };
                setLocalOptions(next);
                onChange(next);
              }}
            />
            Подсветить как рекомендуемый / «правильный»
          </label>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = localOptions.filter((_, idx) => idx !== i);
                setLocalOptions(next);
                onChange(next);
              }}
            >
              Удалить
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const next = [
            ...localOptions,
            {
              handle: `option_${localOptions.length}`,
              text: `Вариант ${localOptions.length + 1}`,
              highlight: false,
            },
          ];
          setLocalOptions(next);
          onChange(next);
        }}
      >
        + Вариант
      </Button>
    </div>
  );
}
