import type { LockerSize } from "@/db/schema";

/**
 * Schematic locker wall: every column gets an even share of each size
 * (e.g. 30 lockers → 5 columns of 3 S + 2 M + 1 L), so columns are equally tall
 * like a real locker bank. The real physical layout comes with the hardware.
 */
export function lockerColumns<T extends { number: number; size: LockerSize }>(lockers: T[], columns = 5): T[][] {
  const bySize = (size: LockerSize) => lockers.filter((l) => l.size === size).sort((a, b) => a.number - b.number);
  const cols: T[][] = Array.from({ length: columns }, () => []);
  for (const size of ["S", "M", "L"] as const) {
    const group = bySize(size);
    const per = Math.ceil(group.length / columns);
    group.forEach((l, i) => cols[Math.min(Math.floor(i / per), columns - 1)].push(l));
  }
  return cols.filter((c) => c.length > 0);
}
