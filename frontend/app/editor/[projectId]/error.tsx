"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-100">
      <h2 className="text-lg font-semibold">Ошибка загрузки редактора</h2>
      <p className="max-w-md text-center text-sm text-zinc-400">{error.message}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Повторить</Button>
        <Link href="/dashboard">
          <Button variant="secondary">К проектам</Button>
        </Link>
      </div>
    </div>
  );
}
