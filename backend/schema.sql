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

CREATE TABLE IF NOT EXISTS user_designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    module_key VARCHAR(80) NOT NULL DEFAULT 'global',
    designation VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, user_id, module_key, designation)
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

CREATE TABLE IF NOT EXISTS menu_item_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    item_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, user_id, date, meal_type, item_name)
);

CREATE TABLE IF NOT EXISTS menu_sick_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    delivery_location TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    notes TEXT,
    status VARCHAR(40) DEFAULT 'requested',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    date DATE,
    meal_type VARCHAR(50),
    item_name TEXT,
    status VARCHAR(40) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campus_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    course_id TEXT NOT NULL,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    term TEXT NOT NULL,
    professor_id TEXT NOT NULL,
    professor_name TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, course_id)
);

CREATE TABLE IF NOT EXISTS campus_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    building TEXT NOT NULL,
    floor TEXT NOT NULL,
    capacity INT DEFAULT 0,
    room_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, room_id)
);

CREATE TABLE IF NOT EXISTS campus_room_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    room_id TEXT NOT NULL,
    room_name TEXT NOT NULL,
    title TEXT NOT NULL,
    booking_type VARCHAR(40) DEFAULT 'class',
    start_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(40) DEFAULT 'confirmed',
    course_id TEXT,
    course_code TEXT,
    course_name TEXT,
    professor_id TEXT,
    professor_name TEXT,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campus_student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    program TEXT NOT NULL,
    batch TEXT NOT NULL,
    hostel TEXT NOT NULL,
    room_number TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    guardian_relation TEXT NOT NULL,
    guardian_email TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    curfew_violations INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campus_id, user_id)
);

CREATE TABLE IF NOT EXISTS campus_leave_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    departure_time TEXT NOT NULL,
    return_time TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    destination TEXT NOT NULL,
    reason TEXT NOT NULL,
    guardian_relation TEXT NOT NULL,
    guardian_email TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    security_notes TEXT
);

-- Indexes for fast module and assistant querying
CREATE INDEX IF NOT EXISTS idx_meals_campus_date ON meals(campus_id, date);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(campus_id, user_id, module_key);
CREATE INDEX IF NOT EXISTS idx_user_designations_lookup ON user_designations(campus_id, user_id, module_key);
CREATE INDEX IF NOT EXISTS idx_module_notifications_campus ON module_notifications(campus_id, module_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_lookup ON menu_reviews(campus_id, date, meal_type);
CREATE INDEX IF NOT EXISTS idx_menu_item_ratings_lookup ON menu_item_ratings(campus_id, date, meal_type);
CREATE INDEX IF NOT EXISTS idx_menu_sick_meals_lookup ON menu_sick_meals(campus_id, date, status);
CREATE INDEX IF NOT EXISTS idx_menu_feedback_lookup ON menu_feedback(campus_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campus_courses_lookup ON campus_courses(campus_id, course_id);
CREATE INDEX IF NOT EXISTS idx_campus_rooms_lookup ON campus_rooms(campus_id, room_id);
CREATE INDEX IF NOT EXISTS idx_campus_room_bookings_calendar ON campus_room_bookings(campus_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_campus_student_profiles_rooms ON campus_student_profiles(campus_id, hostel, room_number);
CREATE INDEX IF NOT EXISTS idx_campus_leave_lookup ON campus_leave_applications(campus_id, user_id, status, from_date);
