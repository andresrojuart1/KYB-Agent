-- KYB Agent - Supabase Schema
-- Run this in your Supabase SQL editor

-- Track every follow-up message sent to a client
CREATE TABLE IF NOT EXISTS contacts_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cod_client VARCHAR(20) NOT NULL,
  segment CHAR(1) NOT NULL CHECK (segment IN ('A', 'B')),
  company VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by VARCHAR(255),
  zendly_workflow_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'responded', 'failed', 'opted_out', 'no_response')),
  response_summary TEXT,
  attempt_number INT DEFAULT 1,
  msg_language VARCHAR(10) DEFAULT 'EN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw webhook payloads received from Zendly
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zendly_workflow_id VARCHAR(255),
  cod_client VARCHAR(20),
  event_type VARCHAR(100),
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Summary of each /api/cron invocation, for visibility into the automated run
-- (the frontend has no other way to tell if the hourly trigger is healthy)
CREATE TABLE IF NOT EXISTS cron_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  skipped_reason VARCHAR(255),
  total_eligible INT,
  sent INT,
  skipped INT,
  needs_review INT,
  errors JSONB
);

-- App-wide settings (max follow-ups, channel preferences, cron)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(255)
);

-- Defaults
INSERT INTO settings (key, value) VALUES
  ('max_follow_ups', '3'),
  ('primary_channel', 'whatsapp'),
  ('cron_enabled', 'true'),
  ('cron_schedule', 'every_monday')
ON CONFLICT (key) DO NOTHING;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contacts_cod_client ON contacts_log(cod_client);
CREATE INDEX IF NOT EXISTS idx_contacts_sent_at ON contacts_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts_log(status);
CREATE INDEX IF NOT EXISTS idx_contacts_segment ON contacts_log(segment);
CREATE INDEX IF NOT EXISTS idx_webhook_workflow_id ON webhook_events(zendly_workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_at ON webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_runs_ran_at ON cron_runs(ran_at DESC);
