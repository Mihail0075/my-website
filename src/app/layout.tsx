import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { getI18n } from "@/i18n/server";
import { APP_NAME, APP_NAME_EN } from "@/lib/config";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getI18n();
  const name = lang === "mk" ? APP_NAME : APP_NAME_EN;
  return {
    title: { default: `${name} — ${t.common.tagline}`, template: `%s · ${name}` },
    description: t.home.subtitle,
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5d4b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getI18n();
  return (
    <html lang={lang}>
      <body>
        <I18nProvider lang={lang} t={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
