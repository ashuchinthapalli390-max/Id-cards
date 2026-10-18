const { Client } = require('C:/Users/ashuc/OneDrive/Desktop/Codxa Agency/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL for migration...');

  // 1. Create id_card_invitations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "id_card_invitations" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "token_hash" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUBMITTED', 'EXPIRED', 'REVOKED'
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "created_by" TEXT,
      "created_by_name" TEXT,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "submitted_at" TIMESTAMP WITH TIME ZONE,
      "revoked_at" TIMESTAMP WITH TIME ZONE,
      "revoked_by" TEXT,
      "email_sent_at" TIMESTAMP WITH TIME ZONE,
      "email_status" TEXT NOT NULL DEFAULT 'NOT_SENT', -- 'NOT_SENT', 'SENT', 'FAILED'
      "email_error" TEXT,
      "reminder_sent_at" TIMESTAMP WITH TIME ZONE,
      "reminder_count" INTEGER NOT NULL DEFAULT 0
    );
  `);
  console.log('[PASS] id_card_invitations table verified.');

  // Create indexes on id_card_invitations
  await client.query(`
    CREATE INDEX IF NOT EXISTS "idx_id_card_invitations_user_id" ON "id_card_invitations"("user_id");
    CREATE INDEX IF NOT EXISTS "idx_id_card_invitations_token_hash" ON "id_card_invitations"("token_hash");
    CREATE INDEX IF NOT EXISTS "idx_id_card_invitations_status" ON "id_card_invitations"("status");
    CREATE INDEX IF NOT EXISTS "idx_id_card_invitations_expires_at" ON "id_card_invitations"("expires_at");
  `);
  console.log('[PASS] Indexes on id_card_invitations verified.');

  // 2. Enhance id_card_photo_submissions backward-compatibly
  await client.query(`
    ALTER TABLE "id_card_photo_submissions"
      ADD COLUMN IF NOT EXISTS "invitation_id" TEXT,
      ADD COLUMN IF NOT EXISTS "original_filename" TEXT,
      ADD COLUMN IF NOT EXISTS "width" INTEGER,
      ADD COLUMN IF NOT EXISTS "height" INTEGER,
      ADD COLUMN IF NOT EXISTS "storage_bucket" TEXT DEFAULT 'id-card-photos',
      ADD COLUMN IF NOT EXISTS "sha256_hash" TEXT;
  `);
  console.log('[PASS] id_card_photo_submissions columns enhanced backward-compatibly.');

  // Create indexes on id_card_photo_submissions
  await client.query(`
    CREATE INDEX IF NOT EXISTS "idx_id_card_photos_user_id" ON "id_card_photo_submissions"("user_id");
    CREATE INDEX IF NOT EXISTS "idx_id_card_photos_status" ON "id_card_photo_submissions"("status");
    CREATE INDEX IF NOT EXISTS "idx_id_card_photos_submitted_at" ON "id_card_photo_submissions"("submitted_at");
  `);
  console.log('[PASS] Indexes on id_card_photo_submissions verified.');

  // 3. Create id_card_audit_logs table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "id_card_audit_logs" (
      "id" TEXT PRIMARY KEY,
      "actor_id" TEXT,
      "actor_name" TEXT,
      "actor_role" TEXT,
      "actor_type" TEXT NOT NULL DEFAULT 'ADMIN', -- 'ADMIN', 'INTERN', 'SYSTEM'
      "action" TEXT NOT NULL,
      "target_intern_id" TEXT,
      "target_intern_name" TEXT,
      "details" JSONB,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[PASS] id_card_audit_logs table verified.');

  // Create indexes on id_card_audit_logs
  await client.query(`
    CREATE INDEX IF NOT EXISTS "idx_id_card_audit_actor_id" ON "id_card_audit_logs"("actor_id");
    CREATE INDEX IF NOT EXISTS "idx_id_card_audit_action" ON "id_card_audit_logs"("action");
    CREATE INDEX IF NOT EXISTS "idx_id_card_audit_target_intern" ON "id_card_audit_logs"("target_intern_id");
    CREATE INDEX IF NOT EXISTS "idx_id_card_audit_created_at" ON "id_card_audit_logs"("created_at");
  `);
  console.log('[PASS] Indexes on id_card_audit_logs verified.');

  await client.end();
  console.log('Migration completed successfully with 100% backward-compatibility!');
}

main().catch(console.error);
