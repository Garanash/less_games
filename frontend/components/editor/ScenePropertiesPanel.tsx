"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BLOCK_TYPES, type Asset, type ProjectCharacter } from "@/lib/api";
import { getBlockTypeLabel } from "@/lib/preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isSystemBlockType } from "@/lib/system-blocks";
import { useEditorStore } from "./store";

type ScenePropertiesPanelProps = {
  characters: ProjectCharacter[];
  onDeleteNode: (nodeId: string) => void;
  onDirty: () => void;
};

export function ScenePropertiesPanel({ characters, onDeleteNode, onDirty }: ScenePropertiesPanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const assets = useEditorStore((s) => s.assets);
  const selectedNodeIdValue = useEditorStore((s) => s.selectedNodeId);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const updateNodeLabel = useEditorStore((s) => s.updateNodeLabel);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeIdValue) ?? null,
    [nodes, selectedNodeIdValue],
  );

  const blockMeta = selectedNode ? BLOCK_TYPES.find((b) => b.type === selectedNode.type) : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-[var(--editor-border)] p-4">
        {selectedNode ? (
          <p className="text-xs text-[var(--editor-muted)]">
            <span className="font-medium" style={{ color: blockMeta?.color }}>
              {getBlockTypeLabel(selectedNode.type)}
            </span>
            {" · "}
            {selectedNode.label}
          </p>
        ) : (
          <p className="text-xs text-[var(--editor-muted)]">Выберите блок на схеме</p>
        )}
      </div>

      <div className="flex-1 p-4">
        {!selectedNode ? (
          <div className="rounded-lg border border-dashed border-[var(--editor-border)] p-6 text-center text-sm text-[var(--editor-muted)]">
            Кликните на блок схемы для настройки. Медиа загружайте во вкладке «Медиа».
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
  allNodes,
  onUpdateData,
  onUpdateLabel,
}: {
  node: { id: string; type: string; label: string; data: Record<string, unknown> };
  assets: Asset[];
  characters: ProjectCharacter[];
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

      {(node.type === "loading" || node.type === "main_menu" || node.type === "settings") && (
        <p className="rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface-alt)] px-3 py-2 text-xs text-[var(--editor-muted)]">
          Внешний вид и элементы этого экрана настраиваются во вкладке «Экраны» в шапке редактора.
        </p>
      )}

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
            onChange={(v) => setImmediate({ character: v })}
          />
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
              setImmediate({
                character_id: v,
                asset_id: char?.default_sprite_asset_id ?? data.asset_id,
              });
            }}
          />
          <AssetSelect
            label="Спрайт"
            value={String(data.asset_id ?? "")}
            assets={assets.filter((a) => a.kind === "character")}
            onChange={(v) => setImmediate({ asset_id: v })}
          />
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
          options={(data.options as Array<{ handle: string; text: string }>) ?? []}
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
  options: Array<{ handle: string; text: string }>;
  onChange: (options: Array<{ handle: string; text: string }>) => void;
}) {
  const [localOptions, setLocalOptions] = useState(options);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = useCallback(
    (next: Array<{ handle: string; text: string }>) => {
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
        <div key={opt.handle || i} className="flex gap-2">
          <Input
            value={opt.text}
            onChange={(e) => {
              const next = [...localOptions];
              next[i] = { ...next[i], text: e.target.value };
              commit(next);
            }}
            placeholder={`Вариант ${i + 1}`}
          />
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
            ×
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const next = [
            ...localOptions,
            { handle: `option_${localOptions.length}`, text: `Вариант ${localOptions.length + 1}` },
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
