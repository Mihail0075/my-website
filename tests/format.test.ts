import { describe, expect, it } from "vitest";
import { formatDateTime, formatPrice, formatTime, formatWeight } from "@/i18n";
import { lockerColumns } from "@/lib/lockerLayout";

describe("formatting", () => {
  it("formats prices per language", () => {
    expect(formatPrice(250, "mk")).toBe("250 ден.");
    expect(formatPrice(1500, "mk")).toBe("1.500 ден.");
    expect(formatPrice(1500, "en")).toBe("MKD 1,500");
  });

  it("formats dates in Skopje time, 24-hour", () => {
    const d = new Date("2026-09-28T12:05:00Z"); // 14:05 in Skopje (CEST)
    expect(formatDateTime(d, "mk")).toBe("28.09.2026 14:05");
    expect(formatDateTime(d, "en")).toBe("28/09/2026 14:05");
    expect(formatTime(d)).toBe("14:05");
    expect(formatTime(new Date("2026-01-10T23:30:00Z"))).toBe("00:30"); // CET, next day
  });

  it("formats weights", () => {
    expect(formatWeight(1500, "mk")).toBe("1,5 kg");
    expect(formatWeight(3000, "en")).toBe("3 kg");
  });
});

describe("locker wall layout", () => {
  it("gives every column the same mix of sizes", () => {
    let n = 1;
    const lockers = [
      ...Array.from({ length: 15 }, () => ({ number: n++, size: "S" as const })),
      ...Array.from({ length: 10 }, () => ({ number: n++, size: "M" as const })),
      ...Array.from({ length: 5 }, () => ({ number: n++, size: "L" as const })),
    ];
    const cols = lockerColumns(lockers);
    expect(cols).toHaveLength(5);
    expect(cols[0].map((l) => l.number)).toEqual([1, 2, 3, 16, 17, 26]);
    expect(cols[4].map((l) => l.number)).toEqual([13, 14, 15, 24, 25, 30]);
  });
});
