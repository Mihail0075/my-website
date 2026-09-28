"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code rendered in the browser (for values that only exist after an action). */
export function QrClient({ value, label, className = "h-48 w-48" }: { value: string; label: string; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [value]);
  return <div role="img" aria-label={label} className={`bg-white [&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
