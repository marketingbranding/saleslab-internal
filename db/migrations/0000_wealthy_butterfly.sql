CREATE TABLE "admins" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"label" varchar(200),
	"email_snapshot" varchar(200),
	"granted_by" varchar(128),
	"grant_source" text DEFAULT 'admin' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_by" varchar(128),
	"revoked_at" timestamp with time zone,
	CONSTRAINT "admins_grant_source_check" CHECK ("admins"."grant_source" in ('bootstrap', 'admin', 'migration'))
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"model_provider" text DEFAULT 'gemini' NOT NULL,
	"gemini_model" varchar(200),
	"ollama_model" varchar(200),
	"openrouter_model" varchar(200),
	"thinking_delay" integer DEFAULT 1500 NOT NULL,
	"frustration_sensitivity" real DEFAULT 5 NOT NULL,
	"ollama_url" text,
	"nested_config" jsonb,
	"updated_by" varchar(128),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_singleton_check" CHECK ("app_settings"."id" = 'global'),
	CONSTRAINT "app_settings_provider_check" CHECK ("app_settings"."model_provider" in ('gemini', 'ollama', 'openrouter')),
	CONSTRAINT "app_settings_thinking_delay_check" CHECK ("app_settings"."thinking_delay" between 0 and 30000),
	CONSTRAINT "app_settings_frustration_check" CHECK ("app_settings"."frustration_sensitivity" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"normalized_name" varchar(100) NOT NULL,
	"type" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_id_check" CHECK ("branches"."id" ~ '^[a-zA-Z0-9_-]+$'),
	CONSTRAINT "branches_type_check" CHECK ("branches"."type" is null or "branches"."type" in ('KC', 'KCP')),
	CONSTRAINT "branches_status_check" CHECK ("branches"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"branch_id" varchar(128) NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "migration_records" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "migration_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"migration_name" varchar(100) NOT NULL,
	"source_collection" varchar(100) NOT NULL,
	"source_document_id" varchar(256) NOT NULL,
	"target_table" varchar(100),
	"target_key" jsonb,
	"source_hash" varchar(64),
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(100),
	"error_detail" text,
	"metadata" jsonb,
	"started_at" timestamp with time zone,
	"migrated_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"rolled_back_at" timestamp with time zone,
	CONSTRAINT "migration_records_status_check" CHECK ("migration_records"."status" in ('pending', 'migrated', 'verified', 'failed', 'rolled_back')),
	CONSTRAINT "migration_records_attempt_check" CHECK ("migration_records"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "persona_submissions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"creator_user_id" varchar(128) NOT NULL,
	"creator_name_snapshot" varchar(100) NOT NULL,
	"creator_email_snapshot" varchar(200) NOT NULL,
	"creator_branch_id" varchar(128) NOT NULL,
	"creator_branch_name_snapshot" varchar(100) NOT NULL,
	"persona_payload" jsonb NOT NULL,
	"target_persona_id" varchar(128),
	"previous_submission_id" varchar(128),
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" varchar(128),
	"reviewed_by_name_snapshot" varchar(100),
	"rejection_reason" varchar(1000),
	CONSTRAINT "persona_submissions_id_check" CHECK ("persona_submissions"."id" ~ '^[a-zA-Z0-9_-]+$'),
	CONSTRAINT "persona_submissions_status_check" CHECK ("persona_submissions"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "persona_submissions_previous_check" CHECK ("persona_submissions"."previous_submission_id" is null or "persona_submissions"."previous_submission_id" <> "persona_submissions"."id"),
	CONSTRAINT "persona_submissions_public_payload_check" CHECK (not ("persona_submissions"."persona_payload" ?| array['hiddenInstructions', 'personaKnowledge', 'personaUnknowns']))
);
--> statement-breakpoint
CREATE TABLE "persona_version_secrets" (
	"persona_id" varchar(128) NOT NULL,
	"version" integer NOT NULL,
	"hidden_instructions" text DEFAULT '' NOT NULL,
	"persona_knowledge" text DEFAULT '' NOT NULL,
	"persona_unknowns" text DEFAULT '' NOT NULL,
	"updated_by" varchar(128),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persona_version_secrets_persona_id_version_pk" PRIMARY KEY("persona_id","version")
);
--> statement-breakpoint
CREATE TABLE "persona_versions" (
	"persona_id" varchar(128) NOT NULL,
	"version" integer NOT NULL,
	"source_submission_id" varchar(128),
	"creator_user_id" varchar(128),
	"creator_name_snapshot" varchar(100),
	"creator_email_snapshot" varchar(200),
	"creator_branch_id" varchar(128),
	"creator_branch_name_snapshot" varchar(100),
	"approved_by" varchar(128),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(100) NOT NULL,
	"gender" text NOT NULL,
	"age" smallint NOT NULL,
	"occupation" varchar(200) DEFAULT '' NOT NULL,
	"family_status" varchar(200) DEFAULT '' NOT NULL,
	"income_range" varchar(200) DEFAULT '' NOT NULL,
	"background_story" text DEFAULT '' NOT NULL,
	"current_situation" text DEFAULT '' NOT NULL,
	"goals" text DEFAULT '' NOT NULL,
	"pain_points" text DEFAULT '' NOT NULL,
	"motivations" text DEFAULT '' NOT NULL,
	"personality" varchar(100) NOT NULL,
	"emotional_level" smallint NOT NULL,
	"aggressiveness" smallint NOT NULL,
	"patience" smallint NOT NULL,
	"trust_level" smallint NOT NULL,
	"curiosity_level" smallint NOT NULL,
	"speech_style" varchar(100) NOT NULL,
	"tone" varchar(100) NOT NULL,
	"formality" varchar(100) NOT NULL,
	"speaking_speed" varchar(100) NOT NULL,
	"common_phrases" text DEFAULT '' NOT NULL,
	"common_objections" text DEFAULT '' NOT NULL,
	"trigger_conditions" text DEFAULT '' NOT NULL,
	"escalation_behavior" text DEFAULT '' NOT NULL,
	"legacy_data" jsonb,
	CONSTRAINT "persona_versions_persona_id_version_pk" PRIMARY KEY("persona_id","version"),
	CONSTRAINT "persona_versions_version_check" CHECK ("persona_versions"."version" >= 1),
	CONSTRAINT "persona_versions_gender_check" CHECK ("persona_versions"."gender" in ('Pria', 'Wanita')),
	CONSTRAINT "persona_versions_age_check" CHECK ("persona_versions"."age" between 18 and 100),
	CONSTRAINT "persona_versions_behavior_check" CHECK ("persona_versions"."emotional_level" between 1 and 10 and "persona_versions"."aggressiveness" between 1 and 10 and "persona_versions"."patience" between 1 and 10 and "persona_versions"."trust_level" between 1 and 10 and "persona_versions"."curiosity_level" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personas_id_check" CHECK ("personas"."id" ~ '^[a-zA-Z0-9_-]+$'),
	CONSTRAINT "personas_status_check" CHECK ("personas"."status" in ('approved', 'archived')),
	CONSTRAINT "personas_current_version_check" CHECK ("personas"."current_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "scenario_secrets" (
	"scenario_id" varchar(128) PRIMARY KEY NOT NULL,
	"hidden_rules" text DEFAULT '' NOT NULL,
	"updated_by" varchar(128),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_success_conditions" (
	"scenario_id" varchar(128) NOT NULL,
	"position" smallint NOT NULL,
	"condition" text NOT NULL,
	CONSTRAINT "scenario_success_conditions_scenario_id_position_pk" PRIMARY KEY("scenario_id","position"),
	CONSTRAINT "scenario_success_conditions_position_check" CHECK ("scenario_success_conditions"."position" >= 0),
	CONSTRAINT "scenario_success_conditions_value_check" CHECK (length(trim("scenario_success_conditions"."condition")) > 0)
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"persona_id" varchar(128),
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"target" text NOT NULL,
	"consumer_profile" text NOT NULL,
	"difficulty" text NOT NULL,
	"icon" varchar(100) NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"gender" text NOT NULL,
	"aggressiveness" smallint NOT NULL,
	"patience" smallint NOT NULL,
	"response_style" text NOT NULL,
	"first_speaker" text NOT NULL,
	"opening_message" text,
	"base_xp" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" varchar(128),
	"legacy_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenarios_id_check" CHECK ("scenarios"."id" ~ '^[a-zA-Z0-9_-]+$'),
	CONSTRAINT "scenarios_difficulty_check" CHECK ("scenarios"."difficulty" in ('Easy', 'Medium', 'Hard')),
	CONSTRAINT "scenarios_gender_check" CHECK ("scenarios"."gender" in ('Pria', 'Wanita')),
	CONSTRAINT "scenarios_behavior_check" CHECK ("scenarios"."aggressiveness" between 1 and 10 and "scenarios"."patience" between 1 and 10),
	CONSTRAINT "scenarios_response_style_check" CHECK ("scenarios"."response_style" in ('To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet')),
	CONSTRAINT "scenarios_first_speaker_check" CHECK ("scenarios"."first_speaker" in ('AI', 'Sales')),
	CONSTRAINT "scenarios_status_check" CHECK ("scenarios"."status" in ('draft', 'published', 'archived')),
	CONSTRAINT "scenarios_base_xp_check" CHECK ("scenarios"."base_xp" is null or "scenarios"."base_xp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session_evaluations" (
	"session_id" varchar(128) PRIMARY KEY NOT NULL,
	"evaluation_version" varchar(50) NOT NULL,
	"provider" varchar(100),
	"overall_score" smallint NOT NULL,
	"grade" varchar(50),
	"summary" text,
	"verdict" text NOT NULL,
	"strengths" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"weaknesses" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"key_objections_handled" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"missed_opportunities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"actionable_tips" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"suggested_responses" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"recommended_next_scenario" text,
	"action_plan" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"skill_scores" jsonb,
	"evaluation_details" jsonb,
	"raw_feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_evaluations_score_check" CHECK ("session_evaluations"."overall_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "session_transcript_turns" (
	"session_id" varchar(128) NOT NULL,
	"sequence" integer NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone,
	"source" varchar(100),
	"finalized" boolean DEFAULT true NOT NULL,
	"confidence" real,
	CONSTRAINT "session_transcript_turns_session_id_sequence_pk" PRIMARY KEY("session_id","sequence"),
	CONSTRAINT "session_transcript_turns_sequence_check" CHECK ("session_transcript_turns"."sequence" >= 0),
	CONSTRAINT "session_transcript_turns_role_check" CHECK ("session_transcript_turns"."role" in ('user', 'model')),
	CONSTRAINT "session_transcript_turns_text_check" CHECK (length("session_transcript_turns"."text") between 1 and 5000),
	CONSTRAINT "session_transcript_turns_confidence_check" CHECK ("session_transcript_turns"."confidence" is null or "session_transcript_turns"."confidence" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"scenario_id" varchar(128) NOT NULL,
	"persona_id" varchar(128),
	"persona_version" integer,
	"salesperson_name" varchar(100) NOT NULL,
	"score" smallint DEFAULT 0 NOT NULL,
	"analysis_status" text DEFAULT 'processing' NOT NULL,
	"analysis_attempt" integer DEFAULT 1 NOT NULL,
	"analysis_error" text,
	"analysis_provider" varchar(100),
	"transcript_quality" text,
	"input_digest" varchar(64),
	"scenario_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "sessions_id_check" CHECK ("sessions"."id" ~ '^[a-zA-Z0-9_-]+$'),
	CONSTRAINT "sessions_score_check" CHECK ("sessions"."score" between 0 and 100),
	CONSTRAINT "sessions_status_check" CHECK ("sessions"."analysis_status" in ('processing', 'completed', 'failed')),
	CONSTRAINT "sessions_attempt_check" CHECK ("sessions"."analysis_attempt" >= 1),
	CONSTRAINT "sessions_transcript_quality_check" CHECK ("sessions"."transcript_quality" is null or "sessions"."transcript_quality" in ('partial', 'complete')),
	CONSTRAINT "sessions_persona_pair_check" CHECK (("sessions"."persona_id" is null) = ("sessions"."persona_version" is null)),
	CONSTRAINT "sessions_input_digest_check" CHECK ("sessions"."input_digest" is null or "sessions"."input_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_public_snapshot_check" CHECK ("sessions"."scenario_snapshot" is null or not ("sessions"."scenario_snapshot" ?| array['hiddenRules', 'hiddenInstructions', 'personaKnowledge', 'personaUnknowns']))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"firebase_uid" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(200),
	"display_name" varchar(100),
	"photo_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'disabled', 'deleted'))
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_granted_by_users_firebase_uid_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_revoked_by_users_firebase_uid_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_firebase_uid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_created_by_users_firebase_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_updated_by_users_firebase_uid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_submissions" ADD CONSTRAINT "persona_submissions_creator_user_id_users_firebase_uid_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_submissions" ADD CONSTRAINT "persona_submissions_creator_branch_id_branches_id_fk" FOREIGN KEY ("creator_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_submissions" ADD CONSTRAINT "persona_submissions_target_persona_id_personas_id_fk" FOREIGN KEY ("target_persona_id") REFERENCES "public"."personas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_submissions" ADD CONSTRAINT "persona_submissions_reviewed_by_user_id_users_firebase_uid_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_submissions" ADD CONSTRAINT "persona_submissions_previous_fk" FOREIGN KEY ("previous_submission_id") REFERENCES "public"."persona_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_version_secrets" ADD CONSTRAINT "persona_version_secrets_updated_by_users_firebase_uid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_version_secrets" ADD CONSTRAINT "persona_version_secrets_version_fk" FOREIGN KEY ("persona_id","version") REFERENCES "public"."persona_versions"("persona_id","version") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_source_submission_id_persona_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."persona_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_creator_user_id_users_firebase_uid_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_creator_branch_id_branches_id_fk" FOREIGN KEY ("creator_branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_approved_by_users_firebase_uid_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_created_by_users_firebase_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_secrets" ADD CONSTRAINT "scenario_secrets_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_secrets" ADD CONSTRAINT "scenario_secrets_updated_by_users_firebase_uid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_success_conditions" ADD CONSTRAINT "scenario_success_conditions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_created_by_users_firebase_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_transcript_turns" ADD CONSTRAINT "session_transcript_turns_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_firebase_uid_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("firebase_uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_persona_version_fk" FOREIGN KEY ("persona_id","persona_version") REFERENCES "public"."persona_versions"("persona_id","version") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admins_active_idx" ON "admins" USING btree ("user_id") WHERE "admins"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "admins_granted_at_idx" ON "admins" USING btree ("granted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_normalized_name_unique" ON "branches" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "branches_status_name_idx" ON "branches" USING btree ("status","name");--> statement-breakpoint
CREATE INDEX "memberships_branch_idx" ON "memberships" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "migration_records_source_unique" ON "migration_records" USING btree ("migration_name","source_collection","source_document_id");--> statement-breakpoint
CREATE INDEX "migration_records_status_idx" ON "migration_records" USING btree ("migration_name","status");--> statement-breakpoint
CREATE INDEX "persona_submissions_creator_idx" ON "persona_submissions" USING btree ("creator_user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "persona_submissions_status_idx" ON "persona_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "persona_submissions_target_idx" ON "persona_submissions" USING btree ("target_persona_id","submitted_at");--> statement-breakpoint
CREATE INDEX "persona_submissions_branch_idx" ON "persona_submissions" USING btree ("creator_branch_id");--> statement-breakpoint
CREATE INDEX "persona_versions_submission_idx" ON "persona_versions" USING btree ("source_submission_id");--> statement-breakpoint
CREATE INDEX "persona_versions_branch_idx" ON "persona_versions" USING btree ("creator_branch_id");--> statement-breakpoint
CREATE INDEX "personas_status_updated_idx" ON "personas" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "scenarios_status_updated_idx" ON "scenarios" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "scenarios_persona_idx" ON "scenarios" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "session_evaluations_score_idx" ON "session_evaluations" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "session_evaluations_provider_created_idx" ON "session_evaluations" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_created_idx" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_scenario_created_idx" ON "sessions" USING btree ("scenario_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_status_updated_idx" ON "sessions" USING btree ("analysis_status","updated_at");--> statement-breakpoint
CREATE INDEX "sessions_persona_version_idx" ON "sessions" USING btree ("persona_id","persona_version");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email")) WHERE "users"."email" is not null;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");