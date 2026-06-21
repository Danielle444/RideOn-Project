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
    p_notes                    text
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
BEGIN
    IF p_enddate < p_startdate THEN
        RAISE EXCEPTION 'End date must be on or after start date';
    END IF;

    IF NOT p_isfortack AND p_horseid IS NULL THEN
        RAISE EXCEPTION 'Horse is required for a non-tack stall booking';
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
        isfortack
    )
    VALUES (
        v_new_prequestid,
        v_hostranchid,
        NULL,
        NULL,
        p_startdate,
        p_enddate,
        p_horseid,
        COALESCE(p_isfortack, FALSE)
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
