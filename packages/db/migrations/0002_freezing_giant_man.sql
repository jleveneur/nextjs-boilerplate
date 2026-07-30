CREATE TABLE "invoice" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_invoice__organization_id_number" ON "invoice" USING btree ("organization_id","number");--> statement-breakpoint
CREATE INDEX "idx_invoice__organization_id_created_at" ON "invoice" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_invoice__organization_id_status" ON "invoice" USING btree ("organization_id","status");