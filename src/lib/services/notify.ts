import nodemailer, { type Transporter } from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, stations, type Parcel, type Station } from "@/db/schema";
import { appUrl, LATE_FEE_DENARS, PICKUP_WINDOW_HOURS } from "@/lib/config";
import { fmt, formatDateTime, getDictFor, isLang, stationName, type Lang } from "@/i18n";

type Mail = { to: string; subject: string; lines: string[]; parcelId: string };

let transport: Transporter | null | undefined;

function getTransport() {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  transport = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transport;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function linkify(line: string) {
  return escapeHtml(line).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
}

/**
 * Every message is stored in the outbox (visible to admins). It is also sent
 * by SMTP when configured. A failed send never breaks the parcel flow.
 */
async function sendMail(mail: Mail) {
  const text = mail.lines.join("\n\n");
  const t = getTransport();
  let status = "LOGGED";
  let error: string | null = null;
  if (t) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM,
        to: mail.to,
        subject: mail.subject,
        text,
        html: mail.lines.map((l) => `<p>${linkify(l)}</p>`).join(""),
      });
      status = "SENT";
    } catch (err) {
      status = "FAILED";
      error = err instanceof Error ? err.message : String(err);
    }
  }
  await db.insert(notifications).values({
    parcelId: mail.parcelId,
    channel: "EMAIL",
    recipient: mail.to,
    subject: mail.subject,
    body: text,
    status,
    error,
  });
}

async function stationsOf(parcel: Parcel): Promise<{ origin: Station; destination: Station }> {
  const rows = await db.select().from(stations);
  const byId = new Map(rows.map((s) => [s.id, s]));
  return { origin: byId.get(parcel.originStationId)!, destination: byId.get(parcel.destinationStationId)! };
}

function langOf(parcel: Parcel): Lang {
  return isLang(parcel.lang) ? parcel.lang : "mk";
}

export function senderLink(parcel: Pick<Parcel, "senderToken">) {
  return `${appUrl()}/p/${parcel.senderToken}`;
}

export function pickupLink(parcel: Pick<Parcel, "pickupToken">) {
  return `${appUrl()}/pickup/${parcel.pickupToken}`;
}

/** After payment (or acceptance at the counter): parcel number, drop-off code and the recipient's PIN. */
export async function notifySenderConfirmed(parcel: Parcel) {
  if (!parcel.senderEmail) return;
  const lang = langOf(parcel);
  const e = getDictFor(lang).email;
  const { origin, destination } = await stationsOf(parcel);
  const lines = [
    fmt(e.senderIntro, { from: stationName(origin, lang), to: stationName(destination, lang) }),
    `${getDictFor(lang).sender.trackingNumber}: ${parcel.trackingNumber}`,
  ];
  if (parcel.status === "AWAITING_DROPOFF" && parcel.dropoffCode) {
    lines.push(fmt(e.senderDropoff, { code: parcel.dropoffCode, station: stationName(origin, lang) }));
  }
  lines.push(fmt(e.senderPin, { pin: parcel.pickupPin, name: parcel.recipientName }));
  lines.push(fmt(e.senderLink, { link: senderLink(parcel) }));
  lines.push(e.footer);
  await sendMail({ to: parcel.senderEmail, subject: fmt(e.senderSubject, { tracking: parcel.trackingNumber }), lines, parcelId: parcel.id });
}

/** The parcel is in a locker (or at the counter) at the destination. */
export async function notifyRecipientReady(parcel: Parcel, lockerNumber: number | null) {
  if (!parcel.recipientEmail) return;
  const lang = langOf(parcel);
  const e = getDictFor(lang).email;
  const { destination } = await stationsOf(parcel);
  const station = stationName(destination, lang);
  const lines = [
    lockerNumber !== null
      ? fmt(e.readyLocker, { sender: parcel.senderName, n: lockerNumber, station })
      : fmt(e.readyCounter, { sender: parcel.senderName, station }),
    fmt(e.readyPin, { pin: parcel.pickupPin, link: pickupLink(parcel) }),
  ];
  if (parcel.pickupDeadline) lines.push(fmt(e.readyDeadline, { date: formatDateTime(parcel.pickupDeadline, lang) }));
  lines.push(e.footer);
  await sendMail({ to: parcel.recipientEmail, subject: fmt(e.readySubject, { tracking: parcel.trackingNumber }), lines, parcelId: parcel.id });
}

export async function notifySenderDelivered(parcel: Parcel) {
  if (!parcel.senderEmail) return;
  const lang = langOf(parcel);
  const e = getDictFor(lang).email;
  await sendMail({
    to: parcel.senderEmail,
    subject: fmt(e.deliveredSubject, { tracking: parcel.trackingNumber }),
    lines: [fmt(e.deliveredText, { name: parcel.recipientName, date: formatDateTime(parcel.pickedUpAt ?? new Date(), lang) }), e.footer],
    parcelId: parcel.id,
  });
}

export async function notifyExpired(parcel: Parcel) {
  const lang = langOf(parcel);
  const e = getDictFor(lang).email;
  const subject = fmt(e.expiredSubject, { tracking: parcel.trackingNumber });
  const lines = [fmt(e.expiredText, { hours: PICKUP_WINDOW_HOURS, fee: LATE_FEE_DENARS }), e.footer];
  for (const to of [parcel.senderEmail, parcel.recipientEmail]) {
    if (to) await sendMail({ to, subject, lines, parcelId: parcel.id });
  }
}

export async function outbox(limit = 100) {
  return db.query.notifications.findMany({ orderBy: (n, { desc }) => [desc(n.createdAt)], limit });
}

export async function notificationsForParcel(parcelId: string) {
  return db.select().from(notifications).where(eq(notifications.parcelId, parcelId));
}
