CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  service_name TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  status TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
