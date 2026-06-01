"use client";

import { Expand, Loader2, Maximize2, Minimize2, Play, Shrink, Square, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { GameGalleryView } from "@/components/editor/GameGalleryView";
import { GameSaveSlotsView } from "@/components/editor/GameSaveSlotsView";
import { GameScreenView } from "@/components/editor/GameScreenView";
import { PreviewDebugPanel } from "@/components/editor/PreviewDebugPanel";
import { ResolutionSelect } from "@/components/editor/ResolutionSelect";
import type { Asset, GraphEdge, GraphNode, PreviewState, ProjectCharacter } from "@/lib/api";
import {
  advanceGame,
  applyCheatToSession,
  createGameSession,
  handleGalleryBack,
  handleMenuAction as applyMenuAction,
  handleSaveScreenBack,
  handleSettingsBack,
  openInGameLoad,
  openInGameSave,
  restoreSessionFromSave,
  selectGameChoice,
  sessionToSaveData,
  type GameSession,
  type PlayContext,
} from "@/lib/game-player";
import { COMPILE_STEPS, runCompileAnimation, validateGameForPlay } from "@/lib/game-compile";
import type { GalleryConfig, SaveConfig } from "@/lib/gallery";
import { DEFAULT_LAYOUT } from "@/lib/editor-layout-storage";
import { clearSaveSlot, formatSaveLabel, loadSaveSlots, writeSaveSlot } from "@/lib/game-save";
import type { GameScreensConfig } from "@/lib/game-screens";
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
  gameScreens: GameScreensConfig;
  projectTitle: string;
  projectId: string;
  gallery: GalleryConfig;
  saveConfig: SaveConfig;
  onTogglePreviewCollapse?: () => void;
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

function assetMime(assets: Asset[], assetId: string): string | undefined {
  return assets.find((a) => a.id === assetId)?.mime_type;
}

function isVideoMime(mime?: string): boolean {
  return Boolean(mime?.startsWith("video/"));
}

function BackgroundImage({ src, alt = "" }: { src: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain object-center" />
  );
}

function BackgroundMedia({ assets, assetId, url }: { assets: Asset[]; assetId?: string; url: string }) {
  const mime = assetId ? assetMime(assets, assetId) : undefined;
  if (isVideoMime(mime)) {
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
    );
  }
  return <BackgroundImage src={url} alt="background" />;
}

function VnDialogueBox({
  characterId,
  text,
  characters,
}: {
  characterId: string;
  text: string;
  characters: ProjectCharacter[];
}) {
  const accent = characters.find((c) => c.id === characterId)?.color ?? "#f472b6";
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 px-5 py-4 backdrop-blur-[2px]">
      <div className="mb-1.5 text-sm font-bold tracking-wide" style={{ color: accent }}>
        {getCharacterName(characters, characterId)}
      </div>
      <p className="text-[15px] leading-relaxed text-white">{text || "..."}</p>
    </div>
  );
}

function VnChoiceMenu({
  choices,
  onChoice,
}: {
  choices: Array<{ handle: string; text: string; highlight?: boolean }>;
  onChoice: (handle: string) => void;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-[min(440px,88%)] overflow-hidden bg-white/80 shadow-2xl backdrop-blur-md">
        {choices.map((choice, index) => (
          <div key={choice.handle}>
            {index > 0 && <div className="mx-5 h-px bg-slate-400/45" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChoice(choice.handle);
              }}
              className="w-full px-5 py-3.5 text-center text-[13px] font-medium leading-snug text-slate-800 transition hover:bg-white/95"
            >
              {choice.highlight && <span className="text-amber-600">★ </span>}
              {choice.text}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
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
  onMenuAction,
  onSettingsBack,
  onGalleryBack,
  onSaveScreenBack,
  onSaveSlot,
  onDeleteSaveSlot,
  gallery,
  saveConfig,
  projectId,
  gameScreens,
  projectTitle,
  assets,
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
  onMenuAction: (action: "start" | "settings" | "load" | "save" | "gallery" | "quit") => void;
  onSettingsBack: () => void;
  onGalleryBack: () => void;
  onSaveScreenBack: () => void;
  onSaveSlot: (index: number) => void;
  onDeleteSaveSlot: (index: number) => void;
  gallery: GalleryConfig;
  saveConfig: SaveConfig;
  projectId: string;
  gameScreens: GameScreensConfig;
  projectTitle: string;
  assets: Asset[];
}) {
  const uiScreen = displayState?.uiScreen;
  const showClassicScreen = isPlaying && uiScreen && ["loading", "main_menu", "settings"].includes(uiScreen);
  const showGallery = isPlaying && uiScreen === "gallery" && gameSession;
  const showSaveSlots = isPlaying && (uiScreen === "save" || uiScreen === "load") && gameSession;
  const showSystemScreen = showClassicScreen || showGallery || showSaveSlots;
  const canAdvanceOnClick = isPlaying && gameSession?.wait === "click";
  const hasBackground = Boolean(displayState?.background?.url);
  const hasContent =
    hasBackground || displayState?.dialogue || (displayState?.characters?.length ?? 0) > 0;

  return (
    <div
      role={canAdvanceOnClick ? "button" : undefined}
      tabIndex={canAdvanceOnClick ? 0 : undefined}
      onClick={() => {
        if (canAdvanceOnClick && (uiScreen === "loading" || !showSystemScreen)) onFrameClick();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (canAdvanceOnClick && (uiScreen === "loading" || !showSystemScreen)) onFrameClick();
      }}
      className={`relative shrink-0 overflow-hidden rounded-lg border-2 border-[var(--editor-border)] bg-black shadow-[var(--editor-shadow)] ${
        canAdvanceOnClick && (uiScreen === "loading" || !showSystemScreen) ? "cursor-pointer" : ""
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

      {hasBackground && !showSystemScreen ? (
        <BackgroundMedia
          assets={assets}
          assetId={displayState!.background!.asset_id}
          url={displayState!.background!.url}
        />
      ) : !showSystemScreen ? (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-zinc-950" />
      ) : null}

      {!showSystemScreen &&
        displayState?.characters.map((char) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={char.character_id}
          src={char.url}
          alt={char.character_id}
          className={`absolute bottom-0 h-[75%] max-w-[35%] object-contain ${POSITION_CLASS[char.position] ?? POSITION_CLASS.center}`}
        />
      ))}

      {showClassicScreen && uiScreen && (
        <GameScreenView
          screen={uiScreen as "loading" | "main_menu" | "settings"}
          config={gameScreens}
          assets={assets}
          projectTitle={projectTitle}
          onMenuAction={onMenuAction}
          onSettingsBack={onSettingsBack}
        />
      )}

      {showGallery && (
        <GameGalleryView
          config={gallery}
          assets={assets}
          unlockedIds={gameSession!.unlockedGalleryIds}
          onBack={onGalleryBack}
        />
      )}

      {showSaveSlots && (
        <GameSaveSlotsView
          title={uiScreen === "save" ? "Сохранение" : "Загрузка"}
          mode={uiScreen === "save" ? "save" : "load"}
          slots={loadSaveSlots(projectId, saveConfig.slot_count)}
          canSave={uiScreen === "save" && !gameSession!.galleryFromMenu}
          onSelectSlot={onSaveSlot}
          onDeleteSlot={onDeleteSaveSlot}
          onBack={onSaveScreenBack}
        />
      )}

      {!isPlaying && selectedNode && (
        <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300">
          {blockLabel}: <span className="text-zinc-100">{selectedNode.label}</span>
        </div>
      )}

      {!showSystemScreen && (
        <>
          {isPlaying && gameSession?.wait === "choice" ? (
            <VnChoiceMenu choices={gameSession.choices} onChoice={onChoice} />
          ) : displayState?.dialogue ? (
            <VnDialogueBox
              characterId={displayState.dialogue.character}
              text={displayState.dialogue.text}
              characters={characters}
            />
          ) : !hasContent && !isPlaying ? (
            <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 text-[10px] text-zinc-500">
              Выберите блок на схеме
            </div>
          ) : isPlaying && gameSession?.wait === "click" ? (
            <div className="pointer-events-none absolute bottom-3 right-4 z-30 text-[10px] text-white/75">
              Нажмите, чтобы продолжить ▶
            </div>
          ) : null}
        </>
      )}
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
  gameScreens,
  projectTitle,
  projectId,
  gallery,
  saveConfig,
  onTogglePreviewCollapse,
}: ScenePreviewProps) {
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStepIndex, setCompileStepIndex] = useState(0);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cheatInput, setCheatInput] = useState("");
  const [cheatMessage, setCheatMessage] = useState<string | null>(null);
  const [debugCollapsed, setDebugCollapsed] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("normal");
  const [viewport, setViewport] = useState({ w: 960, h: 540 });
  const [areaSize, setAreaSize] = useState({ w: 400, h: 200 });

  useEffect(() => {
    setDebugCollapsed(localStorage.getItem("lessgame-layout-debug-collapsed") === "1");
  }, []);

  useEffect(() => {
    const onReset = () => setDebugCollapsed(DEFAULT_LAYOUT.debugCollapsed);
    window.addEventListener("lessgame:layout-reset", onReset);
    return () => window.removeEventListener("lessgame:layout-reset", onReset);
  }, []);

  const toggleDebug = useCallback(() => {
    setDebugCollapsed((v) => {
      const next = !v;
      localStorage.setItem("lessgame-layout-debug-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

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

  const playContext = useMemo<PlayContext>(
    () => ({ gameScreens, characters, projectTitle, gallery, saveConfig, projectId }),
    [gameScreens, characters, projectTitle, gallery, saveConfig, projectId],
  );

  useEffect(() => {
    if (!isPlaying || !gallery.cheat_input_enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        setCheatOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, gallery.cheat_input_enabled]);

  const startGame = useCallback(async () => {
    const validation = validateGameForPlay(nodes, edges, gameScreens, assets);
    if (!validation.ok) {
      setCompileErrors(validation.errors);
      return;
    }

    setCompileErrors([]);
    setIsCompiling(true);
    setCompileStepIndex(0);

    await runCompileAnimation((_step, index) => setCompileStepIndex(index));

    const session = createGameSession(nodes, edges, assets, playContext);
    setIsCompiling(false);
    if (!session) {
      setCompileErrors(["Не удалось запустить игру — проверьте схему"]);
      return;
    }
    setGameSession(session);
    setIsPlaying(true);
  }, [nodes, edges, assets, gameScreens, playContext]);

  const stopGame = useCallback(() => {
    setIsPlaying(false);
    setGameSession(null);
    musicRef.current?.pause();
    if (soundRef.current) soundRef.current.pause();
  }, []);

  const handleFrameClick = useCallback(() => {
    if (!isPlaying || !gameSession || gameSession.wait !== "click") return;
    setGameSession(advanceGame(gameSession, nodes, edges, assets, playContext));
  }, [isPlaying, gameSession, nodes, edges, assets, playContext]);

  const onMenuAction = useCallback(
    (action: "start" | "settings" | "load" | "save" | "gallery" | "quit") => {
      if (!gameSession) return;
      setGameSession(applyMenuAction(gameSession, action, nodes, edges, assets, playContext));
    },
    [gameSession, nodes, edges, assets, playContext],
  );

  const handleSettingsBackClick = useCallback(() => {
    if (!gameSession) return;
    setGameSession(handleSettingsBack(gameSession, nodes, edges, assets, playContext));
  }, [gameSession, nodes, edges, assets, playContext]);

  const handleGalleryBackClick = useCallback(() => {
    if (!gameSession) return;
    setGameSession(handleGalleryBack(gameSession));
  }, [gameSession]);

  const handleSaveScreenBackClick = useCallback(() => {
    if (!gameSession) return;
    setGameSession(handleSaveScreenBack(gameSession));
  }, [gameSession]);

  const handleSaveSlot = useCallback(
    (index: number) => {
      if (!gameSession) return;
      const uiScreen = gameSession.state.uiScreen;
      if (uiScreen === "save") {
        if (gameSession.galleryFromMenu) return;
        const node = nodes.find((n) => n.id === gameSession.currentNodeId);
        const data = sessionToSaveData(gameSession, formatSaveLabel(node, new Date().toISOString()));
        if (!data) return;
        writeSaveSlot(projectId, index, data, saveConfig.slot_count);
        setGameSession(handleSaveScreenBack(gameSession));
        return;
      }
      if (uiScreen === "load") {
        const slots = loadSaveSlots(projectId, saveConfig.slot_count);
        const slot = slots[index];
        if (!slot) return;
        const restored = restoreSessionFromSave(slot, nodes, edges, assets, playContext);
        if (restored) setGameSession(restored);
      }
    },
    [gameSession, nodes, edges, assets, playContext, projectId, saveConfig.slot_count],
  );

  const handleDeleteSaveSlot = useCallback(
    (index: number) => {
      clearSaveSlot(projectId, index, saveConfig.slot_count);
      setGameSession((s) => (s ? { ...s } : s));
    },
    [projectId, saveConfig.slot_count],
  );

  const submitCheat = useCallback(() => {
    if (!gameSession || !cheatInput.trim()) return;
    const next = applyCheatToSession(gameSession, cheatInput, playContext);
    setGameSession(next);
    setCheatMessage(next.state.dialogue?.text ?? null);
    setCheatInput("");
    setCheatOpen(false);
  }, [gameSession, cheatInput, playContext]);

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
    assets,
    gameScreens,
    projectTitle,
    projectId,
    gallery,
    saveConfig,
    onFrameClick: handleFrameClick,
    onMenuAction,
    onSettingsBack: handleSettingsBackClick,
    onGalleryBack: handleGalleryBackClick,
    onSaveScreenBack: handleSaveScreenBackClick,
    onSaveSlot: handleSaveSlot,
    onDeleteSaveSlot: handleDeleteSaveSlot,
    onChoice: (handle: string) => {
      if (!gameSession) return;
      setGameSession(selectGameChoice(gameSession, handle, nodes, edges, assets, playContext));
    },
  };

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--editor-border)] px-2 py-1.5">
      <ResolutionSelect value={screenResolution.id} onChange={onScreenResolutionChange} />
      <span className="text-[10px] text-[var(--editor-muted)]">
        {screenResolution.width}×{screenResolution.height}
      </span>
      {!isPlaying ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void startGame()}
          disabled={!canPlay || isCompiling}
          className="h-7 gap-1 px-2 text-xs"
        >
          {isCompiling ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {isCompiling ? "Сборка…" : "Играть"}
        </Button>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={stopGame} className="h-7 gap-1 px-2 text-xs">
          <Square size={10} /> Стоп
        </Button>
      )}
      {isPlaying && saveConfig.enabled && (
        <>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => gameSession && setGameSession(openInGameSave(gameSession))}
          >
            💾
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => gameSession && setGameSession(openInGameLoad(gameSession))}
          >
            📂
          </Button>
        </>
      )}
      {isPlaying && gallery.cheat_input_enabled && (
        <span className="text-[10px] text-[var(--editor-muted)]">` — читы</span>
      )}
      <div className="ml-auto flex items-center gap-1">
        {onTogglePreviewCollapse && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={onTogglePreviewCollapse}
            title="Свернуть превью"
          >
            <ChevronUp size={12} />
          </Button>
        )}
      </div>
    </div>
  );

  const sizeControls = (
    <div className="flex shrink-0 items-center justify-center border-t border-[var(--editor-border)] bg-[var(--editor-surface-alt)]/50 px-3 py-2">
      <div className="inline-flex rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surface)] p-0.5 shadow-sm">
        {(
          [
            { id: "normal" as const, label: "Компакт", icon: Shrink },
            { id: "large" as const, label: "Крупнее", icon: Maximize2 },
            { id: "fullscreen" as const, label: previewSize === "fullscreen" ? "Свернуть" : "Полный", icon: previewSize === "fullscreen" ? Minimize2 : Expand },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = previewSize === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === "fullscreen") setPreviewSize((s) => (s === "fullscreen" ? "normal" : "fullscreen"));
                else setPreviewSize(id);
              }}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[10px] font-medium transition ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--editor-muted)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text)]"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--editor-border)] bg-[var(--editor-bg)]">
      {toolbar}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={previewAreaRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
            {isCompiling && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-100">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                    Сборка игры
                  </div>
                  <ul className="space-y-1.5">
                    {COMPILE_STEPS.map((step, i) => (
                      <li
                        key={step.id}
                        className={`text-xs ${
                          i < compileStepIndex
                            ? "text-emerald-400"
                            : i === compileStepIndex
                              ? "font-medium text-indigo-300"
                              : "text-zinc-500"
                        }`}
                      >
                        {i < compileStepIndex ? "✓ " : i === compileStepIndex ? "→ " : "· "}
                        {step.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {compileErrors.length > 0 && !isCompiling && (
              <div className="absolute bottom-2 left-2 right-2 z-30 rounded-lg border border-red-800/60 bg-red-950/90 px-3 py-2 text-xs text-red-200">
                <div className="mb-1 font-semibold">Не удалось запустить игру:</div>
                <ul className="list-inside list-disc space-y-0.5">
                  {compileErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-2 text-[10px] text-red-400 underline"
                  onClick={() => setCompileErrors([])}
                >
                  Закрыть
                </button>
              </div>
            )}
            {cheatOpen && isPlaying && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
                  <p className="mb-2 text-sm font-medium text-zinc-100">Ввод чит-кода</p>
                  <input
                    autoFocus
                    value={cheatInput}
                    onChange={(e) => setCheatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitCheat();
                      if (e.key === "Escape") setCheatOpen(false);
                    }}
                    className="mb-2 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-white"
                    placeholder="unlockall"
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setCheatOpen(false)}>
                      Отмена
                    </Button>
                    <Button type="button" size="sm" onClick={submitCheat}>
                      OK
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {cheatMessage && isPlaying && (
              <div className="absolute top-12 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-indigo-950/90 px-3 py-1.5 text-xs text-indigo-200">
                {cheatMessage}
                <button type="button" className="ml-2 text-indigo-400" onClick={() => setCheatMessage(null)}>
                  ×
                </button>
              </div>
            )}
            <div className="flex shrink-0 items-center justify-center">
              <PreviewFrame {...frameProps} />
            </div>
          </div>
          {sizeControls}
        </div>
        <PreviewDebugPanel
          selectedNode={selectedNode}
          displayState={displayState}
          isPlaying={isPlaying}
          gameSession={gameSession}
          collapsed={debugCollapsed}
          onToggleCollapse={toggleDebug}
        />
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
