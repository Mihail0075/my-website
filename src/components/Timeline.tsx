/**
 * Parcel history. Dates arrive pre-formatted from the server so the text is
 * identical during hydration (Node and browsers ship different ICU data).
 */
export function Timeline({ events }: { events: { id: string; label: string; when: string; detail?: string | null }[] }) {
  return (
    <ol className="relative flex flex-col gap-5 border-l-2 border-line pl-6">
      {[...events].reverse().map((e, i) => (
        <li key={e.id} className="relative">
          <span className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-white ${i === 0 ? "bg-brand" : "bg-field"}`} />
          <p className="font-semibold text-ink">{e.label}</p>
          <p className="text-sm text-muted">
            {e.when}
            {e.detail ? ` · ${e.detail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
