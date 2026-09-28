import type { LockerSize } from "@/db/schema";
import { lockerColumns } from "@/lib/lockerLayout";

const HEIGHT: Record<LockerSize, string> = { S: "h-9", M: "h-16", L: "h-28" };

/** Schematic of the locker wall with the open door highlighted, so people find it quickly. */
export function LockerMap({ lockers, open }: { lockers: { number: number; size: LockerSize }[]; open: number }) {
  return (
    <div aria-hidden="true" className="flex items-start justify-center gap-2 rounded-[var(--radius-card)] bg-ink/5 p-3">
      {lockerColumns(lockers).map((col, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {col.map((l) => (
            <div
              key={l.number}
              className={`flex w-16 items-center justify-center rounded-sm text-sm font-bold ${HEIGHT[l.size]} ${
                l.number === open ? "animate-pulse bg-accent text-ink ring-4 ring-accent/50" : "bg-white text-muted ring-1 ring-line"
              }`}
            >
              {l.number}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
