import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { TrackForm } from "./TrackForm";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.track.title };
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  if (n) redirect(`/track/${encodeURIComponent(n.replace(/\s/g, ""))}`);
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-3xl font-extrabold">{t.track.title}</h1>
      <Card>
        <TrackForm />
      </Card>
    </div>
  );
}
