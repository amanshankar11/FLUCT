ALTER TABLE monitors ADD COLUMN IF NOT EXISTS sla_target NUMERIC(5,2) NOT NULL DEFAULT 99.90;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS ssl_expires_at TIMESTAMPTZ;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE monitors ADD COLUMN IF NOT EXISTS public_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS monitors_public_slug_idx ON monitors(public_slug) WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS maintenance_monitor_time_idx ON maintenance_windows(monitor_id, starts_at, ends_at);
