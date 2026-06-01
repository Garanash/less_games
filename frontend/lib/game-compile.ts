import type { Asset, GraphEdge, GraphNode } from "@/lib/api";
import type { GameScreensConfig } from "@/lib/game-screens";

export type CompileStep = {
  id: string;
  label: string;
};

export const COMPILE_STEPS: CompileStep[] = [
  { id: "graph", label: "Проверка схемы" },
  { id: "screens", label: "Сборка экранов (загрузка, меню, настройки)" },
  { id: "assets", label: "Подготовка ассетов" },
  { id: "renpy", label: "Компиляция сценария Ren'Py" },
  { id: "launch", label: "Запуск на устройстве" },
];

export type CompileResult = {
  ok: boolean;
  errors: string[];
};

export function validateGameForPlay(
  nodes: GraphNode[],
  edges: GraphEdge[],
  gameScreens: GameScreensConfig,
  assets: Asset[],
): CompileResult {
  const errors: string[] = [];

  if (!nodes.some((n) => n.type === "loading")) {
    errors.push("Отсутствует блок загрузки (добавляется автоматически при сохранении)");
  }
  if (!nodes.some((n) => n.type === "main_menu")) {
    errors.push("Отсутствует блок главного меню");
  }
  if (!nodes.some((n) => n.type === "start")) {
    errors.push("Отсутствует блок «Старт»");
  }

  const startId = nodes.find((n) => n.type === "start")?.id;
  if (startId) {
    const hasIncoming = edges.some((e) => e.target === startId);
    if (!hasIncoming) {
      errors.push("Блок «Старт» не связан с главным меню");
    }
  }

  const loader = gameScreens.loading.loaders[0];
  if (loader && !loader.title && !loader.subtitle) {
    errors.push("Экран загрузки пуст — настройте во вкладке «Экраны»");
  }

  if (gameScreens.main_menu.items.length === 0) {
    errors.push("Главное меню без кнопок — добавьте пункты в «Экраны»");
  }

  const brokenAssets = nodes.filter((n) => {
    const data = n.data ?? {};
    for (const key of ["asset_id", "background_asset_id", "music_asset_id", "voice_asset_id"]) {
      const id = data[key];
      if (id && typeof id === "string" && !assets.some((a) => a.id === id)) {
        return true;
      }
    }
    return false;
  });
  if (brokenAssets.length > 0) {
    errors.push(`Битые ссылки на медиа в блоках: ${brokenAssets.map((n) => n.label).join(", ")}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function runCompileAnimation(
  onStep: (step: CompileStep, index: number) => void,
  stepMs = 380,
): Promise<void> {
  for (let i = 0; i < COMPILE_STEPS.length; i++) {
    onStep(COMPILE_STEPS[i], i);
    await new Promise((r) => setTimeout(r, stepMs));
  }
}
