-- Members 5-status lifecycle: explicit status tracking + end-membership
-- follow-up reminders.
--
-- NOTE: this was applied to the live Neon database by hand on 2026-08-18,
-- before migration tooling existed. On production, record it with
-- `npm run migrate:fake` rather than re-running it.
--
-- 'expired' is deliberately NOT a stored status. It is derived at query time
-- from (status = 'active' AND expiry_date <= now()), which keeps every
-- pre-existing member working unchanged under the 'active' default.

-- Up Migration

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

-- Down Migration
-- WARNING: destructive. Drops every cancellation note and every saved
-- reminder. Only run this on a practice branch, never on production.

DROP TABLE IF EXISTS public.member_reminders;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_status_check;

ALTER TABLE public.members
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS cancellation_note,
  DROP COLUMN IF EXISTS cancellation_date;
