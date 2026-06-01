import { v4 as uuidv4 } from "uuid";

import type { CharacterEmotion, ProjectCharacter } from "@/lib/api";

export const DEFAULT_EMOTION_ID = "neutral";

export function defaultEmotionsForCharacter(): CharacterEmotion[] {
  return [
    {
      ui_key: uuidv4(),
      id: DEFAULT_EMOTION_ID,
      label: "Нейтральная",
      asset_id: "",
    },
  ];
}

export function ensureEmotionUiKeys(emotions: CharacterEmotion[]): CharacterEmotion[] {
  return emotions.map((emotion) => ({
    ...emotion,
    ui_key: emotion.ui_key ?? uuidv4(),
  }));
}

export function normalizeCharacterEmotions(char: ProjectCharacter): ProjectCharacter {
  const emotions = ensureEmotionUiKeys(
    char.emotions && char.emotions.length > 0 ? char.emotions : defaultEmotionsForCharacter(),
  );
  const defaultEmotionId =
    char.default_emotion_id && emotions.some((e) => e.id === char.default_emotion_id)
      ? char.default_emotion_id
      : emotions[0]?.id ?? DEFAULT_EMOTION_ID;
  return {
    ...char,
    emotions,
    default_emotion_id: defaultEmotionId,
  };
}

export function sanitizeEmotionId(raw: string, fallbackIndex: number): string {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `emotion_${fallbackIndex + 1}`;
}

export function resolveCharacterSpriteAsset(
  character: ProjectCharacter | undefined,
  options: { emotion_id?: string; asset_id?: string },
): string | undefined {
  const direct = options.asset_id?.trim();
  if (direct) return direct;

  const emotions = character?.emotions ?? [];
  const emotionId = options.emotion_id ?? character?.default_emotion_id;
  if (emotionId) {
    const emotion = emotions.find((e) => e.id === emotionId);
    if (emotion?.asset_id) return emotion.asset_id;
  }

  return character?.default_sprite_asset_id;
}

export function emotionAssetMap(character: ProjectCharacter): Map<string, string> {
  const map = new Map<string, string>();
  for (const emotion of character.emotions ?? []) {
    if (emotion.asset_id) map.set(emotion.id, emotion.asset_id);
  }
  return map;
}

export function renameEmotionInCharacter(
  char: ProjectCharacter,
  uiKey: string,
  nextId: string,
): ProjectCharacter {
  const emotions = char.emotions ?? [];
  const target = emotions.find((e) => e.ui_key === uiKey);
  if (!target) return char;
  const oldId = target.id;
  const nextEmotions = emotions.map((e) =>
    e.ui_key === uiKey ? { ...e, id: nextId } : e,
  );
  let defaultEmotionId = char.default_emotion_id;
  if (defaultEmotionId === oldId) defaultEmotionId = nextId;
  return normalizeCharacterEmotions({
    ...char,
    emotions: nextEmotions,
    default_emotion_id: defaultEmotionId,
  });
}
