-- 001_member_status.sql
-- Members 5-status lifecycle: adds explicit status tracking + end-membership
-- follow-up reminders. Applied to Neon on 2026-08-18; recorded here so a fresh
-- environment can reproduce the schema.
--
-- NOTE: 'expired' is deliberately NOT a stored status. It is derived at query
-- time from (status = 'active' AND expiry_date <= now()), which keeps every
-- pre-existing member working unchanged under the 'active' default.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancellation_note TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_date BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_status_check'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_status_check
      CHECK (status IN ('active', 'on_hold', 'cancelled', 'inactive'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.member_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reminder_date BIGINT NOT NULL,
  reminder_note TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports fetchMemberReminders(memberId) and the pending-reminders count.
CREATE INDEX IF NOT EXISTS member_reminders_member_id_idx
  ON public.member_reminders (member_id);
CREATE INDEX IF NOT EXISTS member_reminders_pending_idx
  ON public.member_reminders (reminder_date) WHERE is_completed = false;
