"use client";

/**
 * Large on-screen number pad for the touch kiosk. Digits are masked because
 * the screen is in a public place. Submits automatically at full length.
 */
export function Keypad({
  length,
  value,
  onChange,
  onSubmit,
  disabled,
  masked = true,
  label,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled?: boolean;
  masked?: boolean;
  label: string;
}) {
  function press(d: string) {
    if (disabled || value.length >= length) return;
    const next = value + d;
    onChange(next);
    if (next.length === length) onSubmit(next);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3" role="status" aria-label={`${label}: ${value.length}/${length}`}>
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={`flex h-20 w-16 items-center justify-center rounded-[var(--radius-std)] border-2 text-5xl font-bold ${
              i < value.length ? "border-brand bg-brand-soft text-ink" : "border-line bg-white text-transparent"
            }`}
          >
            {i < value.length ? (masked ? "•" : value[i]) : "0"}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            disabled={disabled}
            aria-label={k === "C" ? "clear" : k === "⌫" ? "backspace" : k}
            onClick={() => (k === "C" ? onChange("") : k === "⌫" ? onChange(value.slice(0, -1)) : press(k))}
            className={`h-24 w-28 select-none rounded-[var(--radius-card)] text-4xl font-bold shadow-sm transition active:scale-95 disabled:opacity-40 ${
              k === "C" || k === "⌫" ? "bg-surface-alt text-muted border border-line" : "bg-white text-ink border-2 border-line active:bg-brand-soft"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
