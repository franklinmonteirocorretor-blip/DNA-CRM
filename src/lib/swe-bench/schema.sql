-- SWE-Bench Dashboard: Database Schema
-- PostgreSQL 16 compatible
-- Alinhado com PRD seção 3 (Modelo de Dados)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main evaluations table
CREATE TABLE IF NOT EXISTS swe_bench_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  benchmark_type TEXT NOT NULL CHECK (benchmark_type IN ('verified', 'lite', 'full')),
  resolved_rate NUMERIC(5,2) NOT NULL CHECK (resolved_rate >= 0 AND resolved_rate <= 100),
  avg_time_seconds NUMERIC(10,2) NOT NULL,
  total_tasks INTEGER NOT NULL CHECK (total_tasks > 0),
  pass_k INTEGER NOT NULL DEFAULT 1 CHECK (pass_k IN (1, 10, 100)),
  date_added TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for filter queries
CREATE INDEX IF NOT EXISTS idx_evaluations_benchmark ON swe_bench_evaluations(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_evaluations_model ON swe_bench_evaluations(model_name);
CREATE INDEX IF NOT EXISTS idx_evaluations_resolved_rate ON swe_bench_evaluations(resolved_rate DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON swe_bench_evaluations(date_added DESC);

-- Full text search index for model_name
CREATE INDEX IF NOT EXISTS idx_evaluations_model_trgm ON swe_bench_evaluations
USING GIN (model_name gin_trgm_ops);

-- Enable pg_trgm extension (if available)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_swe_bench_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_swe_bench_updated_at ON swe_bench_evaluations;
CREATE TRIGGER trig_swe_bench_updated_at
  BEFORE UPDATE ON swe_bench_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_swe_bench_updated_at();

-- Comments
COMMENT ON TABLE swe_bench_evaluations IS 'SWE-Bench evaluation results — leaderboard data';
COMMENT ON COLUMN swe_bench_evaluations.benchmark_type IS 'verified, lite, or full';
COMMENT ON COLUMN swe_bench_evaluations.resolved_rate IS 'Percentage of issues resolved (0-100)';
COMMENT ON COLUMN swe_bench_evaluations.avg_time_seconds IS 'Average time per task in seconds';
COMMENT ON COLUMN swe_bench_evaluations.pass_k IS 'Pass@k value: 1, 10, or 100';
COMMENT ON COLUMN swe_bench_evaluations.metadata IS 'Model provider info, family, params, etc.';