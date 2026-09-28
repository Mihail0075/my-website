"use client";

import { useRouter } from "next/navigation";
import { SendForm, type StationOption } from "@/components/SendForm";

export function OnlineSend({ stations, defaultOriginId }: { stations: StationOption[]; defaultOriginId?: string }) {
  const router = useRouter();
  return <SendForm stations={stations} mode="online" defaultOriginId={defaultOriginId} onCreated={(p) => router.push(`/pay/${p.senderToken}`)} />;
}
