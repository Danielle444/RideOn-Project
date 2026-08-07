-- ============================================================================
-- usp_CancelPaidTimeRequestByPayer
-- ============================================================================
-- Payer cancels a paid-time request they pay for.
-- DIRECT cancel (no approval workflow) — same flow as admin cancel.
--
-- Ownership: payer must be bill.paidbypersonid via servicerequest.billid.
-- Guards:
--   - Not already cancelled
--   - Not paid (sr.paymentid IS NULL)
--   - Must be at least 24 hours before the assigned slot start time
--     (if no assigned slot yet → fall back to requested slot)
--
-- 24h-guard error coding (fix/payer-paidtime-24h-cancel-ux, 2026-08-07):
-- changed from a plain RAISE EXCEPTION to `USING ERRCODE = 'RN001'`. The DAL
-- (PaidTimeRequestDAL.CancelPaidTimeRequestByPayer) now catches RN001
-- specifically and throws BL.ValidationException with the clean message,
-- instead of falling through to the generic NpgsqlException handler that
-- wrapped it as a raw "Database error: ..." string surfaced verbatim to the
-- Hebrew UI. The mobile Payer Cancel button is also now disabled ahead of
-- this cutoff via usp_getpayercompetitionaccount_body's new canCancel field
-- (repo file 250), so this guard is now a backstop for direct API calls or
-- stale client state, not the primary UX signal — kept exactly as strict,
-- only the error-coding changed. The other three guards above (not found,
-- not owner, already cancelled/paid) are deliberately left as plain
-- exceptions — out of this slice's scope.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_cancelpaidtimerequestbypayer(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_cancelpaidtimerequestbypayer(
    p_paidtimerequestid   integer,
    p_payerpersonid       integer
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_personid  integer;
    v_paymentid       integer;
    v_status          varchar;
    v_slot_id         integer;
    v_slot_date       date;
    v_start_time      time;
    v_slot_start_ts   timestamptz;
    v_competitionid   integer;
BEGIN
    -- מזהה-התחרות של הבקשה (קבוע) - נגזר לפני הנעילה מהסלוט המבוקש.
    SELECT reqslot.competitionid
    INTO v_competitionid
    FROM public.paidtimerequest ptr
    JOIN public.paidtimeslotincompetition reqslot
        ON reqslot.paidtimeslotincompid = ptr.requestedcompslotid
    WHERE ptr.paidtimerequestid = p_paidtimerequestid;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    -- נעילת-ייעוץ ברמת התחרות: כל הקריאה הסמכותית והשינוי מתבצעים תחת הנעילה.
    PERFORM pg_advisory_xact_lock(1734, v_competitionid);

    SELECT
        b.paidbypersonid,
        sr.paymentid,
        ptr.status,
        COALESCE(ptr.assignedcompslotid, ptr.requestedcompslotid)
    INTO
        v_owner_personid,
        v_paymentid,
        v_status,
        v_slot_id
    FROM public.paidtimerequest ptr
    JOIN public.servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    JOIN public.bill b ON b.billid = sr.billid
    WHERE ptr.paidtimerequestid = p_paidtimerequestid;

    IF v_owner_personid IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    IF v_owner_personid <> p_payerpersonid THEN
        RAISE EXCEPTION 'Permission denied: payer does not own this paid time request';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Request already cancelled';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a paid request';
    END IF;

    -- 24-hour guard: payer can cancel only if slot starts at least 24h from now.
    -- errcode changed to RN001 on fix/payer-paidtime-24h-cancel-ux (2026-08-07):
    -- previously a plain exception, which the DAL's generic NpgsqlException
    -- catch wrapped as a raw "Database error: ..." string surfaced verbatim to
    -- the Hebrew UI. The mobile Payer Cancel button is now also disabled ahead
    -- of this cutoff (usp_getpayercompetitionaccount_body's new canCancel
    -- field), so this guard becomes a backstop for direct API calls / stale
    -- client state rather than the primary UX signal -- kept exactly as strict,
    -- only the error-coding changed.
    IF v_slot_id IS NOT NULL THEN
        SELECT slotdate, starttime
        INTO v_slot_date, v_start_time
        FROM public.paidtimeslotincompetition
        WHERE paidtimeslotincompid = v_slot_id;

        IF v_slot_date IS NOT NULL AND v_start_time IS NOT NULL THEN
            v_slot_start_ts := (v_slot_date + v_start_time)::timestamptz;

            IF v_slot_start_ts <= (now() + interval '24 hours') THEN
                RAISE EXCEPTION 'Cannot cancel within 24 hours of slot start time' USING ERRCODE = 'RN001';
            END IF;
        END IF;
    END IF;

    -- D5 = דחייה: אין ריקָלוק לסלוט-המקור המתפנה (פער בטוח, ראה 131).
    UPDATE public.paidtimerequest
    SET status             = 'Cancelled',
        assignedcompslotid = NULL,
        assignedstarttime  = NULL,
        assignedorder      = NULL,
        allocationorigin   = NULL   -- אין שיבוץ פעיל
    WHERE paidtimerequestid = p_paidtimerequestid;
END;
$$;
