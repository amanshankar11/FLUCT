ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'major';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incidents_severity_check'
  ) THEN
    ALTER TABLE incidents
      ADD CONSTRAINT incidents_severity_check
      CHECK (severity IN ('minor', 'major', 'critical'));
  END IF;
END $$;
