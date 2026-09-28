"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { Alert, Button, Field, Input } from "@/components/ui";
import { errorMessage } from "@/i18n";
import { api, ApiError } from "@/lib/api";

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api("/api/staff/login", { username: data.get("username"), password: data.get("password") });
      router.push("/staff");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t.common.genericError);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t.staff.username} htmlFor="username">
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" required />
      </Field>
      <Field label={t.staff.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t.common.loading : t.staff.login}
      </Button>
    </form>
  );
}
