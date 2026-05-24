CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500),
	"llm_provider" varchar(20) NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"context_stakeholder_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "areas_of_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"area_of_interest" varchar(255) NOT NULL,
	"alignment" varchar(255),
	"level_of_interest" varchar(50),
	"level_of_influence" varchar(50),
	"agency" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"year" integer,
	"award_name" varchar(500) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"start_date" date,
	"end_date" date,
	"org_group_name" varchar(500),
	"role" varchar(255),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"total_score" numeric(5, 2) NOT NULL,
	"recency_score" numeric(5, 2),
	"frequency_score" numeric(5, 2),
	"depth_score" numeric(5, 2),
	"breadth_score" numeric(5, 2),
	"segment" varchar(50),
	"churn_risk" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagement_scores_nric_hash_unique" UNIQUE("nric_hash")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"event_title" varchar(500) NOT NULL,
	"start_date" date,
	"end_date" date,
	"description" text,
	"organizer_agency" varchar(100),
	"partners" text,
	"event_type" varchar(100),
	"aoi_for_event" varchar(255),
	"role_of_youth" varchar(255),
	"attendance" varchar(50),
	"brief_notes" text,
	"additional_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"interaction_details" text,
	"meeting_date" date,
	"agency" varchar(100),
	"poc_staff_name" varchar(255),
	"poc_staff_email" varchar(255),
	"brief_notes" text,
	"attachment_urls" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overseas_representation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"year" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar(50),
	"case_status" varchar(50),
	"nric_hash" varchar(64) NOT NULL,
	"nric_encrypted" "bytea" NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"race" varchar(50),
	"sex" varchar(10),
	"email" varchar(255),
	"mobile_number" varchar(20),
	"residential_status" varchar(50),
	"year_of_birth" integer,
	"employer_org" varchar(255),
	"designation" varchar(255),
	"data_consent" boolean DEFAULT false,
	"linkedin_handle" varchar(255),
	"write_up" text,
	"reason_for_nomination" text,
	"rm_details" text,
	"source_agency" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "profiles_case_id_unique" UNIQUE("case_id"),
	CONSTRAINT "profiles_nric_hash_unique" UNIQUE("nric_hash")
);
--> statement-breakpoint
CREATE TABLE "relationship_managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"agency" varchar(100) NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "stakeholder_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nric_hash" varchar(64) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"source_id" uuid NOT NULL,
	"content_text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"table_target" varchar(50) NOT NULL,
	"file_size_bytes" integer,
	"row_count" integer,
	"rows_inserted" integer,
	"rows_updated" integer,
	"rows_failed" integer,
	"errors" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"full_name" varchar(255) NOT NULL,
	"agency" varchar(100) NOT NULL,
	"role" varchar(50) DEFAULT 'rm' NOT NULL,
	"azure_ad_oid" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_azure_ad_oid_unique" UNIQUE("azure_ad_oid")
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "areas_of_interest" ADD CONSTRAINT "areas_of_interest_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awards" ADD CONSTRAINT "awards_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community" ADD CONSTRAINT "community_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overseas_representation" ADD CONSTRAINT "overseas_representation_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_managers" ADD CONSTRAINT "relationship_managers_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_managers" ADD CONSTRAINT "relationship_managers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakeholder_embeddings" ADD CONSTRAINT "stakeholder_embeddings_nric_hash_profiles_nric_hash_fk" FOREIGN KEY ("nric_hash") REFERENCES "public"."profiles"("nric_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_history" ADD CONSTRAINT "upload_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conv_user" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_aoi_nric" ON "areas_of_interest" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_aoi_area" ON "areas_of_interest" USING btree ("area_of_interest");--> statement-breakpoint
CREATE INDEX "idx_aoi_agency" ON "areas_of_interest" USING btree ("agency");--> statement-breakpoint
CREATE INDEX "idx_awards_nric" ON "awards" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_community_nric" ON "community" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_community_org" ON "community" USING btree ("org_group_name");--> statement-breakpoint
CREATE INDEX "idx_engagement_segment" ON "engagement_scores" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "idx_engagement_score" ON "engagement_scores" USING btree ("total_score");--> statement-breakpoint
CREATE INDEX "idx_events_nric" ON "events" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_events_dates" ON "events" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_events_agency" ON "events" USING btree ("organizer_agency");--> statement-breakpoint
CREATE INDEX "idx_interactions_nric" ON "interactions" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_interactions_meeting_date" ON "interactions" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "idx_interactions_agency" ON "interactions" USING btree ("agency");--> statement-breakpoint
CREATE INDEX "idx_overseas_nric" ON "overseas_representation" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_profiles_case_status" ON "profiles" USING btree ("case_status");--> statement-breakpoint
CREATE INDEX "idx_profiles_source_agency" ON "profiles" USING btree ("source_agency");--> statement-breakpoint
CREATE INDEX "idx_rm_nric" ON "relationship_managers" USING btree ("nric_hash");--> statement-breakpoint
CREATE INDEX "idx_rm_agency" ON "relationship_managers" USING btree ("agency");--> statement-breakpoint
CREATE INDEX "idx_embeddings_nric" ON "stakeholder_embeddings" USING btree ("nric_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_embeddings_source_type" ON "stakeholder_embeddings" USING btree ("source_id","content_type");--> statement-breakpoint
CREATE INDEX "idx_upload_user" ON "upload_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upload_status" ON "upload_history" USING btree ("status");