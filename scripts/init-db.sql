-- Arketic Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS arketic;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Set search path
SET search_path TO arketic, public;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA arketic TO arketic;
GRANT ALL PRIVILEGES ON SCHEMA monitoring TO arketic;

-- Create monitoring tables
CREATE TABLE IF NOT EXISTS monitoring.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

CREATE TABLE IF NOT EXISTS monitoring.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL,
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for monitoring
CREATE INDEX IF NOT EXISTS idx_health_checks_service_timestamp 
ON monitoring.health_checks(service_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp 
ON monitoring.performance_metrics(metric_name, timestamp DESC);

-- Insert initial data
INSERT INTO monitoring.health_checks (service_name, status, response_time_ms, details)
VALUES ('database', 'healthy', 0, '{"message": "Database initialized successfully"}')
ON CONFLICT DO NOTHING;

-- Commit changes
COMMIT;