-- CoachBook Phase 1 schema

CREATE TABLE coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_min int NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

CREATE TYPE session_status AS ENUM ('open', 'booked', 'cancelled', 'blocked');

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  availability_id uuid REFERENCES availability(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status session_status NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES parents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('coach', 'parent')),
  type text NOT NULL,
  message text NOT NULL,
  read bool NOT NULL DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('coach', 'parent')),
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- coaches: each coach can read/update their own row
CREATE POLICY "coach_select_own" ON coaches FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "coach_update_own" ON coaches FOR UPDATE
  USING (auth.uid() = id);

-- parents: coach can read their parents; parent can read their own row
CREATE POLICY "coach_read_parents" ON parents FOR SELECT
  USING (
    coach_id IN (SELECT id FROM coaches WHERE id = auth.uid())
    OR auth.uid() = id
  );

-- students: coach can read/write; parent can read their own children
CREATE POLICY "coach_manage_students" ON students FOR ALL
  USING (coach_id = auth.uid());
CREATE POLICY "parent_read_own_students" ON students FOR SELECT
  USING (parent_id = auth.uid());

-- availability: coach can manage their own
CREATE POLICY "coach_manage_availability" ON availability FOR ALL
  USING (coach_id = auth.uid());

-- sessions: coach can see their sessions; parent can see sessions their student is booked in
CREATE POLICY "coach_select_sessions" ON sessions FOR SELECT
  USING (coach_id = auth.uid());
CREATE POLICY "parent_select_sessions" ON sessions FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE parent_id = auth.uid()
    )
    OR status = 'open'
  );
-- writes only via service role (server)

-- notifications: users read their own
CREATE POLICY "read_own_notifications" ON notifications FOR SELECT
  USING (recipient_id = auth.uid());
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

-- fcm_tokens: users manage their own
CREATE POLICY "manage_own_fcm_tokens" ON fcm_tokens FOR ALL
  USING (user_id = auth.uid());
