-- Health Certificate rejection foundation (2026-08-07).
--
-- Adds the three rejection-audit columns to horseparticipationincompetition
-- and replaces ck_horseparticipationincompetition_approvalconsistency with a
-- version that also governs the Rejected case. Approval and rejection are
-- modelled as mutually exclusive historical actions -- a row can carry
-- approval metadata or rejection metadata, never both, and the CHECK
-- constraint enforces that directly rather than relying on application code.
--
-- ck_horseparticipationincompetition_approvalstatus (the CHECK permitting
-- 'Pending'/'Approved'/'Rejected') is UNCHANGED -- it already allowed
-- 'Rejected' prior to any application code writing it (see the rejection
-- workflow audit, 2026-08-07: the value was added directly against live,
-- never via a committed migration, and never consumed).
--
-- Verified against live data before writing this migration (read-only,
-- 2026-08-07): every existing row already satisfies the tightened
-- constraint's Approved/Pending/NULL branches --
--   Approved: 4 rows, all 4 with hcapprovaldate set, all 4 with
--     hcapproversystemuserid set.
--   Pending: 3 rows, 0 with either approval field set.
--   NULL status: 47 rows, 0 with either approval field set.
-- The three new columns do not exist on any row yet, so they are implicitly
-- NULL everywhere and trivially satisfy every branch below. The ADD
-- CONSTRAINT step is expected to validate with zero data cleanup.
--
-- hcrejectiondate is DATE, deliberately matching hcapprovaldate's type
-- (verified, not guessed) rather than hcuploaddate's TIMESTAMPTZ: rejection
-- is a decision event of the same kind as approval (calendar-day granularity,
-- paired 1:1 with an actor column), not a file-arrival event.
--
-- hcrejectedbysystemuserid mirrors hcapproversystemuserid's FK exactly:
-- REFERENCES systemuser(systemuserid), default NO ACTION (this project's
-- established convention -- FKs here are overwhelmingly NO ACTION with
-- explicit child handling in procs, not CASCADE).
--
-- NOT YET APPLIED LIVE as of this commit. Apply via apply_migration only
-- after explicit sign-off, then re-read live (pg_get_constraintdef,
-- information_schema.columns) as proof it landed, per the standing DB-write
-- protocol. Companion proc changes: 245_usp_RejectHealthCertificate.sql (new),
-- 118_usp_SaveHealthCertificate.sql (modified in place, same signature),
-- 117_usp_GetHealthCertificatesForCompetition.sql and
-- 184_usp_GetHealthCertificatesForHostedCompetition.sql (DROP+CREATE, three
-- trailing columns appended, filtering/scope behavior unchanged).

ALTER TABLE public.horseparticipationincompetition
    ADD COLUMN IF NOT EXISTS hcrejectionreason text,
    ADD COLUMN IF NOT EXISTS hcrejectiondate date,
    ADD COLUMN IF NOT EXISTS hcrejectedbysystemuserid integer REFERENCES public.systemuser(systemuserid);

ALTER TABLE public.horseparticipationincompetition
    DROP CONSTRAINT IF EXISTS ck_horseparticipationincompetition_approvalconsistency;

ALTER TABLE public.horseparticipationincompetition
    ADD CONSTRAINT ck_horseparticipationincompetition_approvalconsistency CHECK (
        (
            hcapprovalstatus::text = 'Approved'
            AND hcapprovaldate IS NOT NULL
            AND hcapproversystemuserid IS NOT NULL
            AND hcrejectionreason IS NULL
            AND hcrejectiondate IS NULL
            AND hcrejectedbysystemuserid IS NULL
        )
        OR (
            hcapprovalstatus::text = 'Rejected'
            AND hcrejectionreason IS NOT NULL
            AND TRIM(hcrejectionreason) <> ''
            AND hcrejectiondate IS NOT NULL
            AND hcrejectedbysystemuserid IS NOT NULL
            AND hcapprovaldate IS NULL
            AND hcapproversystemuserid IS NULL
        )
        OR (
            (hcapprovalstatus IS NULL OR hcapprovalstatus::text = 'Pending')
            AND hcapprovaldate IS NULL
            AND hcapproversystemuserid IS NULL
            AND hcrejectionreason IS NULL
            AND hcrejectiondate IS NULL
            AND hcrejectedbysystemuserid IS NULL
        )
    );
