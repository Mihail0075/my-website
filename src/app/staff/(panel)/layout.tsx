import Link from "next/link";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/SiteChrome";
import { LogoutButton } from "@/components/staff/LogoutButton";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { APP_NAME, APP_NAME_EN } from "@/lib/config";

export const metadata = { title: "Staff", robots: { index: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStaffPage();
  const { lang, t } = await getI18n();
  const n = t.staff.nav;
  const links =
    user.role === "ADMIN"
      ? [
          ["/staff/admin", n.parcels],
          ["/staff/counter", n.counter],
          ["/staff/driver", n.driver],
          ["/staff/admin/lockers", n.lockers],
          ["/staff/admin/kiosks", n.kiosks],
          ["/staff/admin/messages", n.messages],
        ]
      : user.role === "COUNTER"
        ? [["/staff/counter", n.counter]]
        : [["/staff/driver", n.driver]];

  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/staff" className="flex min-h-11 items-center">
            <Logo name={lang === "mk" ? APP_NAME : APP_NAME_EN} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted md:inline">
              {user.name} · {t.staff.roles[user.role]}
            </span>
            <LangSwitch />
            <LogoutButton />
          </div>
        </div>
        {links.length > 1 && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center rounded-[var(--radius-std)] px-3 font-semibold text-muted hover:bg-surface-alt hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
