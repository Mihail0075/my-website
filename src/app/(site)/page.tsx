import { SizeIcon } from "@/components/SizeIcon";
import { ButtonLink, Card } from "@/components/ui";
import { fmt, formatPrice, stationAddress, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { BASE_PRICE, LOCKER_DIMENSIONS, MAX_WEIGHT_KG, SIZES, WEIGHT_BRACKETS } from "@/lib/config";
import { getStations } from "@/lib/services/parcels";

export default async function HomePage() {
  const { lang, t } = await getI18n();
  const stations = await getStations();

  return (
    <>
      <section className="bg-brand-dark text-white">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:py-20 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-accent">{t.common.tagline}</p>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">{t.home.title}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">{t.home.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/send" size="lg" className="bg-accent text-ink hover:bg-[#d99700]">
                {t.home.ctaSend}
              </ButtonLink>
              <ButtonLink href="/track" size="lg" variant="secondary" className="border-white bg-transparent text-white hover:bg-white/10">
                {t.home.ctaTrack}
              </ButtonLink>
            </div>
          </div>
          <RouteGraphic from={stations[0] ? stationName(stations[0], lang) : ""} to={stations[1] ? stationName(stations[1], lang) : ""} />
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-3xl font-bold">{t.home.howTitle}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.how.map((step, i) => (
            <li key={step.t} className="rounded-[var(--radius-card)] border border-line bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold">{step.t}</h3>
              <p className="mt-2 text-muted">{step.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="prices" className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-3xl font-bold">{t.home.pricesTitle}</h2>
          <p className="mt-2 text-muted">{fmt(t.home.pricesNote, { max: MAX_WEIGHT_KG })}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="grid gap-4 sm:grid-cols-3">
              {SIZES.map((size) => {
                const d = LOCKER_DIMENSIONS[size];
                return (
                  <Card key={size} className="flex flex-col">
                    <SizeIcon size={size} />
                    <h3 className="mt-3 text-xl font-bold">
                      {t.sizes[size]} <span className="text-muted">({size})</span>
                    </h3>
                    <p className="text-sm text-muted">{fmt(t.sizes.dims, d)}</p>
                    <p className="mt-4 text-3xl font-extrabold text-brand">{formatPrice(BASE_PRICE[size], lang)}</p>
                  </Card>
                );
              })}
            </div>
            <Card>
              <h3 className="text-lg font-bold">{t.home.weightExtra}</h3>
              <table className="mt-3 w-full text-left">
                <tbody>
                  {WEIGHT_BRACKETS.map((b) => (
                    <tr key={b.upToKg} className="border-t border-line">
                      <td className="py-2">{fmt(t.home.upTo, { n: b.upToKg })}</td>
                      <td className="py-2 text-right font-semibold">+ {formatPrice(b.extra, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <div className="mt-6 rounded-[var(--radius-card)] border border-accent/50 bg-accent-soft p-5">
            <h3 className="font-bold">{t.home.courierTitle}</h3>
            <p className="mt-1 text-body">{t.home.courierText}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-3xl font-bold">{t.home.stationsTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {stations.map((s) => (
            <Card key={s.id}>
              <h3 className="text-xl font-bold">{stationName(s, lang)}</h3>
              <p className="text-muted">{stationAddress(s, lang)}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function RouteGraphic({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden="true" className="rounded-[var(--radius-card)] bg-white/5 p-6 ring-1 ring-white/10">
      <div className="flex items-center justify-between text-lg font-bold">
        <span>{from}</span>
        <span>{to}</span>
      </div>
      <div className="relative my-6 h-2 rounded-full bg-white/15">
        <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-accent" />
        <svg viewBox="0 0 48 32" className="absolute -top-5 left-[calc(66%-24px)] h-12 w-12">
          <rect x="2" y="4" width="44" height="20" rx="5" fill="#f2a900" />
          <rect x="7" y="8" width="10" height="7" rx="1.5" fill="#0a3a31" />
          <rect x="19" y="8" width="10" height="7" rx="1.5" fill="#0a3a31" />
          <rect x="31" y="8" width="10" height="7" rx="1.5" fill="#0a3a31" />
          <circle cx="12" cy="26" r="4" fill="#fff" />
          <circle cx="36" cy="26" r="4" fill="#fff" />
        </svg>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className={`h-7 rounded-sm ${i === 7 ? "bg-accent" : "bg-white/15"}`} />
        ))}
      </div>
    </div>
  );
}
