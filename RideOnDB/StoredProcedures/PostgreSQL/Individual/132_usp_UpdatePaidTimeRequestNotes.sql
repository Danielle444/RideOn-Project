-- ============================================================================
-- usp_UpdatePaidTimeRequest - edit notes/price-type/requested-slot on a paid
-- time request.
-- ============================================================================
-- NOT YET APPLIED LIVE. Prepared for review; apply only after explicit
-- sign-off, via apply_migration, then re-read live as proof it landed (per
-- the standing DB-write protocol).
--
-- DRIFT NOTE (2026-08-07): the previous committed version of this file was
-- STALE relative to live - it was missing v_hostranchid and the host-ranch
-- price-catalog validation block ("New price catalog item does not belong to
-- the competition host ranch"), which IS live today (confirmed via
-- pg_get_functiondef). This file has been reconciled to the exact live body
-- FIRST, with only the authorization block changed on top of that - never
-- hand-reconstructed. Every comment/branch below the authorization block is
-- copied verbatim from the live definition.
--
-- AUTHORIZATION CHANGE (2026-08-07, Admin Paid-Time Unify): the previous
-- authorization check required the CALLER to equal the request's original
-- creator (sr.orderedbysystemuserid = p_OrderedBySystemUserId). Confirmed a
-- real product bug: AdminCompetitionPayerAccountScreen shows a payer's paid
-- time items regardless of which admin created them (proc 212 scopes by
-- payerpersonid, not creator), so any admin who didn't personally create a
-- colleague's request could never edit it through this proc, even with a
-- legitimate ranch-admin role.
--
-- New model, approved by Oren 2026-08-07: derive the request's TRUE ranch
-- server-side from paidtimerequest -> servicerequest.horseid -> horse.ranchid
-- (the SAME scoping convention already used by usp_insertpaidtimerequest,
-- usp_getmypaidtimerequestsforcompetition, usp_getpayercompetitionaccount,
-- and the new usp_getpaidtimerequestforedit) - NEVER a client-supplied
-- ranchid, since this proc's own signature has no ranch parameter to trust.
-- Require the caller (p_OrderedBySystemUserId - always the calling admin's
-- own personId, server-derived from JWT claims, never client-set - the
-- parameter is NOT renamed here to avoid a signature change) to hold an
-- Approved 'אדמין חווה' personranchrole at that derived ranch. This is the
-- exact pattern already live in usp_admineditstallbooking /
-- usp_admincancelstallbooking / usp_admineditentry / usp_admincancelentry
-- (verified live, all four identical shape) - not a new authorization
-- design, a reuse of an already-shipped one.
--
-- sr.orderedbysystemuserid (the creator) is read ONLY for the not-found
-- null-check below and is NEVER compared for authorization and NEVER
-- rewritten by this proc - it remains purely historical/audit data.
--
-- Explicitly NOT widened to RanchWorker, Payer, an admin of an unrelated
-- ranch, or any other authenticated caller - the role check requires
-- 'אדמין חווה' specifically, Approved specifically, at the derived ranch
-- specifically.
--
-- Signature and return type UNCHANGED (still 5 params -> void) - this is a
-- body-only CREATE OR REPLACE, no DROP required.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_updatepaidtimerequest(p_paidtimerequestid integer, p_orderedbysystemuserid integer, p_notes text, p_pricecatalogid integer, p_requestedcompslotid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_ordered_by         INTEGER;
    v_horseid            INTEGER;
    v_horse_ranchid      INTEGER;
    v_paymentid          INTEGER;
    v_status             TEXT;
    v_billid             INTEGER;
    v_current_pcid       INTEGER;
    v_current_slotid     INTEGER;
    v_start_ts           TIMESTAMP WITH TIME ZONE;
    v_hours              NUMERIC;
    v_old_price          NUMERIC;
    v_new_price          NUMERIC;
    v_catalog_ranchid    INTEGER;
    v_current_competition INTEGER;
    v_new_slot_competition INTEGER;
    v_notes_provided     BOOLEAN := (p_Notes IS NOT NULL);
    v_competitionenddate  DATE;
    v_hostranchid         INTEGER;
BEGIN
    SELECT
        sr.orderedbysystemuserid,
        sr.horseid,
        sr.paymentid,
        ptr.status,
        sr.billid,
        ptr.pricecatalogid,
        ptr.requestedcompslotid,
        COALESCE(
            ptr.assignedstarttime,
            (req_slot.slotdate + req_slot.starttime)::TIMESTAMP WITH TIME ZONE
        ),
        req_slot.competitionid
    INTO
        v_ordered_by,
        v_horseid,
        v_paymentid,
        v_status,
        v_billid,
        v_current_pcid,
        v_current_slotid,
        v_start_ts,
        v_current_competition
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    INNER JOIN paidtimeslotincompetition req_slot
        ON req_slot.paidtimeslotincompid = ptr.requestedcompslotid
    WHERE ptr.paidtimerequestid = p_PaidTimeRequestId;

    IF v_ordered_by IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    -- מזהה-החווה הסמכותי של הבקשה נגזר מחוות הסוס (לא נשלח מהלקוח) - אותו
    -- שדה שכבר משמש לסקופ יצירה/קריאה (usp_insertpaidtimerequest,
    -- usp_getmypaidtimerequestsforcompetition, usp_getpayercompetitionaccount,
    -- usp_getpaidtimerequestforedit).
    SELECT h.ranchid
    INTO v_horse_ranchid
    FROM public.horse h
    WHERE h.horseid = v_horseid;

    -- הרשאת עריכה: כל אדמין חווה מאושר בחוות הבקשה - לא רק היוצר המקורי.
    -- p_OrderedBySystemUserId הוא תמיד ה-personId של הקורא בפועל (claims),
    -- לא ערך מהלקוח. sr.orderedbysystemuserid נשאר היסטורי/ביקורת בלבד ואינו
    -- נכתב מחדש כאן.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_OrderedBySystemUserId
          AND prr.ranchid = v_horse_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch admin for this request''s ranch' USING ERRCODE = 'RN001';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot edit a cancelled request';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit a paid request via this endpoint';
    END IF;

    -- מועד סיום התחרות (מזהה-התחרות קבוע, נגזר פעם אחת כאן; NOT NULL בסכמה).
    -- נקרא לשני הענפים למטה - הבדיקה עצמה נשארת ממוקדת-ענף (לא בדיקה גורפת).
    -- hostranchid נוסף לאותה שאילתה (עמודה אחת נוספת) כדי לבסס את בדיקת
    -- ranchid-of-price-catalog בענף שינוי המחיר למטה על חוות המארחת, לא על
    -- ranchid כלשהו אחר.
    SELECT c.competitionenddate, c.hostranchid
    INTO v_competitionenddate, v_hostranchid
    FROM public.competition c
    WHERE c.competitionid = v_current_competition;

    -- נעילת-ייעוץ ברמת התחרות (מזהה-התחרות קבוע, נקרא לעיל לפני הנעילה).
    PERFORM pg_advisory_xact_lock(1734, v_current_competition);

    v_hours := EXTRACT(EPOCH FROM (v_start_ts - NOW())) / 3600.0;

    -- שינוי סוג פייד-טיים (מחיר) - רק >24h.
    IF p_PriceCatalogId IS NOT NULL AND p_PriceCatalogId <> v_current_pcid THEN
        IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
            RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
        END IF;

        IF v_hours <= 24 THEN
            RAISE EXCEPTION 'Cannot change price catalog within 24 hours of start time';
        END IF;

        SELECT pc.itemprice, pc.ranchid
        INTO v_new_price, v_catalog_ranchid
        FROM pricecatalog pc
        WHERE pc.pricecatalogid = p_PriceCatalogId
          AND pc.isactive = TRUE;

        IF v_new_price IS NULL THEN
            RAISE EXCEPTION 'New price catalog item not found or inactive';
        END IF;

        -- New: pricing is host-ranch-uniform (same rule as creation). The
        -- new price catalog row must belong to the competition's host
        -- ranch. v_catalog_ranchid was already being fetched above; it was
        -- simply never checked before this fix.
        IF v_catalog_ranchid <> v_hostranchid THEN
            RAISE EXCEPTION 'New price catalog item does not belong to the competition host ranch';
        END IF;

        SELECT pc.itemprice
        INTO v_old_price
        FROM pricecatalog pc
        WHERE pc.pricecatalogid = v_current_pcid;

        UPDATE paidtimerequest
        SET pricecatalogid = p_PriceCatalogId
        WHERE paidtimerequestid = p_PaidTimeRequestId;

        UPDATE bill
        SET amounttopay = amounttopay + (v_new_price - COALESCE(v_old_price, 0))
        WHERE billid = v_billid;
    END IF;

    -- שינוי סלוט מבוקש - חייב להיות מאותה תחרות.
    IF p_RequestedCompSlotId IS NOT NULL AND p_RequestedCompSlotId <> v_current_slotid THEN
        IF (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > v_competitionenddate THEN
            RAISE EXCEPTION 'Competition has already ended' USING ERRCODE = 'RN001';
        END IF;

        SELECT competitionid
        INTO v_new_slot_competition
        FROM paidtimeslotincompetition
        WHERE paidtimeslotincompid = p_RequestedCompSlotId;

        IF v_new_slot_competition IS NULL THEN
            RAISE EXCEPTION 'New requested slot not found';
        END IF;

        IF v_new_slot_competition <> v_current_competition THEN
            RAISE EXCEPTION 'Cannot move request to a slot in a different competition';
        END IF;

        -- מבטלים שיבוץ קיים כי הסלוט המבוקש השתנה - השיבוץ מחדש דרך האלגוריתם.
        -- תיקון פגם: קובעים גם status='Pending' (קודם נותר 'Assigned' עם שיבוץ NULL)
        -- ומאפסים allocationorigin, כדי לקיים את אילוץ מחזור-החיים.
        -- D5 = דחייה: אין ריקָלוק לסלוט-המקור המתפנה (פער בטוח).
        UPDATE paidtimerequest
        SET requestedcompslotid = p_RequestedCompSlotId,
            assignedcompslotid  = NULL,
            assignedstarttime   = NULL,
            assignedorder       = NULL,
            status              = 'Pending',
            allocationorigin    = NULL
        WHERE paidtimerequestid = p_PaidTimeRequestId;
    END IF;

    -- עדכון notes - מתבצע רק אם הועבר במפורש.
    IF v_notes_provided THEN
        UPDATE paidtimerequest
        SET notes = NULLIF(p_Notes, '')
        WHERE paidtimerequestid = p_PaidTimeRequestId;
    END IF;
END;
$function$
