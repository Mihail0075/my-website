import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Short parcel number shown in big print on labels and screens so staff find a
 * parcel quickly: 1…9999, then starts again from 1.
 */
export const parcelShortNumber = pgSequence("parcel_short_number_seq", { startWith: 1, minValue: 1, maxValue: 9999, increment: 1, cycle: true });

export const lockerSize = pgEnum("locker_size", ["S", "M", "L"]);

export const parcelStatus = pgEnum("parcel_status", [
  "AWAITING_PAYMENT", // created online / at kiosk, not paid yet
  "AWAITING_DROPOFF", // paid, sender still has to put it in a locker at the origin station
  "AT_ORIGIN", // at the origin station (in a locker or held at the counter), waiting for the driver
  "IN_TRANSIT", // driver took it, on the bus
  "READY_FOR_PICKUP", // in a locker (or at the counter) at the destination station
  "PICKED_UP",
  "EXPIRED", // not picked up in time, PIN no longer opens the locker
  "RETURNED", // driver removed an expired parcel from the locker
  "CANCELLED",
]);

export const paymentMethod = pgEnum("payment_method", ["CASH", "CARD_POS", "CARD_ONLINE", "CARD_KIOSK"]);
export const paymentStatus = pgEnum("payment_status", ["PENDING", "PAID"]);
export const deliveryType = pgEnum("delivery_type", ["LOCKER", "COURIER"]);
export const createdVia = pgEnum("created_via", ["ONLINE", "KIOSK", "COUNTER"]);
export const userRole = pgEnum("user_role", ["ADMIN", "COUNTER", "DRIVER"]);

/** Statuses in which a parcel holds its pickup PIN (PINs are unique per destination among these). */
export const PIN_HOLDING_STATUSES = [
  "AWAITING_PAYMENT",
  "AWAITING_DROPOFF",
  "AT_ORIGIN",
  "IN_TRANSIT",
  "READY_FOR_PICKUP",
  "EXPIRED",
] as const;

export const stations = pgTable("stations", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameMk: text("name_mk").notNull(),
  nameEn: text("name_en").notNull(),
  addressMk: text("address_mk").notNull(),
  addressEn: text("address_en").notNull(),
  hasCounter: boolean("has_counter").notNull().default(false),
  /** Bumping this signs out every kiosk device registered for the station. */
  kioskEpoch: integer("kiosk_epoch").notNull().default(1),
  /** HMAC of the key the locker hardware controller uses to call /api/hw. */
  controllerKeyHmac: text("controller_key_hmac"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  /** Home station for counter staff. */
  stationId: uuid("station_id").references(() => stations.id),
  passwordHash: text("password_hash").notNull(),
  /** HMAC of the driver's 6-digit service PIN used at the kiosk. */
  servicePinHmac: text("service_pin_hmac").unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  /** SHA-256 of the random token stored in the cookie. */
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Kiosk sessions (driver service PIN) are short-lived and bound to one station. */
  kioskStationId: uuid("kiosk_station_id").references(() => stations.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parcels = pgTable(
  "parcels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackingNumber: text("tracking_number").notNull().unique(),
    shortNumber: integer("short_number")
      .notNull()
      .default(sql`nextval('parcel_short_number_seq')`),
    originStationId: uuid("origin_station_id")
      .notNull()
      .references(() => stations.id),
    destinationStationId: uuid("destination_station_id")
      .notNull()
      .references(() => stations.id),
    size: lockerSize("size").notNull(),
    weightGrams: integer("weight_grams").notNull(),
    priceDenars: integer("price_denars").notNull(),
    paymentMethod: paymentMethod("payment_method"),
    paymentStatus: paymentStatus("payment_status").notNull().default("PENDING"),
    paymentRef: text("payment_ref"),
    status: parcelStatus("status").notNull(),
    deliveryType: deliveryType("delivery_type").notNull().default("LOCKER"),
    deliveryAddress: text("delivery_address"),
    senderName: text("sender_name").notNull(),
    senderPhone: text("sender_phone").notNull(),
    senderEmail: text("sender_email"),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    recipientEmail: text("recipient_email"),
    note: text("note"),
    /** Language for e-mails about this parcel. */
    lang: text("lang").notNull().default("mk"),
    pickupPin: text("pickup_pin").notNull(),
    dropoffCode: text("dropoff_code"),
    /** Secret for the sender's confirmation page (/p/…). */
    senderToken: text("sender_token").notNull().unique(),
    /** Secret in the recipient's QR code (/pickup/…). */
    pickupToken: text("pickup_token").notNull().unique(),
    createdVia: createdVia("created_via").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    atOriginAt: timestamp("at_origin_at", { withTimezone: true }),
    inTransitAt: timestamp("in_transit_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    /** When the recipient was told the parcel is ready (sent after the driver confirms, or by the sweeper). */
    readyNotifiedAt: timestamp("ready_notified_at", { withTimezone: true }),
    pickupDeadline: timestamp("pickup_deadline", { withTimezone: true }),
    pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("parcels_status_idx").on(t.status),
    index("parcels_destination_status_idx").on(t.destinationStationId, t.status),
    index("parcels_origin_status_idx").on(t.originStationId, t.status),
    uniqueIndex("parcels_active_pin_uq")
      .on(t.destinationStationId, t.pickupPin)
      .where(
        sql`${t.status} in ('AWAITING_PAYMENT','AWAITING_DROPOFF','AT_ORIGIN','IN_TRANSIT','READY_FOR_PICKUP','EXPIRED')`,
      ),
    uniqueIndex("parcels_active_dropoff_uq")
      .on(t.originStationId, t.dropoffCode)
      .where(sql`${t.status} in ('AWAITING_DROPOFF','AT_ORIGIN')`),
  ],
);

export const lockers = pgTable(
  "lockers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id),
    number: integer("number").notNull(),
    size: lockerSize("size").notNull(),
    /** The parcel currently inside (single source of truth for occupancy). */
    parcelId: uuid("parcel_id")
      .unique()
      .references(() => parcels.id),
    doorOpen: boolean("door_open").notNull().default(false),
    outOfService: boolean("out_of_service").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lockers_station_number_uq").on(t.stationId, t.number)],
);

export const parcelEvents = pgTable(
  "parcel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelId: uuid("parcel_id")
      .notNull()
      .references(() => parcels.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    stationId: uuid("station_id").references(() => stations.id),
    lockerNumber: integer("locker_number"),
    userId: uuid("user_id").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("parcel_events_parcel_idx").on(t.parcelId, t.createdAt)],
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  parcelId: uuid("parcel_id").references(() => parcels.id, { onDelete: "set null" }),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  /** SENT (delivered to SMTP), LOGGED (no provider configured) or FAILED. */
  status: text("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Failed and successful code entries, used to lock the keypad after too many wrong tries. */
export const codeAttempts = pgTable(
  "code_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Station for kiosk codes; null for staff password logins. */
    stationId: uuid("station_id").references(() => stations.id),
    /** PICKUP, DROPOFF, SERVICE_PIN or LOGIN:<username>. */
    kind: text("kind").notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("code_attempts_lookup_idx").on(t.kind, t.stationId, t.createdAt)],
);

/** Queue of commands for the locker hardware controller at each station. */
export const lockerCommands = pgTable(
  "locker_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id),
    lockerNumber: integer("locker_number").notNull(),
    action: text("action").notNull(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [index("locker_commands_pending_idx").on(t.stationId, t.status)],
);

export type Station = typeof stations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Parcel = typeof parcels.$inferSelect;
export type Locker = typeof lockers.$inferSelect;
export type ParcelEvent = typeof parcelEvents.$inferSelect;
export type LockerSize = (typeof lockerSize.enumValues)[number];
export type ParcelStatus = (typeof parcelStatus.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type UserRole = (typeof userRole.enumValues)[number];
