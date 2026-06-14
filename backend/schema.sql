-- Supabase SQL Schema for CampusBuddy

CREATE TABLE IF NOT EXISTS module_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    module_key VARCHAR(80) NOT NULL,
    module_mode VARCHAR(50) NOT NULL,
    source_url TEXT,
    refresh_interval INT DEFAULT 360, -- minutes
    config_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, module_key)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    module_key VARCHAR(80) NOT NULL DEFAULT 'global',
    role VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, user_id, module_key, role)
);

CREATE TABLE IF NOT EXISTS module_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    module_key VARCHAR(80) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    audience_roles JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals (
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

CREATE TABLE IF NOT EXISTS menu_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    dish_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, date, meal_type, user_id, dish_name)
);

-- Indexes for fast module and assistant querying
CREATE INDEX IF NOT EXISTS idx_meals_campus_date ON meals(campus_id, date);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(campus_id, user_id, module_key);
CREATE INDEX IF NOT EXISTS idx_module_notifications_campus ON module_notifications(campus_id, module_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_lookup ON menu_reviews(campus_id, date, meal_type);
