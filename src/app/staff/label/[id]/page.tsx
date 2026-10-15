import { notFound } from "next/navigation";
import { Qr } from "@/components/Qr";
import { PrintButton } from "@/components/staff/PrintButton";
import { formatDateTime, stationName } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { shortNo } from "@/components/ui";
import { getParcelRow, getStations } from "@/lib/services/parcels";

export const metadata = { title: "Label", robots: { index: false } };

/**
 * 100 × 150 mm shipping label. The QR holds the parcel number so the driver
 * can scan it into the driver screen.
 */
export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage(["COUNTER", "DRIVER"]);
  const { id } = await params;
  const { lang, t } = await getI18n();
  const parcel = /^[0-9a-f-]{36}$/.test(id) ? await getParcelRow(id) : null;
  if (!parcel) notFound();
  const stations = await getStations();
  const from = stations.find((s) => s.id === parcel.originStationId)!;
  const to = stations.find((s) => s.id === parcel.destinationStationId)!;
  const tn = parcel.trackingNumber;

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-surface-alt p-6 print:bg-white print:p-0">
      <style>{`@page { size: 100mm 150mm; margin: 0; }`}</style>
      <PrintButton />
      <div className="flex h-[150mm] w-[100mm] flex-col border-2 border-black bg-white p-[5mm] text-black print:border-0">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <span className="font-mono text-5xl font-black leading-none">{shortNo(parcel.shortNumber)}</span>
          <span className="text-right">
            <span className="block text-sm font-extrabold">{APP_NAME}</span>
            <span className="text-3xl font-black">{parcel.size}</span>
          </span>
        </div>
        {/* Inverted band for address delivery so it stands out on the shelf. */}
        <div
          className={`my-2 py-1 text-center text-2xl font-black uppercase tracking-wide ${
            parcel.deliveryType === "COURIER" ? "bg-black text-white" : "border-2 border-black"
          }`}
        >
          {parcel.deliveryType === "COURIER" ? `🛵 ${t.delivery.tagCourier}` : `🚌 ${t.delivery.tagLocker}`}
        </div>
        <div className="grid grid-cols-2 border-b-2 border-black py-2">
          <div>
            <p className="text-xs font-bold">{t.label.from}</p>
            <p className="text-xl font-bold">{stationName(from, lang)}</p>
          </div>
          <div>
            <p className="text-xs font-bold">{t.label.to}</p>
            <p className="text-4xl font-black leading-none">{stationName(to, lang)}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2">
          <Qr value={tn} label={tn} className="h-[38mm] w-[38mm]" />
          <p className="font-mono text-2xl font-bold tracking-widest">
            {tn.slice(0, 3)} {tn.slice(3, 6)} {tn.slice(6)}
          </p>
        </div>
        <div className="border-t-2 border-black pt-2 text-sm">
          <p>
            <span className="font-bold">{t.staff.admin.recipient}:</span> {parcel.recipientName} · ***{parcel.recipientPhone.slice(-3)}
          </p>
          {parcel.deliveryType === "COURIER" && (
            <p>
              <span className="font-bold">🛵</span> {parcel.deliveryAddress}
            </p>
          )}
          <p className="text-xs">
            {(parcel.weightGrams / 1000).toFixed(1)} kg · {formatDateTime(parcel.createdAt, lang)}
          </p>
        </div>
      </div>
    </main>
  );
}
