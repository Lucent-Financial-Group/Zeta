CREATE TABLE IF NOT EXISTS agentic_org_control_plane_rate_limits (
  control_plane_rate_limit_id STRING NOT NULL,
  organization_id STRING NOT NULL,
  scope_kind STRING NOT NULL,
  scope_id STRING NULL,
  kind STRING NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  window_ends_at TIMESTAMPTZ NOT NULL,
  limit_count INT8 NOT NULL,
  used_count INT8 NOT NULL,
  requested_count INT8 NULL,
  PRIMARY KEY (organization_id, control_plane_rate_limit_id),
  CONSTRAINT agentic_org_control_plane_rate_limits_scope_kind_check CHECK (scope_kind IN ('organization', 'tenant', 'hat', 'provider')),
  CONSTRAINT agentic_org_control_plane_rate_limits_kind_check CHECK (kind IN ('tokens', 'tools', 'model_calls', 'external_provider_calls', 'release_actions')),
  INDEX control_plane_rate_limits_by_org_window (organization_id, window_started_at, window_ends_at),
  INDEX control_plane_rate_limits_by_org_scope (organization_id, scope_kind, scope_id)
);
