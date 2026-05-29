"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await api.register(email, password);
      setSuccess(result.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ошибка регистрации");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="mb-2 text-2xl font-bold text-zinc-100">Регистрация</h1>
        <p className="mb-6 text-sm text-zinc-400">Создайте аккаунт для работы с редактором</p>

        {error && <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && (
          <p className="mb-4 rounded-lg bg-green-950/50 px-3 py-2 text-sm text-green-300">
            {success} Проверьте почту (в dev — Mailpit: http://localhost:8025)
          </p>
        )}

        <div className="mb-4">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-6">
          <Label>Пароль (мин. 8 символов)</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </Button>

        <p className="mt-4 text-center text-sm text-zinc-400">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
