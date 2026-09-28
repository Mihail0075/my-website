export function SizeIcon({ size }: { size: "S" | "M" | "L" }) {
  const h = { S: 10, M: 20, L: 34 }[size];
  return (
    <svg aria-hidden="true" viewBox="0 0 48 40" className="h-10 w-12">
      <rect x="4" y={38 - h} width="40" height={h} rx="3" fill="#e3f1ed" stroke="#0b5d4b" strokeWidth="2" />
      <line x1="4" y1="39" x2="44" y2="39" stroke="#0b5d4b" strokeWidth="2" />
    </svg>
  );
}
