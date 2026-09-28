CREATE TYPE "public"."created_via" AS ENUM('ONLINE', 'KIOSK', 'COUNTER');--> statement-breakpoint
CREATE TYPE "public"."delivery_type" AS ENUM('LOCKER', 'COURIER');--> statement-breakpoint
CREATE TYPE "public"."locker_size" AS ENUM('S', 'M', 'L');--> statement-breakpoint
CREATE TYPE "public"."parcel_status" AS ENUM('AWAITING_PAYMENT', 'AWAITING_DROPOFF', 'AT_ORIGIN', 'IN_TRANSIT', 'READY_FOR_PICKUP', 'PICKED_UP', 'EXPIRED', 'RETURNED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD_POS', 'CARD_ONLINE', 'CARD_KIOSK');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'COUNTER', 'DRIVER');--> statement-breakpoint
CREATE TABLE "code_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid,
	"kind" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locker_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"locker_number" integer NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lockers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"size" "locker_size" NOT NULL,
	"parcel_id" uuid,
	"door_open" boolean DEFAULT false NOT NULL,
	"out_of_service" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lockers_parcel_id_unique" UNIQUE("parcel_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid NOT NULL,
	"type" text NOT NULL,
	"station_id" uuid,
	"locker_number" integer,
	"user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_number" text NOT NULL,
	"origin_station_id" uuid NOT NULL,
	"destination_station_id" uuid NOT NULL,
	"size" "locker_size" NOT NULL,
	"weight_grams" integer NOT NULL,
	"price_denars" integer NOT NULL,
	"payment_method" "payment_method",
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"payment_ref" text,
	"status" "parcel_status" NOT NULL,
	"delivery_type" "delivery_type" DEFAULT 'LOCKER' NOT NULL,
	"delivery_address" text,
	"sender_name" text NOT NULL,
	"sender_phone" text NOT NULL,
	"sender_email" text,
	"recipient_name" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_email" text,
	"note" text,
	"lang" text DEFAULT 'mk' NOT NULL,
	"pickup_pin" text NOT NULL,
	"dropoff_code" text,
	"sender_token" text NOT NULL,
	"pickup_token" text NOT NULL,
	"created_via" "created_via" NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"at_origin_at" timestamp with time zone,
	"in_transit_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"ready_notified_at" timestamp with time zone,
	"pickup_deadline" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parcels_tracking_number_unique" UNIQUE("tracking_number"),
	CONSTRAINT "parcels_sender_token_unique" UNIQUE("sender_token"),
	CONSTRAINT "parcels_pickup_token_unique" UNIQUE("pickup_token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kiosk_station_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_mk" text NOT NULL,
	"name_en" text NOT NULL,
	"address_mk" text NOT NULL,
	"address_en" text NOT NULL,
	"has_counter" boolean DEFAULT false NOT NULL,
	"kiosk_epoch" integer DEFAULT 1 NOT NULL,
	"controller_key_hmac" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"station_id" uuid,
	"password_hash" text NOT NULL,
	"service_pin_hmac" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_service_pin_hmac_unique" UNIQUE("service_pin_hmac")
);
--> statement-breakpoint
ALTER TABLE "code_attempts" ADD CONSTRAINT "code_attempts_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locker_commands" ADD CONSTRAINT "locker_commands_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_events" ADD CONSTRAINT "parcel_events_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_events" ADD CONSTRAINT "parcel_events_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_events" ADD CONSTRAINT "parcel_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_origin_station_id_stations_id_fk" FOREIGN KEY ("origin_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_destination_station_id_stations_id_fk" FOREIGN KEY ("destination_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kiosk_station_id_stations_id_fk" FOREIGN KEY ("kiosk_station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_attempts_lookup_idx" ON "code_attempts" USING btree ("kind","station_id","created_at");--> statement-breakpoint
CREATE INDEX "locker_commands_pending_idx" ON "locker_commands" USING btree ("station_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "lockers_station_number_uq" ON "lockers" USING btree ("station_id","number");--> statement-breakpoint
CREATE INDEX "parcel_events_parcel_idx" ON "parcel_events" USING btree ("parcel_id","created_at");--> statement-breakpoint
CREATE INDEX "parcels_status_idx" ON "parcels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "parcels_destination_status_idx" ON "parcels" USING btree ("destination_station_id","status");--> statement-breakpoint
CREATE INDEX "parcels_origin_status_idx" ON "parcels" USING btree ("origin_station_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "parcels_active_pin_uq" ON "parcels" USING btree ("destination_station_id","pickup_pin") WHERE "parcels"."status" in ('AWAITING_PAYMENT','AWAITING_DROPOFF','AT_ORIGIN','IN_TRANSIT','READY_FOR_PICKUP','EXPIRED');--> statement-breakpoint
CREATE UNIQUE INDEX "parcels_active_dropoff_uq" ON "parcels" USING btree ("origin_station_id","dropoff_code") WHERE "parcels"."status" in ('AWAITING_DROPOFF','AT_ORIGIN');