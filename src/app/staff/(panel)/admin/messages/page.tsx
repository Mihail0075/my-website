import { Alert } from "@/components/ui";
import { formatDateTime } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { requireStaffPage } from "@/lib/auth";
import { outbox } from "@/lib/services/notify";

export default async function MessagesPage() {
  await requireStaffPage(["ADMIN"]);
  const { lang, t } = await getI18n();
  const a = t.staff.admin;
  const mails = await outbox(100);
  return (
    <>
      <h1 className="mb-4 text-3xl font-extrabold">{a.messages}</h1>
      {!process.env.SMTP_HOST && <Alert className="mb-4">{a.messagesNote}</Alert>}
      <ul className="flex flex-col gap-3">
        {mails.map((m) => (
          <li key={m.id} className="rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
              <span>
                → {m.recipient} · {m.status}
              </span>
              <span>{formatDateTime(m.createdAt, lang)}</span>
            </div>
            <p className="mt-1 font-bold text-ink">{m.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-body">{m.body}</pre>
          </li>
        ))}
      </ul>
    </>
  );
}
