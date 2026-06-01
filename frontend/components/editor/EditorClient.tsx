"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  HelpCircle,
  Image,
  Images,
  Loader2,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Sun,
  Users,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import {
  api,
  ApiError,
  DEFAULT_CHARACTERS,
  type GraphEdge,
  type GraphNode,
  type ProjectCharacter,
} from "@/lib/api";
import { mergePreviewState } from "@/lib/preview";
import {
  getScreenResolution,
  parseScreenResolutionFromMetadata,
} from "@/lib/screen-resolutions";
import { DEFAULT_GAME_SCREENS, parseGameScreens, type GameScreensConfig, type ScreenTab } from "@/lib/game-screens";
import {
  DEFAULT_GALLERY,
  DEFAULT_SAVE_CONFIG,
  parseGalleryConfig,
  parseSaveConfig,
  type GalleryConfig,
  type SaveConfig,
} from "@/lib/gallery";
import { normalizeCharacterEmotions } from "@/lib/character-utils";
import { ensureSystemGraph, isCanvasHiddenBlockType } from "@/lib/system-blocks";
import { Button } from "@/components/ui/button";
import { BlockToolbar } from "@/components/editor/BlockToolbar";
import { BlockTourModal } from "@/components/editor/BlockTourModal";
import { BuildGameModal, type BuildPlatform } from "@/components/editor/BuildGameModal";
import { EditorModal } from "@/components/editor/EditorModal";
import { EditorResizableLayout, resetEditorLayoutUi } from "@/components/editor/EditorResizableLayout";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { EditorThemeProvider, useEditorTheme } from "@/components/editor/EditorThemeProvider";
import { GameScreensPanel } from "@/components/editor/GameScreensPanel";
import { MediaLibraryPanel } from "@/components/editor/MediaLibraryPanel";
import { CharactersPanel } from "@/components/editor/CharactersPanel";
import { GalleryPanel } from "@/components/editor/GalleryPanel";
import { ProjectSwitcher } from "@/components/editor/ProjectSwitcher";
import { ScenePreview } from "@/components/editor/ScenePreview";
import { useEditorStore } from "@/components/editor/store";

const FlowCanvas = dynamic(
  () => import("@/components/editor/FlowCanvas").then((m) => m.FlowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface-alt)] text-[var(--editor-muted)]">
        Загрузка схемы...
      </div>
    ),
  },
);

type EditorClientProps = {
  projectId: string;
  projectTitle: string;
};

function parseCharacters(metadata: Record<string, unknown> | undefined): ProjectCharacter[] {
  const raw = metadata?.characters;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_CHARACTERS;
  return (raw as ProjectCharacter[]).map(normalizeCharacterEmotions);
}

export function EditorClient(props: EditorClientProps) {
  return (
    <EditorThemeProvider>
      <EditorClientInner {...props} />
    </EditorThemeProvider>
  );
}

function EditorClientInner({ projectId, projectTitle }: EditorClientProps) {
  const { theme, toggleTheme } = useEditorTheme();
  const queryClient = useQueryClient();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>(DEFAULT_CHARACTERS);
  const [screenResolution, setScreenResolution] = useState(() =>
    parseScreenResolutionFromMetadata(undefined),
  );
  const [gameScreens, setGameScreens] = useState<GameScreensConfig>(DEFAULT_GAME_SCREENS);
  const [gallery, setGallery] = useState<GalleryConfig>(DEFAULT_GALLERY);
  const [saveConfig, setSaveConfig] = useState<SaveConfig>(DEFAULT_SAVE_CONFIG);
  const [tourOpen, setTourOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [screensOpen, setScreensOpen] = useState(false);
  const [screenEditorTab, setScreenEditorTab] = useState<ScreenTab>("loading");
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [layoutResetKey, setLayoutResetKey] = useState(0);
  const [manualSaving, setManualSaving] = useState(false);
  const isSaving = useEditorStore((s) => s.isSaving);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metadataTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graphHydratedKeyRef = useRef<string | null>(null);

  const setProjectId = useEditorStore((s) => s.setProjectId);
  const setGraph = useEditorStore((s) => s.setGraph);
  const setAssets = useEditorStore((s) => s.setAssets);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const assets = useEditorStore((s) => s.assets);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const setPreviewState = useEditorStore((s) => s.setPreviewState);
  const setIsSaving = useEditorStore((s) => s.setIsSaving);
  const selectNode = useEditorStore((s) => s.selectNode);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
    retry: 1,
  });

  const graphQuery = useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => api.getGraph(projectId),
    retry: 1,
  });

  const assetsQuery = useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => api.listAssets(projectId),
    retry: 1,
  });

  const previewQuery = useQuery({
    queryKey: ["preview", projectId, selectedNodeId],
    queryFn: () => api.previewState(projectId, selectedNodeId!),
    enabled: Boolean(selectedNodeId),
    retry: 1,
  });

  const previewState = useMemo(
    () => mergePreviewState(previewQuery.data, selectedNode, assets),
    [previewQuery.data, selectedNodeId, selectedNode?.id, selectedNode?.type, selectedNode?.data, assets],
  );

  useEffect(() => {
    if (selectedNode && isCanvasHiddenBlockType(selectedNode.type)) {
      selectNode(null);
    }
  }, [selectedNode, selectNode]);

  const saveMutation = useMutation({
    mutationFn: (graph: { nodes: GraphNode[]; edges: GraphEdge[] }) => api.saveGraph(projectId, graph),
    onMutate: () => setIsSaving(true),
    onSettled: () => setIsSaving(false),
  });

  const saveMetadataMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.updateProject(projectId, {
        metadata: {
          ...(projectQuery.data?.metadata ?? {}),
          ...patch,
        },
      }),
  });

  useEffect(() => {
    setProjectId(projectId);
    setGraph([], []);
    setAssets([]);
    selectNode(null);
    setPreviewState(null);
    graphHydratedKeyRef.current = null;
  }, [projectId, setProjectId, setGraph, setAssets, selectNode, setPreviewState]);

  useEffect(() => {
    if (projectQuery.data && !charactersOpen) {
      setCharacters(parseCharacters(projectQuery.data.metadata));
      setScreenResolution(parseScreenResolutionFromMetadata(projectQuery.data.metadata));
      setGameScreens(parseGameScreens(projectQuery.data.metadata));
    }
    if (projectQuery.data && !galleryOpen) {
      setGallery(parseGalleryConfig(projectQuery.data.metadata));
      setSaveConfig(parseSaveConfig(projectQuery.data.metadata));
    }
  }, [projectQuery.data, charactersOpen, galleryOpen]);

  useEffect(() => {
    if (!graphQuery.data) return;

    const hydrateKey = `${projectId}:${graphQuery.dataUpdatedAt}`;
    if (graphHydratedKeyRef.current === hydrateKey) return;

    const { nodes: ensuredNodes, edges: ensuredEdges, changed } = ensureSystemGraph(
      graphQuery.data.nodes,
      graphQuery.data.edges,
      projectTitle,
    );

    setGraph(ensuredNodes, ensuredEdges);
    graphHydratedKeyRef.current = hydrateKey;

    if (changed) {
      saveMutation.mutate(
        { nodes: ensuredNodes, edges: ensuredEdges },
        {
          onSuccess: () => {
            graphHydratedKeyRef.current = null;
            queryClient.invalidateQueries({ queryKey: ["graph", projectId] });
          },
        },
      );
    }
  }, [graphQuery.data, graphQuery.dataUpdatedAt, projectId, projectTitle, setGraph, saveMutation.mutate, queryClient]);

  useEffect(() => {
    if (assetsQuery.data) {
      setAssets(assetsQuery.data);
    }
  }, [assetsQuery.data, setAssets]);

  const scheduleSave = useCallback(
    (nextNodes: GraphNode[], nextEdges: GraphEdge[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate({ nodes: nextNodes, edges: nextEdges });
      }, 800);
    },
    [saveMutation],
  );

  const scheduleMetadataSave = useCallback(
    (patch: Record<string, unknown>) => {
      if (metadataTimer.current) clearTimeout(metadataTimer.current);
      metadataTimer.current = setTimeout(() => {
        saveMetadataMutation.mutate(patch);
      }, 800);
    },
    [saveMetadataMutation],
  );

  const handleDirty = useCallback(() => {
    scheduleSave(useEditorStore.getState().nodes, useEditorStore.getState().edges);
  }, [scheduleSave]);

  const handleCharactersChange = useCallback(
    (chars: ProjectCharacter[]) => {
      setCharacters(chars);
      scheduleMetadataSave({ characters: chars });
    },
    [scheduleMetadataSave],
  );

  const handleScreenResolutionChange = useCallback(
    (id: string) => {
      const resolution = getScreenResolution(id);
      setScreenResolution(resolution);
      scheduleMetadataSave({
        screen_resolution: resolution.id,
        screen_width: resolution.width,
        screen_height: resolution.height,
      });
    },
    [scheduleMetadataSave],
  );

  const handleGameScreensChange = useCallback(
    (config: GameScreensConfig) => {
      setGameScreens(config);
      scheduleMetadataSave({ game_screens: config });
    },
    [scheduleMetadataSave],
  );

  const handleGalleryChange = useCallback(
    (config: GalleryConfig) => {
      setGallery(config);
      scheduleMetadataSave({ gallery: config });
    },
    [scheduleMetadataSave],
  );

  const handleSaveConfigChange = useCallback(
    (patch: SaveConfig) => {
      setSaveConfig(patch);
      scheduleMetadataSave({ save_config: patch });
    },
    [scheduleMetadataSave],
  );

  const handleAddGalleryMenuItem = useCallback(() => {
    const items = gameScreens.main_menu.items ?? [];
    if (items.some((item) => item.action === "gallery")) return;
    handleGameScreensChange({
      ...gameScreens,
      main_menu: {
        ...gameScreens.main_menu,
        items: [
          ...items,
          {
            id: uuidv4(),
            label: "Галерея",
            action: "gallery",
            x: 50,
            y: 58,
          },
        ],
      },
    });
  }, [gameScreens, handleGameScreensChange]);

  const handleGraphChange = useCallback(
    (nextNodes: GraphNode[], nextEdges: GraphEdge[]) => {
      scheduleSave(nextNodes, nextEdges);
    },
    [scheduleSave],
  );

  const handleAddNode = (node: GraphNode) => {
    const nextNodes = [...nodes, node];
    setNodes(nextNodes);
    scheduleSave(nextNodes, useEditorStore.getState().edges);
    selectNode(node.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = useEditorStore.getState().edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    selectNode(null);
    scheduleSave(nextNodes, nextEdges);
  };

  const handleUploadAsset = async (kind: string, file: File) => {
    const asset = await api.uploadAsset(projectId, kind, file);
    setAssets([...useEditorStore.getState().assets, asset]);
    queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
  };

  const handleDeleteAsset = async (assetId: string) => {
    await api.deleteAsset(projectId, assetId);
    setAssets(useEditorStore.getState().assets.filter((a) => a.id !== assetId));
    queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
  };

  const handleRenameAsset = async (assetId: string, filename: string) => {
    const updated = await api.renameAsset(projectId, assetId, filename);
    setAssets(
      useEditorStore.getState().assets.map((a) => (a.id === assetId ? updated : a)),
    );
    queryClient.invalidateQueries({ queryKey: ["assets", projectId] });
  };

  const handleManualSave = async () => {
    setManualSaving(true);
    setExportError(null);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (metadataTimer.current) clearTimeout(metadataTimer.current);
      await saveMutation.mutateAsync({ nodes, edges: useEditorStore.getState().edges });
      await saveMetadataMutation.mutateAsync({
        characters,
        game_screens: gameScreens,
        gallery,
        save_config: saveConfig,
        screen_resolution: screenResolution.id,
        screen_width: screenResolution.width,
        screen_height: screenResolution.height,
      });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setManualSaving(false);
    }
  };

  const handleExport = async (platform: BuildPlatform) => {
    setExportError(null);
    setExportLoading(true);
    try {
      await saveMutation.mutateAsync({ nodes, edges: useEditorStore.getState().edges });
      await saveMetadataMutation.mutateAsync({
        characters,
        game_screens: gameScreens,
        gallery,
        save_config: saveConfig,
        screen_resolution: screenResolution.id,
        screen_width: screenResolution.width,
        screen_height: screenResolution.height,
        build_platform: platform,
      });
      await api.exportRenpy(projectId, projectTitle, platform);
      setBuildModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        const detail = err.details as { detail?: { errors?: string[] } | string };
        if (typeof detail.detail === "object" && detail.detail?.errors) {
          setExportError(detail.detail.errors.join("\n"));
        } else {
          setExportError(String(detail.detail ?? err.message));
        }
      } else {
        setExportError(err instanceof Error ? err.message : "Export failed");
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleResetLayout = useCallback(() => {
    resetEditorLayoutUi();
    setLayoutResetKey((key) => key + 1);
  }, []);

  const isLoading = graphQuery.isLoading || projectQuery.isLoading;
  const isAuthError =
    graphQuery.error instanceof ApiError && graphQuery.error.status === 401 ||
    projectQuery.error instanceof ApiError && projectQuery.error.status === 401;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-zinc-400">Загрузка редактора...</div>;
  }

  if (isAuthError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-zinc-400">
        <p>Нужно войти в систему</p>
        <Link href="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    );
  }

  if (graphQuery.isError || projectQuery.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-zinc-400">
        <p>Не удалось загрузить проект. Проверьте, что backend запущен на порту 8000.</p>
        <Link href="/dashboard">
          <Button variant="secondary">Назад</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="editor-shell flex h-screen flex-col overflow-hidden" data-editor-theme={theme}>
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--editor-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[var(--editor-muted)] hover:text-[var(--editor-text)]">
            <ArrowLeft size={18} />
          </Link>
          <ProjectSwitcher currentProjectId={projectId} currentTitle={projectTitle} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 min-w-[6.5rem] px-2.5 text-xs"
            onClick={handleManualSave}
            disabled={manualSaving || isSaving}
          >
            {manualSaving || isSaving ? (
              <Loader2 size={14} className="shrink-0 animate-spin" />
            ) : (
              <Save size={14} className="shrink-0" />
            )}
            <span>{manualSaving || isSaving ? "Сохранение..." : "Сохранить"}</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={() => setMediaOpen(true)}>
            <Image size={14} className="shrink-0" />
            <span>Медиа</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={() => setCharactersOpen(true)}>
            <Users size={14} className="shrink-0" />
            <span>Персонажи</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={() => { setScreenEditorTab("loading"); setScreensOpen(true); }}>
            <Monitor size={14} className="shrink-0" />
            <span>Экраны</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={() => setGalleryOpen(true)}>
            <Images size={14} className="shrink-0" />
            <span>Галерея</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={handleResetLayout}
            title="Вернуть размеры и видимость панелей по умолчанию"
          >
            <RotateCcw size={14} className="shrink-0" />
            <span>Сбросить интерфейс</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={14} className="shrink-0" /> : <Moon size={14} className="shrink-0" />}
            <span>{theme === "dark" ? "Светлая" : "Тёмная"}</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" className="h-8 min-w-[6.5rem] px-2.5 text-xs" onClick={() => setTourOpen(true)}>
            <HelpCircle size={14} className="shrink-0" />
            <span>Справка</span>
          </Button>
          {exportError && <p className="max-w-xs truncate text-xs text-red-400">{exportError}</p>}
        </div>
      </header>

      <BlockTourModal open={tourOpen} onClose={() => setTourOpen(false)} />

      <EditorModal open={mediaOpen} onClose={() => setMediaOpen(false)} title="Медиа проекта" subtitle="Просмотр, загрузка и переименование файлов" wide>
        <MediaLibraryPanel
          assets={assets}
          onUpload={handleUploadAsset}
          onDelete={handleDeleteAsset}
          onRename={handleRenameAsset}
        />
      </EditorModal>

      <EditorModal open={charactersOpen} onClose={() => setCharactersOpen(false)} title="Персонажи" subtitle="Настройка персonaжей игры" wide>
        <CharactersPanel characters={characters} assets={assets} onChange={handleCharactersChange} />
      </EditorModal>

      <EditorModal open={screensOpen} onClose={() => setScreensOpen(false)} title="Экраны игры" subtitle="Загрузка, меню и настройки" wide>
        <GameScreensPanel
          config={gameScreens}
          assets={assets}
          onChange={handleGameScreensChange}
          initialTab={screenEditorTab}
        />
      </EditorModal>

      <EditorModal open={galleryOpen} onClose={() => setGalleryOpen(false)} title="Галерея и сохранения" subtitle="CG, чит-коды и слоты сохранения" wide>
        <GalleryPanel
          config={gallery}
          saveSlotCount={saveConfig.slot_count}
          assets={assets}
          onChange={handleGalleryChange}
          onSaveConfigChange={(slotCount) =>
            handleSaveConfigChange({ ...saveConfig, slot_count: slotCount })
          }
          onAddGalleryMenuItem={handleAddGalleryMenuItem}
        />
      </EditorModal>

      <BlockToolbar onAddNode={handleAddNode} onBuildClick={() => setBuildModalOpen(true)} exportLoading={exportLoading} />

      <BuildGameModal
        open={buildModalOpen}
        loading={exportLoading}
        onClose={() => setBuildModalOpen(false)}
        onBuild={handleExport}
      />

      <EditorResizableLayout
        layoutResetKey={layoutResetKey}
        preview={
          <ScenePreview
            state={previewState}
            selectedNode={selectedNode}
            loading={previewQuery.isFetching && Boolean(selectedNodeId)}
            screenResolution={screenResolution}
            onScreenResolutionChange={handleScreenResolutionChange}
            nodes={nodes}
            edges={edges}
            assets={assets}
            characters={characters}
            gameScreens={gameScreens}
            projectTitle={projectTitle}
            projectId={projectId}
            gallery={gallery}
            saveConfig={saveConfig}
          />
        }
        canvas={<FlowCanvas onGraphChange={handleGraphChange} />}
        sidebar={
          <EditorSidebar
            characters={characters}
            gallery={gallery}
            onDeleteNode={handleDeleteNode}
            onDirty={handleDirty}
          />
        }
      />
    </div>
  );
}
