"use client";

import { useState } from "react";

import type { Asset } from "@/lib/api";
import type { GalleryConfig } from "@/lib/gallery";

type GameGalleryViewProps = {
  config: GalleryConfig;
  assets: Asset[];
  unlockedIds: Set<string>;
  onBack: () => void;
};

function assetById(assets: Asset[], id: string): Asset | undefined {
  return assets.find((a) => a.id === id);
}

function assetUrl(assets: Asset[], id: string): string | undefined {
  return assetById(assets, id)?.url;
}

export function GameGalleryView({ config, assets, unlockedIds, onBack }: GameGalleryViewProps) {
  const [viewingId, setViewingId] = useState<string | null>(null);
  const bg = assetUrl(assets, config.background_asset_id);
  const viewing = viewingId ? config.items.find((i) => i.id === viewingId) : null;
  const viewingAsset = viewing ? assetById(assets, viewing.asset_id) : undefined;
  const viewingUrl = viewingAsset?.url;

  if (viewing && viewingUrl && unlockedIds.has(viewing.id)) {
    const isVideo = viewingAsset?.mime_type?.startsWith("video/");
    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-black" onClick={() => setViewingId(null)}>
        {isVideo ? (
          <video
            src={viewingUrl}
            autoPlay
            loop
            controls
            playsInline
            className="m-auto max-h-full max-w-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={viewingUrl} alt={viewing.label} className="m-auto max-h-full max-w-full object-contain p-4" />
        )}
        <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-zinc-300 drop-shadow">
          {viewing.label}
        </div>
        <button
          type="button"
          className="absolute right-4 top-4 rounded bg-black/50 px-2 py-1 text-xs text-white"
          onClick={(e) => {
            e.stopPropagation();
            setViewingId(null);
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" className="absolute inset-0 h-full w-full object-contain object-center opacity-40" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
      )}
      <div className="relative flex shrink-0 items-center justify-between border-b border-zinc-700/50 px-4 py-2">
        <h2 className="text-sm font-semibold text-white">{config.title}</h2>
        <button type="button" className="text-xs text-zinc-300 hover:text-white" onClick={onBack}>
          Назад
        </button>
      </div>
      <div className="relative grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4">
        {config.items.map((item) => {
          const unlocked = unlockedIds.has(item.id);
          const thumbId = item.thumbnail_asset_id || item.asset_id;
          const thumbAsset = unlocked ? assetById(assets, thumbId) : undefined;
          const thumb = thumbAsset?.url;
          const isVideo = thumbAsset?.mime_type?.startsWith("video/");
          return (
            <button
              key={item.id}
              type="button"
              disabled={!unlocked}
              onClick={() => unlocked && setViewingId(item.id)}
              className={`aspect-[4/3] overflow-hidden rounded-lg text-left ${
                unlocked ? "hover:ring-1 hover:ring-amber-400/60" : "cursor-not-allowed opacity-60"
              }`}
            >
              {thumb && isVideo ? (
                <video src={thumb} muted className="h-full w-full object-cover" />
              ) : thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-900/80 text-[10px] text-zinc-500">
                  {unlocked ? "?" : "🔒"}
                </div>
              )}
              <div className="truncate bg-black/60 px-1 py-0.5 text-[9px] text-zinc-300">{item.label}</div>
            </button>
          );
        })}
        {config.items.length === 0 && (
          <p className="col-span-full text-center text-xs text-zinc-500">Галерея пуста — добавьте CG в редакторе</p>
        )}
      </div>
    </div>
  );
}
