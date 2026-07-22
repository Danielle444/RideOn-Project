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
    v_source_slotid       integer;
    v_target_compid       integer;
    v_target_slotdate     date;
    v_target_starttime    time;
    v_target_ispublished  boolean;
    v_new_assignedstart   timestamptz;
    v_new_order           integer;
BEGIN
    SELECT
        sr.paymentid,
        ptr.status,
        ptr.requestedcompslotid,
        ptr.assignedcompslotid,
        slot_req.competitionid,
        c.hostranchid
    INTO
        v_paymentid,
        v_status,
        v_requested_slot,
        v_source_slotid,
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

    -- נעילת-ייעוץ ברמת התחרות (מזהה-התחרות קבוע, נקרא לעיל לפני הנעילה).
    PERFORM pg_advisory_xact_lock(1734, v_request_compid);

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

    -- ענף שחרור (target NULL): החזרה ל-Pending + איפוס שדות + origin NULL.
    IF p_newslotincompid IS NULL THEN
        UPDATE public.paidtimerequest
        SET status             = 'Pending',
            assignedcompslotid = NULL,
            assignedstarttime  = NULL,
            assignedorder      = NULL,
            allocationorigin   = NULL
        WHERE paidtimerequestid = p_paidtimerequestid;

        -- D2: ריקָלוק לסלוט-המקור המתפנה (מחסן מחדש את יתר המשובצים).
        IF v_source_slotid IS NOT NULL THEN
            PERFORM public.usp_recalculatepaidtimeslotassignments(v_hostranchid, v_source_slotid);
        END IF;

        RETURN;
    END IF;

    -- אימות סלוט-יעד: קיים, אותה תחרות, ואינו מפורסם.
    SELECT pts.competitionid, pts.slotdate, pts.starttime, COALESCE(pts.ispublished, FALSE)
    INTO v_target_compid, v_target_slotdate, v_target_starttime, v_target_ispublished
    FROM public.paidtimeslotincompetition pts
    WHERE pts.paidtimeslotincompid = p_newslotincompid;

    IF v_target_compid IS NULL THEN
        RAISE EXCEPTION 'Target slot not found';
    END IF;

    IF v_target_compid <> v_request_compid THEN
        RAISE EXCEPTION 'Target slot belongs to a different competition';
    END IF;

    IF v_target_ispublished THEN
        RAISE EXCEPTION 'Cannot transfer into a published slot';
    END IF;

    -- מיקום פנוי בסלוט-היעד: MAX(assignedorder)+1 (פערים אינם ממוחזרים),
    -- למניעת התנגשות במיקום (יתחזק ע"י אינדקס-המיקום הייחודי החלקי בשלב המעבר).
    SELECT COALESCE(MAX(o.assignedorder), 0) + 1
    INTO v_new_order
    FROM public.paidtimerequest o
    WHERE o.assignedcompslotid = p_newslotincompid
      AND o.status = 'Assigned'
      AND o.paidtimerequestid <> p_paidtimerequestid;

    -- קובעים זמן-התחלה תקין (תחילת הסלוט) כבר בעדכון, כדי שהשורה לעולם
    -- לא תהיה 'Assigned' עם assignedstarttime = NULL. הריקָלוק שלאחר מכן מדייק.
    v_new_assignedstart := (v_target_slotdate + v_target_starttime)::timestamptz;

    UPDATE public.paidtimerequest
    SET status             = 'Assigned',
        assignedcompslotid = p_newslotincompid,
        assignedstarttime  = v_new_assignedstart,
        assignedorder      = v_new_order,
        allocationorigin   = 'Manual'
    WHERE paidtimerequestid = p_paidtimerequestid;

    -- D2: ריקָלוק לשני הסלוטים - היעד (מדייק זמנים, מאמת קיבולת) והמקור.
    -- אם קיבולת היעד לא מספיקה, הריקָלוק זורק חריגה וכל ההעברה מתבטלת.
    PERFORM public.usp_recalculatepaidtimeslotassignments(v_hostranchid, p_newslotincompid);

    IF v_source_slotid IS NOT NULL AND v_source_slotid <> p_newslotincompid THEN
        PERFORM public.usp_recalculatepaidtimeslotassignments(v_hostranchid, v_source_slotid);
    END IF;
END;
$$;
