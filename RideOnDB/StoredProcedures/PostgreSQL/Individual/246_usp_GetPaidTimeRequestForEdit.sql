-- ============================================================================
-- usp_GetPaidTimeRequestForEdit - single-row, by-id read powering the unified
-- edit form (Admin Paid-Time Unify CAP-1, 2026-08-07).
-- ============================================================================
-- NOT YET APPLIED LIVE. Prepared for review; apply only after explicit
-- sign-off, via apply_migration, then re-read live as proof it landed (per
-- the standing DB-write protocol).
--
-- Purpose: both AdminCompetitionPaidTimesScreen (rows sourced from
-- usp_getmypaidtimerequestsforcompetition, scoped by orderedbysystemuserid)
-- and AdminCompetitionPayerAccountScreen (rows sourced from proc 212,
-- usp_getpayercompetitionaccount, scoped by payerpersonid) need to open the
-- SAME rich edit form. Proc 212's paidTimes[] block never carried
-- canModify/canCancel/priceCatalogId/requestedCompSlotId/
-- riderFederationMemberId/paidByPersonId (confirmed live, 2026-08-07), which
-- is what made the payer-account screen's edit path dead. Rather than adding
-- those fields to two structurally different list procs (and keeping them in
-- sync forever), both screens now fetch hydration + gating for ONE request by
-- id from this proc on edit-click.
--
-- Deliberately NOT scoped by orderedbysystemuserid: unlike
-- usp_getmypaidtimerequestsforcompetition (creator's own requests only), this
-- proc must serve a payer-account admin who may not have created the request
-- - read access here is scoped by RANCH only (via the horse), matching how
-- usp_getpayercompetitionaccount itself scopes paidtime_items
-- (h.ranchid = p_ranchid). This mirrors the same widened-editor design
-- approved for usp_updatepaidtimerequest's authorization fix (see
-- 132_usp_UpdatePaidTimeRequestNotes.sql) - a read-only lookup needs no
-- weaker a scope than the write it feeds.
--
-- canmodify/cancancel/hoursuntilstart formulas are copied verbatim from the
-- LIVE usp_getmypaidtimerequestsforcompetition body (captured via
-- pg_get_functiondef 2026-08-07, not the stale repo copy - see the drift note
-- in 132_usp_UpdatePaidTimeRequestNotes.sql): ispaid = sr.paymentid IS NOT
-- NULL; cancancel = NOT ispaid AND status <> 'Cancelled'; canmodify =
-- cancancel AND hoursuntilstart > 24; hoursuntilstart = hours from now() to
-- COALESCE(assignedstarttime, requested slot's own date+starttime). Never
-- re-derived independently - any future change to the gating rule must be
-- applied to both procs together or they will silently disagree.
--
-- Returns zero rows (not an exception) when the id doesn't exist or the
-- horse's ranch doesn't match p_ranchid - the BL/controller layer maps an
-- empty result to a 404, matching the read-only-list convention used
-- elsewhere in this proc family rather than a RAISE EXCEPTION (which is
-- reserved for the mutating procs in this domain).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpaidtimerequestforedit(p_paidtimerequestid integer, p_ranchid integer)
 RETURNS TABLE(
    paidtimerequestid integer,
    requestedcompslotid integer,
    pricecatalogid integer,
    horseid integer,
    riderfederationmemberid integer,
    coachfederationmemberid integer,
    paidbypersonid integer,
    notes text,
    status text,
    hoursuntilstart numeric,
    canmodify boolean,
    cancancel boolean
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    RETURN QUERY
    SELECT
        ptr.paidtimerequestid,
        ptr.requestedcompslotid,
        ptr.pricecatalogid,
        sr.horseid,
        sr.riderfederationmemberid,
        sr.coachfederationmemberid,
        b.paidbypersonid,
        ptr.notes::TEXT,
        ptr.status::TEXT,
        ROUND(
            EXTRACT(EPOCH FROM (
                COALESCE(
                    ptr.assignedstarttime,
                    (req_slot.slotdate + req_slot.starttime)::TIMESTAMP WITH TIME ZONE
                ) - v_now
            )) / 3600.0,
            2
        ) AS hoursuntilstart,
        (
            NOT (sr.paymentid IS NOT NULL)
            AND ptr.status <> 'Cancelled'
            AND EXTRACT(EPOCH FROM (
                COALESCE(
                    ptr.assignedstarttime,
                    (req_slot.slotdate + req_slot.starttime)::TIMESTAMP WITH TIME ZONE
                ) - v_now
            )) / 3600.0 > 24
        ) AS canmodify,
        (
            NOT (sr.paymentid IS NOT NULL)
            AND ptr.status <> 'Cancelled'
        ) AS cancancel
    FROM paidtimerequest ptr
    INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    INNER JOIN horse h ON h.horseid = sr.horseid
    INNER JOIN bill b ON b.billid = sr.billid
    INNER JOIN paidtimeslotincompetition req_slot ON req_slot.paidtimeslotincompid = ptr.requestedcompslotid
    WHERE ptr.paidtimerequestid = p_paidtimerequestid
      AND h.ranchid = p_ranchid;
END;
$function$
