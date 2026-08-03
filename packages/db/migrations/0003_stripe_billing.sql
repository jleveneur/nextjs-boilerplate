CREATE TABLE "entitlement" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_price" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_product_id" text NOT NULL,
	"currency" text NOT NULL,
	"unit_amount_minor" integer,
	"interval" text,
	"active" boolean DEFAULT true NOT NULL,
	"entitlement_keys" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_product" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"stripe_product_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_customer" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_product_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customer" ADD CONSTRAINT "stripe_customer_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_entitlement__organization_id_feature_key" ON "entitlement" USING btree ("organization_id","feature_key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stripe_price__stripe_price_id" ON "stripe_price" USING btree ("stripe_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stripe_product__stripe_product_id" ON "stripe_product" USING btree ("stripe_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stripe_customer__organization_id" ON "stripe_customer" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_stripe_customer__stripe_customer_id" ON "stripe_customer" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription__stripe_subscription_id" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscription__organization_id" ON "subscription" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_subscription__organization_id_status" ON "subscription" USING btree ("organization_id","status");