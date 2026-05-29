"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ошибка входа");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-zinc-100">Вход</h1>
        <p className="mb-6 text-sm text-zinc-400">Less Game Editor — редактор визуальных новелл</p>

        {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="mb-4">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-6">
          <Label>Пароль</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </Button>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline">
            Регистрация
          </Link>
        </p>

        <p className="mt-2 text-center text-xs text-zinc-600">Demo: demo@example.com / demo12345</p>
      </form>
    </div>
  );
}
