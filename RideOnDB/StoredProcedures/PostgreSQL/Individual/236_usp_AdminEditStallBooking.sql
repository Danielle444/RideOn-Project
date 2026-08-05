-- Admin-direct stall booking edit (stall mutation slice of the admin-payer
-- direct-changes feature). Sibling in spirit to usp_admineditentry (232) /
-- usp_insertchangeentryrequestadminranchsecured (234) for entries, but the
-- stall shape is simpler: there is no class-linked identity to replace, so
-- this is a pure IN-PLACE update of the SAME stallbooking/productrequest
-- row -- never a new row, never a pending-approval branch. The locked
-- business rules (see the admin-payer spec) are binary, not
-- registration-window-gated:
--   * dates/notes are ALWAYS direct, during or after registration.
--   * product/type is changeable ONLY while the booking is unassigned to a
--     physical stall, regardless of registration window.
--
-- CORRECTION vs the originally drafted spec: the spec said to gate the type
-- change on "stallbooking.stallid IS NULL". Live inspection
-- (2026-08-05) found stallbooking.stallid/compoundid are NEVER populated by
-- any live proc (0 of 146 rows have stallid set) -- physical assignment
-- truth lives entirely in the separate stallassignment table, written only
-- by usp_assignstallbookingtostall/usp_unassignstallbookingfromstall (229/
-- unassign) and read as such by usp_getstallbookingassignmentoverview's
-- own IsAssigned column. This proc therefore gates on
-- "exists a stallassignment row for this stallbookingid", which is the
-- real, load-bearing signal -- not the dead column named in the spec.
--
-- MULTI-PAYER CORRECTION (2026-08-05, before any live deploy): a first draft
-- of this proc applied the single recalculated total to EVERY billcharge/
-- billproductrequest row for the booking, unmodified from
-- usp_secretaryupdatestallbooking's single-payer-only UPDATE shape. Live
-- evidence (booking 33: 2 payers, personid 622 and 79, on separate bills 10
-- and 11, billcharge.paidbypersonid distinguishes them) proved stall
-- bookings are routinely multi-payer, and applying the full total to every
-- row would have doubled (or Nx'd) the charged amount on every repriced
-- multi-payer booking -- a real financial-integrity defect never exercised
-- by the read-only verification matrix in the first draft (single-payer
-- fixtures only).
--
-- Allocation rule proven from live data and existing working code (NOT
-- inferred): usp_createstallbooking's own payer loop computes
-- v_amountperpayer := round(v_totalamount / v_payercount, 2) and applies
-- that SAME amount to every payer's billproductrequest/billcharge row --
-- i.e. EQUAL SPLIT, not proportional-to-existing-share and not a single
-- responsible payer. usp_answerproductchangerequest's stalls branch
-- reprices a multi-payer stall product request the same way:
-- v_new_amountperpayer := round(v_new_totalamount / v_payercount, 2),
-- copied identically onto a new billproductrequest/billcharge row per
-- existing payer. Both are EQUAL SPLIT with per-row independent rounding.
--
-- ADDITIVE REFINEMENT on top of that proven rule, not a redesign: live data
-- proves the established per-row-independent-rounding tolerates a sum
-- mismatch of a few cents (prequestid 215: 14 x 64.29 = 900.06; 219:
-- 11 x 81.82 = 900.02; 221: 7 x 128.57 = 899.99; 111: 3 x 133.33 = 399.99 --
-- all real live rows). That drift is acceptable for the historical
-- creation-time flow (not touched here) but is not acceptable for a DIRECT
-- repricing mutation that a RanchAdmin can trigger repeatedly. This proc
-- keeps the exact same equal-split base share, computed in integer cents to
-- stay exact, and deterministically assigns any leftover cents (always
-- fewer than the payer count) one cent each to the payers with the
-- lowest billid, ordered ascending -- billid is a stable, monotonic
-- identity assigned once per payer's bill, so the same booking with the
-- same total always allocates the same way, including on retry. This
-- guarantees sum(new amounts) = the recalculated total exactly, which
-- neither usp_createstallbooking nor usp_answerproductchangerequest
-- guarantees today. Single-payer bookings are unaffected: with payercount
-- = 1, the base share equals the full total and there is no remainder to
-- distribute, so the resulting UPDATE is byte-for-byte the same value the
-- prior flat-UPDATE draft would have produced.
--
-- Neither usp_secretaryupdatestallbooking nor usp_answerproductchangerequest
-- is modified by this file -- the correction is fully containable inside
-- this new proc, so per instruction they are left untouched.
--
-- Mutation template reused, not reinvented:
--   * usp_secretaryupdatestallbooking (live) -- the in-place dates/notes/
--     paid-charge-guard/pending-change-guard/overlap-guard shape, reused
--     verbatim for the parts that don't involve a product change.
--   * usp_answerproductchangerequest (live) -- reused for its REPRICING
--     ARITHMETIC (new itemprice x stay days, equal split across payers),
--     not its architecture: that proc replaces the productrequest row
--     wholesale because it is resolving a payer-submitted change request
--     that already created a new row elsewhere. This proc has no such new
--     row to resolve, so the same per-payer math is applied to the
--     existing rows directly, plus the remainder correction described above.
--   * usp_secretarycreatestallbookingforpayer (live) -- reused for the
--     productId -> active pricecatalog resolution query shape
--     (pc.productid = @p and pc.ranchid = @hostRanch and isactive, most
--     recent).
--   * usp_insertchangeentryrequestadminranchsecured (234) -- reused for the
--     RanchAdmin-role-in-request-ranch + Model C (admin-created OR
--     managed-payer) authorization shape, adapted from entry/changeentry
--     tables to stallbooking/productrequest/billcharge.
--
-- Authorization ranch is the booking's OWN requestingranchid (the admin's
-- approved ranch), which may differ from the booking's service/host ranch
-- (stallbooking.ranchid) -- same R<>H model as Stage C. The pricecatalog
-- lookup for a product change is scoped to stallbooking.ranchid (the host/
-- service ranch that owns the physical stalls and their price list), not
-- to the requesting ranch -- matching usp_createstallbooking's and
-- usp_secretarycreatestallbookingforpayer's own host-ranch-scoped
-- pricecatalog match.
CREATE OR REPLACE FUNCTION public.usp_admineditstallbooking(
    p_personid integer,
    p_stallbookingid integer,
    p_ranchid integer,
    p_newstartdate date,
    p_newenddate date,
    p_newnotes text,
    p_newproductid smallint DEFAULT NULL::smallint
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_requestingranchid    integer;
    v_hostranchid          integer;
    v_horseid              integer;
    v_old_pricecatalogid   integer;
    v_old_productid        smallint;
    v_paid_exists          boolean;
    v_is_assigned          boolean;
    v_iscreatedbyadmin     boolean;
    v_ismanagedpayerbooking boolean;
    v_pricecatalogid       integer;
    v_itemprice            numeric;
    v_new_days             integer;
    v_new_amount           numeric;
    v_total_cents          bigint;
    v_payercount           integer;
    v_base_cents           bigint;
    v_remainder_cents      bigint;
    v_billid               integer;
BEGIN
    IF p_personid IS NULL OR p_personid <= 0 THEN
        RAISE EXCEPTION 'Invalid person id' USING ERRCODE = 'RN001';
    END IF;

    IF p_stallbookingid IS NULL OR p_stallbookingid <= 0 THEN
        RAISE EXCEPTION 'Invalid stall booking id' USING ERRCODE = 'RN001';
    END IF;

    IF p_ranchid IS NULL OR p_ranchid <= 0 THEN
        RAISE EXCEPTION 'Invalid ranch id' USING ERRCODE = 'RN001';
    END IF;

    IF p_newstartdate IS NULL OR p_newenddate IS NULL THEN
        RAISE EXCEPTION 'Start and end dates are required' USING ERRCODE = 'RN001';
    END IF;

    IF p_newenddate < p_newstartdate THEN
        RAISE EXCEPTION 'End date must be on or after start date' USING ERRCODE = 'RN001';
    END IF;

    SELECT sb.requestingranchid, sb.ranchid, sb.horseid, pr.pricecatalogid, pc.productid
    INTO v_requestingranchid, v_hostranchid, v_horseid, v_old_pricecatalogid, v_old_productid
    FROM public.stallbooking sb
    INNER JOIN public.productrequest pr ON pr.prequestid = sb.stallbookingid
    INNER JOIN public.pricecatalog pc ON pc.pricecatalogid = pr.pricecatalogid
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_requestingranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found' USING ERRCODE = 'RN001';
    END IF;

    IF v_requestingranchid <> p_ranchid THEN
        RAISE EXCEPTION 'Stall booking does not belong to this ranch' USING ERRCODE = 'RN001';
    END IF;

    -- RanchAdmin authorization, scoped to the REQUEST ranch -- same shape as
    -- usp_insertchangeentryrequestadminranchsecured's re-derived check.
    IF NOT EXISTS (
        SELECT 1
        FROM public.personranchrole prr
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE prr.personid = p_personid
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'אדמין חווה'
    ) THEN
        RAISE EXCEPTION 'Caller is not an approved ranch admin for this stall booking''s ranch' USING ERRCODE = 'RN001';
    END IF;

    -- Model C scope: admin created the booking directly, OR the booking's
    -- payer is a payer the admin manages, approved in the request ranch.
    SELECT (pr.orderedbysystemuserid = p_personid)
    INTO v_iscreatedbyadmin
    FROM public.productrequest pr
    WHERE pr.prequestid = p_stallbookingid;

    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        JOIN public.personmanagedbysystemuser pmsu ON pmsu.personid = bc.paidbypersonid
        JOIN public.personranchrole prr ON prr.personid = bc.paidbypersonid
        JOIN public.role r ON r.roleid = prr.roleid
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_stallbookingid
          AND bc.categorykey = 'stalls'
          AND pmsu.systemuserid = p_personid
          AND pmsu.approvalstatus = 'Approved'
          AND prr.ranchid = p_ranchid
          AND prr.rolestatus = 'Approved'
          AND r.rolename = 'משלם'
    )
    INTO v_ismanagedpayerbooking;

    IF NOT (COALESCE(v_iscreatedbyadmin, false) OR v_ismanagedpayerbooking) THEN
        RAISE EXCEPTION 'Caller is not authorized to modify this stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- Paid-charge guard, reproduced verbatim from usp_secretaryupdatestallbooking
    -- (the established direct-mutation template) -- never silently edit a
    -- paid stall booking. Blocks the WHOLE booking if ANY payer's row is
    -- paid, same as the template -- a partially-paid multi-payer booking is
    -- rejected entirely, not repriced around the paid payer.
    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
          AND bpr.paymentid IS NOT NULL
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot edit a paid stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- Pending-change guard, reproduced verbatim from usp_secretaryupdatestallbooking.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_stallbookingid
          AND pcr.status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'A pending change request exists for this stall booking' USING ERRCODE = 'RN001';
    END IF;

    -- Cancelled/already-replaced guard -- same shape usp_getstallbookingsforcompetitionandranch
    -- uses to compute IsCancelled/HasApprovedChange.
    IF EXISTS (
        SELECT 1
        FROM public.productchangerequest pcr
        WHERE pcr.originalprequestid = p_stallbookingid
          AND pcr.status = 'Approved'
          AND (pcr.iscancelled = true OR pcr.newprequestid IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'Stall booking is cancelled or already replaced' USING ERRCODE = 'RN001';
    END IF;

    -- Overlap guard for horse bookings on the new dates, reproduced verbatim
    -- from usp_secretaryupdatestallbooking (skipped for tack, which has no
    -- horseid).
    IF v_horseid IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.stallbooking sb
            INNER JOIN public.productrequest pr
                ON pr.prequestid = sb.stallbookingid
            WHERE sb.horseid = v_horseid
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
            RAISE EXCEPTION 'An active overlapping stall booking already exists for this horse' USING ERRCODE = 'RN001';
        END IF;
    END IF;

    v_pricecatalogid := v_old_pricecatalogid;

    IF p_newproductid IS NOT NULL AND p_newproductid <> v_old_productid THEN
        -- Real assignment truth is stallassignment, NOT stallbooking.stallid
        -- (see header comment) -- this is the locked rule's enforcement point.
        SELECT EXISTS (
            SELECT 1 FROM public.stallassignment sa
            WHERE sa.stallbookingid = p_stallbookingid
        )
        INTO v_is_assigned;

        IF v_is_assigned THEN
            RAISE EXCEPTION 'לא ניתן לשנות את סוג התא לאחר שהתא שובץ בפועל' USING ERRCODE = 'RN001';
        END IF;

        SELECT pc.pricecatalogid
        INTO v_pricecatalogid
        FROM public.pricecatalog pc
        WHERE pc.productid = p_newproductid
          AND pc.ranchid = v_hostranchid
          AND COALESCE(pc.isactive, true) = true
        ORDER BY pc.creationdate DESC
        LIMIT 1;

        IF v_pricecatalogid IS NULL THEN
            RAISE EXCEPTION 'No active price for this product at the host ranch' USING ERRCODE = 'RN001';
        END IF;
    END IF;

    UPDATE public.stallbooking
    SET startdate = p_newstartdate,
        enddate   = p_newenddate
    WHERE stallbookingid = p_stallbookingid;

    UPDATE public.productrequest
    SET notes         = NULLIF(TRIM(p_newnotes), ''),
        pricecatalogid = v_pricecatalogid
    WHERE prequestid = p_stallbookingid;

    SELECT pc.itemprice
    INTO v_itemprice
    FROM public.pricecatalog pc
    WHERE pc.pricecatalogid = v_pricecatalogid;

    v_new_days   := GREATEST((p_newenddate - p_newstartdate)::integer + 1, 1);
    v_new_amount := COALESCE(v_itemprice, 0) * v_new_days;

    -- Multi-payer equal split, computed in integer cents so the sum is
    -- always exact (see header comment). v_payercount counts every
    -- billproductrequest row for this booking -- by this point the paid
    -- guard above has already proven none of them are paid.
    SELECT COUNT(*)
    INTO v_payercount
    FROM public.billproductrequest bpr
    WHERE bpr.prequestid = p_stallbookingid;

    IF v_payercount IS NULL OR v_payercount <= 0 THEN
        RAISE EXCEPTION 'Could not find payers for this stall booking' USING ERRCODE = 'RN001';
    END IF;

    v_total_cents     := ROUND(v_new_amount * 100)::bigint;
    v_base_cents      := v_total_cents / v_payercount;
    v_remainder_cents := v_total_cents - (v_base_cents * v_payercount);

    WITH ordered_payers AS (
        SELECT bpr.billid,
               ROW_NUMBER() OVER (ORDER BY bpr.billid) AS rn
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
    ),
    allocated AS (
        SELECT billid,
               (v_base_cents + CASE WHEN rn <= v_remainder_cents THEN 1 ELSE 0 END)::numeric / 100 AS allocated_amount
        FROM ordered_payers
    )
    UPDATE public.billproductrequest bpr
    SET amounttopay = allocated.allocated_amount
    FROM allocated
    WHERE bpr.prequestid = p_stallbookingid
      AND bpr.billid = allocated.billid
      AND bpr.paymentid IS NULL;

    WITH ordered_payers AS (
        SELECT bpr.billid,
               ROW_NUMBER() OVER (ORDER BY bpr.billid) AS rn
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
    ),
    allocated AS (
        SELECT billid,
               (v_base_cents + CASE WHEN rn <= v_remainder_cents THEN 1 ELSE 0 END)::numeric / 100 AS allocated_amount
        FROM ordered_payers
    )
    UPDATE public.billcharge bc
    SET amounttopay = allocated.allocated_amount
    FROM allocated
    WHERE bc.sourcetype = 'ProductRequest'
      AND bc.sourceid   = p_stallbookingid
      AND bc.chargestatus IN ('Open', 'PendingApproval')
      AND bc.billid = allocated.billid;

    FOR v_billid IN
        SELECT DISTINCT bpr.billid
        FROM public.billproductrequest bpr
        WHERE bpr.prequestid = p_stallbookingid
    LOOP
        PERFORM public.usp_recalculatebillamount(v_billid);
    END LOOP;
END;
$function$;
