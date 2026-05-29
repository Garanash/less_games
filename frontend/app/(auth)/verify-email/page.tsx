"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Токен не найден");
      setLoading(false);
      return;
    }

    api
      .verifyEmail(token)
      .then((res) => setMessage(res.message))
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else setError("Ошибка подтверждения");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-zinc-100">Подтверждение email</h1>
        {loading && <p className="text-zinc-400">Проверка...</p>}
        {message && <p className="mb-4 text-green-300">{message}</p>}
        {error && <p className="mb-4 text-red-300">{error}</p>}
        <Link href="/login">
          <Button>Перейти ко входу</Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-zinc-400">Загрузка...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
