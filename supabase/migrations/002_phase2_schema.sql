-- Phase 2 schema additions

-- Feature 1: Parent onboarding via invite link
CREATE TABLE coach_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  email       text,
  used_at     timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE coach_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_manage_invites" ON coach_invites FOR ALL
  USING (coach_id = auth.uid());

-- Feature 2: Cancellation — add columns to sessions
ALTER TABLE sessions
  ADD COLUMN cancelled_by_role text CHECK (cancelled_by_role IN ('coach', 'parent')),
  ADD COLUMN cancellation_reason text,
  ADD COLUMN booked_parent_id uuid REFERENCES parents(id) ON DELETE SET NULL;

-- Feature 3: Waitlist — add columns
ALTER TABLE waitlist
  ADD COLUMN position int NOT NULL DEFAULT 0,
  ADD COLUMN notified_at timestamptz;

ALTER TABLE waitlist
  ADD CONSTRAINT waitlist_unique_parent_session UNIQUE (session_id, parent_id);

CREATE INDEX waitlist_session_position_idx ON waitlist (session_id, position);

-- Feature 4: 24hr reminders dedup log
CREATE TABLE reminder_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sent_at     timestamptz DEFAULT now(),
  UNIQUE (session_id)
);

ALTER TABLE reminder_log ENABLE ROW LEVEL SECURITY;

-- Feature 5: Coach message inbox
CREATE TABLE messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  parent_id    uuid REFERENCES parents(id) ON DELETE CASCADE,
  subject      text NOT NULL,
  body         text NOT NULL,
  sent_at      timestamptz DEFAULT now()
);

CREATE TABLE message_reads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  parent_id  uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  read_at    timestamptz DEFAULT now(),
  UNIQUE (message_id, parent_id)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_messages" ON messages FOR ALL
  USING (coach_id = auth.uid());

CREATE POLICY "parent_read_messages" ON messages FOR SELECT
  USING (
    parent_id = auth.uid()
    OR (
      parent_id IS NULL
      AND coach_id IN (SELECT coach_id FROM parents WHERE id = auth.uid())
    )
  );

CREATE POLICY "parent_manage_reads" ON message_reads FOR ALL
  USING (parent_id = auth.uid());
