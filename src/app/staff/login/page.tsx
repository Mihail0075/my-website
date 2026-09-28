import { redirect } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/SiteChrome";
import { Card } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { APP_NAME, APP_NAME_EN } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff", robots: { index: false } };

export default async function LoginPage() {
  if (await getSession()) redirect("/staff");
  const { lang, t } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <Logo name={lang === "mk" ? APP_NAME : APP_NAME_EN} />
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-2xl font-bold">{t.staff.loginTitle}</h1>
        <LoginForm />
      </Card>
      <LangSwitch />
    </main>
  );
}
