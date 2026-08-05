-- ============================================================================
-- usp_SecretaryCreateStallBookingForPayer
-- ============================================================================
-- Secretary creates a stall booking on behalf of an existing payer.
-- Inputs: competition, payer (personid), horse (nullable for tack stall),
-- dates, product (= stall type) and notes.
--
-- The SP:
--   1. Looks up an active pricecatalog row for product+ranch
--   2. Reuses an open bill for that payer in the competition OR creates one
--   3. Inserts productrequest (the stall booking's parent row)
--   4. Inserts servicerequest? -- NO: stallbooking links to productrequest only,
--      not servicerequest (servicerequest is for entries/paidtime)
--   5. Inserts billproductrequest with amounttopay = itemprice * days
--   6. Inserts stallbooking (stallbookingid = prequestid, no compound/stall
--      assignment yet, ranch = host ranch)
--   7. Inserts billcharge for tracking in payments screen
--
-- Returns: new stallbookingid.
--
-- Ownership: secretary of the competition's host ranch.
--
-- REVIEW-GATE CORRECTION (2026-08-02): added pg_advisory_xact_lock(1735,
-- p_horseid) for a horse booking (skipped for tack) before the INSERT --
-- one of five confirmed writers of stallbooking.startdate/enddate/horseid
-- that must share this lock convention so a concurrent competition
-- reschedule cannot race this procedure for the same horse. See
-- 187_usp_RescheduleCompetition.sql's header for the full audit.
--
-- REVIEW-GATE CORRECTION (2026-08-02, owner decision): added a horse-overlap
-- validation, using the EXACT predicate already verified in
-- usp_createstallbooking (188) -- horse bookings only, excludes bookings
-- superseded by an approved-and-not-cancelling change request. Runs
-- immediately after the lock and before any read or write (competition
-- lookup, secretary/payer checks, price lookup, bill, productrequest,
-- billproductrequest, stallbooking, billcharge), so a rejected request
-- leaves no partial financial rows. Closes the SEQUENTIAL (non-concurrent)
-- double-booking gap noted in the prior review-gate pass. Tack bookings are
-- unaffected -- gated by the same NOT COALESCE(p_isfortack, FALSE)
-- condition already used for the lock.
--
-- REVIEW-GATE CORRECTION (2026-08-03, owner decision): the overlap check was
-- previously scoped to a same-competition-only `pr.competitionid = ...`
-- filter, which let the same horse hold overlapping bookings across two
-- DIFFERENT competitions -- a state usp_reschedulecompetition (187) would
-- then refuse to move, since 187's own overlap rule was always
-- cross-competition. A horse cannot physically occupy two stalls at once
-- regardless of which competition either booking belongs to, so the
-- competition-id restriction is removed here; the check is now GLOBAL by
-- horseid across all competitions. See 187's header for the full
-- cross-competition consistency note.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- this proc's host-ranch derivation (v_hostranchid from competition) and
-- host-secretary authorization were already correct -- no change to either.
-- Added: requesting-ranch persistence, for parity with 188/225. For
-- non-tack, requestingranchid is derived server-side from horse.ranchid
-- (never trusted from the client); if a caller supplies p_requestingranchid
-- anyway and it disagrees with the horse's own ranch, the call is rejected.
-- For tack, p_requestingranchid is required (no horse to derive it from).
-- The new parameter is trailing with DEFAULT NULL, matching 188's
-- backward-compatible pattern; the existing DROP FUNCTION IF EXISTS below
-- (already present for a prior signature change) is updated to match this
-- proc's immediately-prior 9-parameter signature, so only the corrected
-- 10-parameter version remains callable.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretarycreatestallbookingforpayer(
    integer, integer, integer, integer, date, date, boolean, smallint, text
);

CREATE OR REPLACE FUNCTION public.usp_secretarycreatestallbookingforpayer(
    p_competitionid            integer,
    p_secretarysystemuserid    integer,
    p_payerpersonid            integer,
    p_horseid                  integer,        -- nullable for tack
    p_startdate                date,
    p_enddate                  date,
    p_isfortack                boolean,
    p_productid                smallint,       -- stalltype
    p_notes                    text,
    p_requestingranchid        integer DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_hostranchid      integer;
    v_pricecatalogid   integer;
    v_itemprice        numeric;
    v_billid           integer;
    v_new_prequestid   integer;
    v_days             integer;
    v_amount           numeric;
    v_categorykey      varchar;
    v_requestingranchid integer;
BEGIN
    IF p_enddate < p_startdate THEN
        RAISE EXCEPTION 'End date must be on or after start date';
    END IF;

    IF NOT p_isfortack AND p_horseid IS NULL THEN
        RAISE EXCEPTION 'Horse is required for a non-tack stall booking';
    END IF;

    IF NOT COALESCE(p_isfortack, FALSE) THEN
        PERFORM pg_advisory_xact_lock(1735, p_horseid);
    END IF;

    -- Reject an overlapping horse booking BEFORE any read or write below.
    -- Exact predicate family verified in usp_createstallbooking (188):
    -- GLOBAL across all competitions, same horse, horse bookings only,
    -- excludes bookings superseded by an approved-and-not-cancelling change
    -- request. Tack bookings skip this entirely.
    IF NOT COALESCE(p_isfortack, FALSE) THEN
        IF EXISTS (
            SELECT 1
            FROM public.stallbooking sb
            INNER JOIN public.productrequest pr
                ON pr.prequestid = sb.stallbookingid
            LEFT JOIN public.productchangerequest pcr
                ON pcr.originalprequestid = pr.prequestid
               AND pcr.status = 'Approved'
            WHERE sb.horseid = p_horseid
              AND sb.isfortack = false
              AND (
                    pcr.productchangerequestid IS NULL
                    OR (
                        pcr.iscancelled = false
                        AND pcr.newprequestid IS NULL
                    )
                  )
              AND daterange(sb.startdate, sb.enddate, '[]')
                  && daterange(p_startdate, p_enddate, '[]')
        ) THEN
            RAISE EXCEPTION 'An active overlapping stall booking already exists for this horse';
        END IF;
    END IF;

    -- Requesting (guest) ranch: derived from the horse for non-tack,
    -- required explicitly for tack (no horse to derive it from).
    IF NOT COALESCE(p_isfortack, FALSE) THEN
        SELECT h.ranchid
        INTO v_requestingranchid
        FROM public.horse h
        WHERE h.horseid = p_horseid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Horse not found';
        END IF;

        IF p_requestingranchid IS NOT NULL AND p_requestingranchid <> v_requestingranchid THEN
            RAISE EXCEPTION 'RequestingRanchId does not match the horse''s home ranch';
        END IF;
    ELSE
        IF p_requestingranchid IS NULL OR p_requestingranchid <= 0 THEN
            RAISE EXCEPTION 'RequestingRanchId is required for tack stall booking';
        END IF;

        v_requestingranchid := p_requestingranchid;
    END IF;

    -- Competition + host ranch
    SELECT c.hostranchid
    INTO v_hostranchid
    FROM public.competition c
    WHERE c.competitionid = p_competitionid;

    IF v_hostranchid IS NULL THEN
        RAISE EXCEPTION 'Competition not found';
    END IF;

    -- Secretary ownership
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

    -- Payer exists
    IF NOT EXISTS (
        SELECT 1 FROM public.person WHERE personid = p_payerpersonid
    ) THEN
        RAISE EXCEPTION 'Payer not found';
    END IF;

    -- Resolve active price catalog for product + host ranch
    SELECT pc.pricecatalogid, pc.itemprice
    INTO v_pricecatalogid, v_itemprice
    FROM public.pricecatalog pc
    WHERE pc.productid = p_productid
      AND pc.ranchid   = v_hostranchid
      AND COALESCE(pc.isactive, TRUE) = TRUE
    ORDER BY pc.creationdate DESC
    LIMIT 1;

    IF v_pricecatalogid IS NULL THEN
        RAISE EXCEPTION 'No active price for this product at the host ranch';
    END IF;

    v_days   := GREATEST((p_enddate - p_startdate)::integer + 1, 1);
    v_amount := COALESCE(v_itemprice, 0) * v_days;

    -- Find open bill or create one
    SELECT b.billid
    INTO v_billid
    FROM public.bill b
    WHERE b.paidbypersonid = p_payerpersonid
      AND b.competitionid  = p_competitionid
      AND b.dateclosed IS NULL
    ORDER BY b.dateopened DESC
    LIMIT 1;

    IF v_billid IS NULL THEN
        INSERT INTO public.bill (
            paidbypersonid, amounttopay, dateopened, competitionid
        )
        VALUES (
            p_payerpersonid, 0, now(), p_competitionid
        )
        RETURNING billid INTO v_billid;
    END IF;

    -- Create productrequest (the parent row whose id is the stallbookingid)
    INSERT INTO public.productrequest (
        competitionid,
        prequestdatetime,
        orderedbysystemuserid,
        pricecatalogid,
        notes
    )
    VALUES (
        p_competitionid,
        now(),
        p_secretarysystemuserid,
        v_pricecatalogid,
        NULLIF(TRIM(p_notes), '')
    )
    RETURNING prequestid INTO v_new_prequestid;

    -- Link bill to the productrequest with the calculated amount
    INSERT INTO public.billproductrequest (
        billid, prequestid, paymentid, amounttopay
    )
    VALUES (
        v_billid, v_new_prequestid, NULL, v_amount
    );

    -- The stallbooking row (shares id with productrequest)
    INSERT INTO public.stallbooking (
        stallbookingid,
        ranchid,
        compoundid,
        stallid,
        startdate,
        enddate,
        horseid,
        isfortack,
        requestingranchid
    )
    VALUES (
        v_new_prequestid,
        v_hostranchid,
        NULL,
        NULL,
        p_startdate,
        p_enddate,
        p_horseid,
        COALESCE(p_isfortack, FALSE),
        v_requestingranchid
    );

    -- Roll up to bill totals
    UPDATE public.bill
    SET amounttopay = amounttopay + v_amount
    WHERE billid = v_billid;

    -- billcharge for the payments screen
    v_categorykey := CASE WHEN COALESCE(p_isfortack, FALSE) THEN 'stalls' ELSE 'stalls' END;

    INSERT INTO public.billcharge (
        billid,
        competitionid,
        paidbypersonid,
        chargeowner,
        categorykey,
        sourcetype,
        sourceid,
        amounttopay,
        chargestatus,
        createdat
    )
    VALUES (
        v_billid,
        p_competitionid,
        p_payerpersonid,
        'Organizer',
        v_categorykey,
        'ProductRequest',
        v_new_prequestid,
        v_amount,
        'Open',
        now()
    );

    RETURN v_new_prequestid;
END;
$$;
