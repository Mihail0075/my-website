import QRCode from "qrcode";

/** Server-rendered QR code as inline SVG. */
export async function Qr({ value, label, className = "h-48 w-48" }: { value: string; label: string; className?: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });
  return <div role="img" aria-label={label} className={`[&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
