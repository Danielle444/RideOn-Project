-- ============================================================================
-- usp_SecretaryUpdateStallBooking
-- ============================================================================
-- Direct update of a stall booking by the host secretary (dates, notes, tack
-- flag, horse). Updates billcharge amount when day-count changes.
--
-- Ownership: caller must hold 'מזכירת חווה מארחת' at the booking's ranch.
--
-- Guards:
--   - Booking exists
--   - Not paid
--   - No pending change request
--   - New dates are valid (end >= start)
--
-- REVIEW-GATE CORRECTION (2026-08-02): added pg_advisory_xact_lock(1735, ...)
-- for the booking's old and/or new horseid (ascending order, deduplicated)
-- before the UPDATE -- one of five confirmed writers of
-- stallbooking.startdate/enddate/horseid that must share this lock
-- convention so a concurrent competition reschedule cannot race this
-- procedure for the same horse. See 187_usp_RescheduleCompetition.sql's
-- header for the full audit.
--
-- REVIEW-GATE CORRECTION (2026-08-02, owner decision): added a horse-overlap
-- validation for the resulting horseid, using the EXACT predicate already
-- verified in usp_createstallbookingchangerequest (189) -- self-exclusion via
-- stallbookingid <> p_stallbookingid, and the same "not superseded by an
-- approved cancellation" exclusion. This closes the SEQUENTIAL
-- (non-concurrent) double-booking gap noted in the prior review-gate pass:
-- this procedure could previously set overlapping dates/horseid with zero
-- concurrency involved, independent of the race the advisory lock above
-- closes. Tack bookings (p_horseid IS NULL) are unaffected -- the check only
-- runs when p_horseid IS NOT NULL, mirroring the same signal already used to
-- decide whether to take the lock at all.
--
-- REVIEW-GATE CORRECTION (2026-08-03, owner decision): the overlap check was
-- previously scoped to a same-competition-only `pr.competitionid = ...`
-- filter, which let the same horse hold overlapping bookings across two
-- DIFFERENT competitions -- a state usp_reschedulecompetition (187) would
-- then refuse to move, since 187's own overlap rule was always
-- cross-competition. A horse cannot physically occupy two stalls at once
-- regardless of which competition either booking belongs to, so the
-- competition-id restriction is removed here; the check is now GLOBAL by
-- horseid across all competitions. (v_competitionid is still fetched above
-- for no other current use -- left in place rather than pulled out, to keep
-- this an overlap-predicate-only change with no unrelated churn.) See 187's
-- header for the full cross-competition consistency note.
--
-- RANCH-MODEL CORRECTION (2026-08-05, final Phase 1 SQL blocker): this was
-- the last confirmed UPDATE...SET horseid site left unaudited (live search
-- across every function's SET clause on 2026-08-05 confirms exactly one
-- other UPDATE touches stallbooking.horseid at all --
-- usp_reschedulecompetition -- and it never does; it only shifts
-- startdate/enddate). Two pre-existing gaps, neither previously guarded:
-- (1) nothing prevented a non-tack booking from having horseid set NULL,
-- or a tack booking from having a non-null horseid; (2) reassigning
-- horseid to a horse from a different ranch left requestingranchid
-- pointing at the PRIOR horse's ranch. Both are fixed together: the final
-- (post-COALESCE) IsForTack value now gates a mandatory HorseId
-- presence/absence check, and for non-tack, requestingranchid is
-- re-derived server-side from the NEW horse's own horse.ranchid in the
-- same UPDATE (never trusted from the client, never left over from the
-- prior horse); for tack, the existing requestingranchid is preserved
-- unchanged (there is no horse to derive it from). stallbooking.ranchid
-- (the service/host ranch) is untouched by this change. Authorization,
-- overlap protection, paid/pending guards, billing recalculation, dates,
-- notes, and return type are all unchanged.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretaryupdatestallbooking(
    integer, integer, date, date, text, boolean, integer
);

CREATE OR REPLACE FUNCTION public.usp_secretaryupdatestallbooking(
    p_stallbookingid           integer,
    p_secretarysystemuserid    integer,
    p_newstartdate             date,
    p_newenddate               date,
    p_newnotes                 text,
    p_isfortack                boolean,
    p_horseid                  integer
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_ranchid            integer;
    v_old_horseid        integer;
    v_old_isfortack       boolean;
    v_new_isfortack       boolean;
    v_requestingranchid   integer;
    v_competitionid      integer;
    v_paid_exists      boolean;
    v_existing_pend    integer;
    v_pricecatalogid   integer;
    v_itemprice        numeric;
    v_new_days         integer;
    v_new_amount       numeric;
BEGIN
    IF p_newenddate < p_newstartdate THEN
        RAISE EXCEPTION 'End date must be on or after start date';
    END IF;

    SELECT sb.ranchid, sb.horseid, sb.isfortack, pr.competitionid
    INTO v_ranchid, v_old_horseid, v_old_isfortack, v_competitionid
    FROM public.stallbooking sb
    INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_ranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_secretarysystemuserid
          AND prr.ranchid = v_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'מזכירת חווה מארחת'
    ) THEN
        RAISE EXCEPTION 'Permission denied: not the host ranch secretary';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
          AND bpr.paymentid IS NOT NULL
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot edit a paid stall booking';
    END IF;

    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists — resolve it first';
    END IF;

    -- Lock the old and/or new horse (ascending order, deduplicated) before
    -- writing -- either could conflict with a concurrent writer.
    IF v_old_horseid IS NOT NULL AND p_horseid IS NOT NULL AND v_old_horseid <> p_horseid THEN
        IF v_old_horseid < p_horseid THEN
            PERFORM pg_advisory_xact_lock(1735, v_old_horseid);
            PERFORM pg_advisory_xact_lock(1735, p_horseid);
        ELSE
            PERFORM pg_advisory_xact_lock(1735, p_horseid);
            PERFORM pg_advisory_xact_lock(1735, v_old_horseid);
        END IF;
    ELSIF v_old_horseid IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(1735, v_old_horseid);
    ELSIF p_horseid IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(1735, p_horseid);
    END IF;

    -- Determine the FINAL (post-COALESCE) tack status, then require and
    -- validate HorseId accordingly, and derive requestingranchid: from the
    -- new horse's own live ranch for non-tack (never from the client, never
    -- left over from the prior horse), or preserved unchanged for tack
    -- (there is no horse to derive it from).
    v_new_isfortack := COALESCE(p_isfortack, v_old_isfortack);

    IF v_new_isfortack = false THEN
        IF p_horseid IS NULL THEN
            RAISE EXCEPTION 'HorseId is required for a non-tack stall booking';
        END IF;

        SELECT h.ranchid
        INTO v_requestingranchid
        FROM public.horse h
        WHERE h.horseid = p_horseid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Horse not found';
        END IF;
    ELSE
        IF p_horseid IS NOT NULL THEN
            RAISE EXCEPTION 'HorseId must be NULL for a tack stall booking';
        END IF;

        SELECT requestingranchid
        INTO v_requestingranchid
        FROM public.stallbooking
        WHERE stallbookingid = p_stallbookingid;
    END IF;

    -- Reject an overlapping horse booking for the resulting horseid. Exact
    -- predicate family verified in usp_createstallbookingchangerequest (189):
    -- GLOBAL across all competitions, same horse, horse bookings only,
    -- excludes this booking itself, excludes bookings superseded by an
    -- approved cancellation. Tack bookings (p_horseid IS NULL) skip this
    -- entirely.
    IF p_horseid IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.stallbooking sb
            INNER JOIN public.productrequest pr
                ON pr.prequestid = sb.stallbookingid
            WHERE sb.horseid = p_horseid
              AND sb.isfortack = false
              AND sb.stallbookingid <> p_stallbookingid
              AND daterange(sb.startdate, sb.enddate, '[]')
                    && daterange(p_newstartdate, p_newenddate, '[]')
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.productchangerequest pcr
                  WHERE pcr.originalprequestid = sb.stallbookingid
                    AND pcr.iscancelled = true
                    AND pcr.status = 'Approved'
              )
        ) THEN
            RAISE EXCEPTION 'An active overlapping stall booking already exists for this horse';
        END IF;
    END IF;

    -- Apply updates
    UPDATE public.stallbooking
    SET startdate         = p_newstartdate,
        enddate           = p_newenddate,
        isfortack         = v_new_isfortack,
        horseid           = p_horseid,
        requestingranchid = v_requestingranchid
    WHERE stallbookingid = p_stallbookingid;

    UPDATE public.productrequest
    SET notes = NULLIF(TRIM(p_newnotes), '')
    WHERE prequestid = p_stallbookingid;

    -- Recompute billcharge amount based on new day count
    SELECT pc.pricecatalogid, pc.itemprice
    INTO v_pricecatalogid, v_itemprice
    FROM public.productrequest pr
    JOIN public.pricecatalog pc ON pc.pricecatalogid = pr.pricecatalogid
    WHERE pr.prequestid = p_stallbookingid;

    v_new_days := GREATEST((p_newenddate - p_newstartdate)::integer + 1, 1);
    v_new_amount := COALESCE(v_itemprice, 0) * v_new_days;

    UPDATE public.billcharge
    SET amounttopay = v_new_amount
    WHERE sourcetype = 'ProductRequest'
      AND sourceid   = p_stallbookingid
      AND chargestatus IN ('Open', 'PendingApproval');

    UPDATE public.billproductrequest
    SET amounttopay = v_new_amount
    WHERE prequestid = p_stallbookingid
      AND paymentid IS NULL;
END;
$$;
