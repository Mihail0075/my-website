import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { APP_NAME, APP_NAME_EN } from "@/lib/config";
import { LangSwitch } from "./LangSwitch";

export function Logo({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2 font-extrabold text-ink">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8">
        <rect x="2" y="7" width="28" height="20" rx="4" fill="#0b5d4b" />
        <rect x="6" y="11" width="9" height="7" rx="1.5" fill="#fff" />
        <rect x="17" y="11" width="9" height="7" rx="1.5" fill="#fff" />
        <circle cx="10" cy="27" r="3" fill="#f2a900" />
        <circle cx="22" cy="27" r="3" fill="#f2a900" />
      </svg>
      <span className="text-lg">{name}</span>
    </span>
  );
}

export async function SiteHeader() {
  const { lang, t } = await getI18n();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-h-11 flex items-center" aria-label={t.common.home}>
          <Logo name={lang === "mk" ? APP_NAME : APP_NAME_EN} />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/track" className="hidden min-h-11 items-center rounded-[var(--radius-std)] px-3 font-semibold text-muted hover:text-ink sm:flex">
            {t.nav.track}
          </Link>
          <Link href="/send" className="hidden min-h-11 items-center rounded-[var(--radius-std)] bg-brand px-4 font-semibold text-white hover:bg-brand-hover sm:flex">
            {t.nav.send}
          </Link>
          <LangSwitch />
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const { lang, t } = await getI18n();
  return (
    <footer className="no-print mt-16 border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {lang === "mk" ? APP_NAME : APP_NAME_EN}. {t.footer.rights}
        </p>
        <nav className="flex gap-4">
          <Link href="/track" className="hover:text-ink">
            {t.nav.track}
          </Link>
          <Link href="/staff" className="hover:text-ink">
            {t.nav.staff}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
