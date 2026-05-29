"use client";

import { Expand, Maximize2, Minimize2, Play, Shrink, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PreviewDebugPanel } from "@/components/editor/PreviewDebugPanel";
import { ResolutionSelect } from "@/components/editor/ResolutionSelect";
import type { Asset, GraphEdge, GraphNode, PreviewState, ProjectCharacter } from "@/lib/api";
import {
  advanceGame,
  createGameSession,
  selectGameChoice,
  type GameSession,
} from "@/lib/game-player";
import { getBlockTypeLabel } from "@/lib/preview";
import type { ScreenResolution } from "@/lib/screen-resolutions";

type ScenePreviewProps = {
  state: PreviewState | null;
  selectedNode: GraphNode | null;
  loading?: boolean;
  screenResolution: ScreenResolution;
  onScreenResolutionChange: (id: string) => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  assets: Asset[];
  characters: ProjectCharacter[];
};

type PreviewSize = "normal" | "large" | "fullscreen";

const PREVIEW_SCALE: Record<Exclude<PreviewSize, "fullscreen">, number> = {
  normal: 0.82,
  large: 0.95,
};

const REF_AREA = 1280 * 720;

const POSITION_CLASS: Record<string, string> = {
  left: "left-[10%]",
  center: "left-1/2 -translate-x-1/2",
  right: "right-[10%]",
};

function computeFrameSize(screenW: number, screenH: number, maxW: number, maxH: number) {
  const ratio = screenW / screenH;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

function getCharacterName(characters: ProjectCharacter[], id: string): string {
  return characters.find((c) => c.id === id)?.display_name ?? id;
}

function PreviewFrame({
  displayState,
  loading,
  isPlaying,
  gameSession,
  selectedNode,
  blockLabel,
  characters,
  screenResolution,
  frameSize,
  onFrameClick,
  onChoice,
}: {
  displayState: PreviewState | null;
  loading?: boolean;
  isPlaying: boolean;
  gameSession: GameSession | null;
  selectedNode: GraphNode | null;
  blockLabel: string | null;
  characters: ProjectCharacter[];
  screenResolution: ScreenResolution;
  frameSize: { width: number; height: number };
  onFrameClick: () => void;
  onChoice: (handle: string) => void;
}) {
  const hasBackground = Boolean(displayState?.background?.url);
  const hasContent =
    hasBackground || displayState?.dialogue || (displayState?.characters?.length ?? 0) > 0;

  return (
    <div
      role={isPlaying && gameSession?.wait === "click" ? "button" : undefined}
      tabIndex={isPlaying && gameSession?.wait === "click" ? 0 : undefined}
      onClick={onFrameClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onFrameClick();
      }}
      className={`relative shrink-0 overflow-hidden rounded-lg border-2 border-[var(--editor-border)] bg-black shadow-[var(--editor-shadow)] ${
        isPlaying && gameSession?.wait === "click" ? "cursor-pointer" : ""
      }`}
      style={{
        width: frameSize.width,
        height: frameSize.height,
      }}
    >
      <div className="absolute right-1 top-1 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
        {screenResolution.width}×{screenResolution.height}
      </div>
      {loading && !isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-sm text-zinc-300">
          Загрузка...
        </div>
      )}

      {hasBackground ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayState!.background!.url}
          alt="background"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />
      )}

      {displayState?.characters.map((char) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={char.character_id}
          src={char.url}
          alt={char.character_id}
          className={`absolute bottom-0 h-[75%] max-w-[35%] object-contain ${POSITION_CLASS[char.position] ?? POSITION_CLASS.center}`}
        />
      ))}

      {!isPlaying && selectedNode && (
        <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300">
          {blockLabel}: <span className="text-zinc-100">{selectedNode.label}</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-700/50 bg-black/80 p-2 backdrop-blur-sm">
        {isPlaying && gameSession?.wait === "choice" ? (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-amber-300">Выберите вариант:</div>
            {gameSession.choices.map((choice) => (
              <button
                key={choice.handle}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChoice(choice.handle);
                }}
                className="block w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-left text-[10px] text-zinc-100 hover:border-indigo-500"
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : displayState?.dialogue ? (
          <>
            <div className="text-[10px] font-semibold text-indigo-300">
              {getCharacterName(characters, displayState.dialogue.character)}
            </div>
            <div className="text-xs text-zinc-100">{displayState.dialogue.text || "..."}</div>
          </>
        ) : !hasContent && !isPlaying ? (
          <div className="text-[10px] text-zinc-500">Выберите блок на схеме</div>
        ) : isPlaying && gameSession?.wait === "ended" ? (
          <div className="text-[10px] text-zinc-400">Конец игры</div>
        ) : null}
      </div>
    </div>
  );
}

export function ScenePreview({
  state,
  selectedNode,
  loading,
  screenResolution,
  onScreenResolutionChange,
  nodes,
  edges,
  assets,
  characters,
}: ScenePreviewProps) {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("normal");
  const [viewport, setViewport] = useState({ w: 960, h: 540 });
  const [areaSize, setAreaSize] = useState({ w: 400, h: 200 });

  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setAreaSize({ w: Math.max(80, Math.floor(width - 8)), h: Math.max(60, Math.floor(height - 8)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const displayState = isPlaying && gameSession ? gameSession.state : state;
  const blockLabel = useMemo(
    () => (selectedNode ? getBlockTypeLabel(selectedNode.type) : null),
    [selectedNode],
  );

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth - 80, h: window.innerHeight - 120 });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const frameSize = useMemo(() => {
    if (previewSize === "fullscreen") {
      return computeFrameSize(
        screenResolution.width,
        screenResolution.height,
        Math.min(viewport.w, 960),
        Math.min(viewport.h, 540),
      );
    }
    const resolutionScale = Math.sqrt((screenResolution.width * screenResolution.height) / REF_AREA);
    const fitScale = PREVIEW_SCALE[previewSize] * Math.min(1.4, Math.max(0.85, resolutionScale));
    return computeFrameSize(
      screenResolution.width,
      screenResolution.height,
      areaSize.w * fitScale,
      areaSize.h * fitScale,
    );
  }, [previewSize, screenResolution, viewport, areaSize]);

  const startGame = useCallback(() => {
    const session = createGameSession(nodes, edges, assets);
    if (!session) return;
    setGameSession(session);
    setIsPlaying(true);
  }, [nodes, edges, assets]);

  const stopGame = useCallback(() => {
    setIsPlaying(false);
    setGameSession(null);
    musicRef.current?.pause();
    if (soundRef.current) soundRef.current.pause();
  }, []);

  const handleFrameClick = useCallback(() => {
    if (!isPlaying || !gameSession || gameSession.wait !== "click") return;
    setGameSession(advanceGame(gameSession, nodes, edges, assets));
  }, [isPlaying, gameSession, nodes, edges, assets]);

  useEffect(() => {
    if (!displayState?.music?.url || !musicRef.current) return;
    musicRef.current.src = displayState.music.url;
    musicRef.current.loop = displayState.music.loop ?? true;
    musicRef.current.play().catch(() => undefined);
  }, [displayState?.music?.url, displayState?.music?.loop]);

  useEffect(() => {
    if (!displayState?.sound?.url || !soundRef.current) return;
    soundRef.current.src = displayState.sound.url;
    soundRef.current.play().catch(() => undefined);
  }, [displayState?.sound?.url]);

  const canPlay = nodes.some((n) => n.type === "loading" || n.type === "start");

  const frameProps = {
    displayState,
    loading,
    isPlaying,
    gameSession,
    selectedNode,
    blockLabel,
    characters,
    screenResolution,
    frameSize,
    onFrameClick: handleFrameClick,
    onChoice: (handle: string) => {
      if (!gameSession) return;
      setGameSession(selectGameChoice(gameSession, handle, nodes, edges, assets));
    },
  };

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--editor-border)] px-2 py-1.5">
      <ResolutionSelect value={screenResolution.id} onChange={onScreenResolutionChange} />
      <span className="text-[10px] text-[var(--editor-muted)]">
        {screenResolution.width}×{screenResolution.height}
      </span>
      {!isPlaying ? (
        <Button type="button" size="sm" onClick={startGame} disabled={!canPlay} className="h-7 gap-1 px-2 text-xs">
          <Play size={12} /> Играть
        </Button>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={stopGame} className="h-7 gap-1 px-2 text-xs">
          <Square size={10} /> Стоп
        </Button>
      )}
    </div>
  );

  const sizeBtn =
    "inline-flex h-8 w-[7.5rem] items-center justify-center gap-1.5 text-[10px]";

  const sizeControls = (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-[var(--editor-border)] py-1.5">
      <Button
        type="button"
        size="sm"
        variant={previewSize === "normal" ? "primary" : "secondary"}
        className={sizeBtn}
        onClick={() => setPreviewSize("normal")}
      >
        <Shrink size={12} />
        Компакт
      </Button>
      <Button
        type="button"
        size="sm"
        variant={previewSize === "large" ? "primary" : "secondary"}
        className={sizeBtn}
        onClick={() => setPreviewSize("large")}
      >
        <Maximize2 size={12} />
        Крупнее
      </Button>
      <Button
        type="button"
        size="sm"
        variant={previewSize === "fullscreen" ? "primary" : "secondary"}
        className={sizeBtn}
        onClick={() => setPreviewSize((s) => (s === "fullscreen" ? "normal" : "fullscreen"))}
      >
        {previewSize === "fullscreen" ? (
          <>
            <Minimize2 size={12} />
            Свернуть
          </>
        ) : (
          <>
            <Expand size={12} />
            Полный
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-bg)]">
      {toolbar}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div ref={previewAreaRef} className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
            <div className="flex shrink-0 items-center justify-center">
              <PreviewFrame {...frameProps} />
            </div>
            <PreviewDebugPanel
              selectedNode={selectedNode}
              displayState={displayState}
              isPlaying={isPlaying}
              gameSession={gameSession}
            />
          </div>
          {sizeControls}
        </div>
      </div>

      {previewSize === "fullscreen" && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex flex-1 items-center justify-center">
            <PreviewFrame
              {...frameProps}
              frameSize={computeFrameSize(
                screenResolution.width,
                screenResolution.height,
                Math.min(viewport.w, 960),
                Math.min(viewport.h, 540),
              )}
            />
          </div>
          <div className="flex justify-center pb-4">{sizeControls}</div>
        </div>
      )}

      <audio ref={musicRef} className="hidden" />
      <audio ref={soundRef} className="hidden" />
    </div>
  );
}
