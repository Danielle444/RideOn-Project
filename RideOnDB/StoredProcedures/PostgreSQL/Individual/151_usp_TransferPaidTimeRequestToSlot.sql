-- ============================================================================
-- usp_TransferPaidTimeRequestToSlot
-- ============================================================================
-- Secretary moves a paidtimerequest to a different slot.
--   - If p_newslotincompid is NULL: unassign (set to Pending, clear assigned*)
--   - Otherwise: assign to the new slot (status='Assigned', set assigned*)
--
-- Ownership: secretary of the competition's host ranch. Both source request
-- and target slot must belong to the same competition.
--
-- Guards:
--   - Request exists, not paid, not cancelled
--   - Target slot exists in the same competition
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_transferpaidtimerequesttoslot(
    integer, integer, integer
);

CREATE OR REPLACE FUNCTION public.usp_transferpaidtimerequesttoslot(
    p_paidtimerequestid        integer,
    p_newslotincompid          integer,        -- NULL to unassign
    p_secretarysystemuserid    integer
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_paymentid           integer;
    v_status              varchar;
    v_requested_slot      integer;
    v_request_compid      integer;
    v_hostranchid         integer;
    v_target_compid       integer;
    v_target_slotdate     date;
    v_target_starttime    time;
    v_new_assignedstart   timestamptz;
BEGIN
    SELECT
        sr.paymentid,
        ptr.status,
        ptr.requestedcompslotid,
        slot_req.competitionid,
        c.hostranchid
    INTO
        v_paymentid,
        v_status,
        v_requested_slot,
        v_request_compid,
        v_hostranchid
    FROM public.paidtimerequest ptr
    JOIN public.servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    JOIN public.paidtimeslotincompetition slot_req
        ON slot_req.paidtimeslotincompid = ptr.requestedcompslotid
    JOIN public.competition c ON c.competitionid = slot_req.competitionid
    WHERE ptr.paidtimerequestid = p_paidtimerequestid;

    IF v_request_compid IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = v_hostranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Permission denied: not the host ranch secretary';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot transfer a cancelled request';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot transfer a paid request';
    END IF;

    -- Unassign branch
    IF p_newslotincompid IS NULL THEN
        UPDATE public.paidtimerequest
        SET status             = 'Pending',
            assignedcompslotid = NULL,
            assignedstarttime  = NULL,
            assignedorder      = NULL
        WHERE paidtimerequestid = p_paidtimerequestid;

        RETURN;
    END IF;

    -- Target slot validation
    SELECT pts.competitionid, pts.slotdate, pts.starttime
    INTO v_target_compid, v_target_slotdate, v_target_starttime
    FROM public.paidtimeslotincompetition pts
    WHERE pts.paidtimeslotincompid = p_newslotincompid;

    IF v_target_compid IS NULL THEN
        RAISE EXCEPTION 'Target slot not found';
    END IF;

    IF v_target_compid <> v_request_compid THEN
        RAISE EXCEPTION 'Target slot belongs to a different competition';
    END IF;

    v_new_assignedstart := (v_target_slotdate + v_target_starttime)::timestamptz;

    UPDATE public.paidtimerequest
    SET status             = 'Assigned',
        assignedcompslotid = p_newslotincompid,
        assignedstarttime  = v_new_assignedstart
        -- assignedorder kept as-is; auto-scheduler / drag flow re-orders if needed
    WHERE paidtimerequestid = p_paidtimerequestid;
END;
$$;
