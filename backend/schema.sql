-- Supabase SQL Schema for Campus Copilot

CREATE TABLE connector_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    connector_name VARCHAR(50) NOT NULL,
    connector_mode VARCHAR(50) NOT NULL,
    source_url TEXT,
    refresh_interval INT DEFAULT 360, -- minutes
    config_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, connector_name)
);

CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner'
    items JSONB NOT NULL,
    source VARCHAR(50) NOT NULL,
    raw_payload TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, date, meal_type)
);

-- Indexes for fast AI querying
CREATE INDEX idx_meals_campus_date ON meals(campus_id, date);
