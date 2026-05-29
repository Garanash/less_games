export type ScreenResolution = {
  id: string;
  width: number;
  height: number;
  label: string;
  hint: string;
};

export const SCREEN_RESOLUTIONS: ScreenResolution[] = [
  { id: "1280x720", width: 1280, height: 720, label: "1280×720", hint: "HD — стандарт Ren'Py" },
  { id: "1920x1080", width: 1920, height: 1080, label: "1920×1080", hint: "Full HD" },
  { id: "2560x1440", width: 2560, height: 1440, label: "2560×1440", hint: "2K QHD" },
  { id: "3840x2160", width: 3840, height: 2160, label: "3840×2160", hint: "4K UHD" },
  { id: "1366x768", width: 1366, height: 768, label: "1366×768", hint: "Ноутбук 16:9" },
  { id: "1600x900", width: 1600, height: 900, label: "1600×900", hint: "HD+ 16:9" },
  { id: "1280x800", width: 1280, height: 800, label: "1280×800", hint: "WXGA 16:10" },
  { id: "1920x1200", width: 1920, height: 1200, label: "1920×1200", hint: "WUXGA 16:10" },
  { id: "1024x768", width: 1024, height: 768, label: "1024×768", hint: "XGA 4:3" },
  { id: "800x600", width: 800, height: 600, label: "800×600", hint: "SVGA 4:3" },
  { id: "960x540", width: 960, height: 540, label: "960×540", hint: "qHD / мобильный" },
];

export const DEFAULT_SCREEN_RESOLUTION = SCREEN_RESOLUTIONS[0];

export function getScreenResolution(id: string | undefined): ScreenResolution {
  return SCREEN_RESOLUTIONS.find((r) => r.id === id) ?? DEFAULT_SCREEN_RESOLUTION;
}

export function parseScreenResolutionFromMetadata(
  metadata: Record<string, unknown> | undefined,
): ScreenResolution {
  if (metadata?.screen_resolution) {
    return getScreenResolution(String(metadata.screen_resolution));
  }
  const width = Number(metadata?.screen_width);
  const height = Number(metadata?.screen_height);
  if (width > 0 && height > 0) {
    const match = SCREEN_RESOLUTIONS.find((r) => r.width === width && r.height === height);
    if (match) return match;
    return { id: `${width}x${height}`, width, height, label: `${width}×${height}`, hint: "Пользовательский" };
  }
  return DEFAULT_SCREEN_RESOLUTION;
}
