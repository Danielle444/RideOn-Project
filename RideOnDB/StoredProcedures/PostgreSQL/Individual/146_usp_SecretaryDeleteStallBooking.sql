-- ============================================================================
-- usp_SecretaryDeleteStallBooking
-- ============================================================================
-- Direct cancel of a stall booking by the host secretary.
-- Pattern: pre-approved productchangerequest (status='Approved',
-- iscancelled=true, answeredbysystemuserid=secretary) + cancel billcharge.
-- Also cancels billcharges for shavings orders tied to this booking.
--
-- Ownership: caller must hold 'מזכירת חווה מארחת' at the booking's ranch.
--
-- Guards:
--   - Booking exists
--   - Not paid
--   - No other pending change request
--
-- ALIGNED WITH usp_admincancelstallbooking (239) AND
-- usp_answerproductchangerequestsecured (222), 2026-08-06: this proc
-- previously guarded "paid" via the legacy billproductrequest.paymentid
-- column and never called usp_recalculatebillamount, so a secretary
-- direct-cancel could leave bill.amounttopay stale and never actually
-- blocked on the current billcharge.chargestatus='Paid' semantics. It also
-- cascaded shavings charges on physical-link existence alone, without the
-- Policy A mixed-payment protection every sibling guard in this codebase
-- enforces (a shavings sourceId with ANY Paid row is left fully untouched)
-- or the active-link rule for a shared shavings order's other stall.
-- Three changes, reusing 239's proven logic verbatim adapted to this proc's
-- own flow/variable names -- ownership, the existing-pending-request guard,
-- and every other line are UNCHANGED:
--   1. Paid guard now reads public.billcharge (sourcetype='ProductRequest',
--      sourceid=p_stallbookingid, chargestatus='Paid'), not
--      billproductrequest.paymentid.
--   2. The shavings cascade now applies the same active-link rule (an other
--      linked stall only stops keeping the order alive when it has an
--      Approved+iscancelled=true request AND no Open/Paid/PendingApproval
--      charge) and Policy A (any Paid row anywhere on the shavings sourceId
--      blocks cancellation of the WHOLE order) as 239. Never touches
--      shavingsorderforstallbooking itself.
--   3. Every bill actually touched by either UPDATE...RETURNING (stall
--      charge or cascaded shavings charge) is recalculated exactly once via
--      usp_recalculatebillamount, matching 239's dependent-freshness fix.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretarydeletestallbooking(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_secretarydeletestallbooking(
    p_stallbookingid           integer,
    p_secretarysystemuserid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_ranchid           integer;
    v_paid_exists       boolean;
    v_existing_pend     integer;
    v_new_request_id    integer;
    v_stall_bill_ids     integer[];
    v_shavings_bill_ids  integer[];
    v_all_bill_ids       integer[];
    v_bill_id            integer;
BEGIN
    SELECT sb.ranchid
    INTO v_ranchid
    FROM public.stallbooking sb
    WHERE sb.stallbookingid = p_stallbookingid;

    IF v_ranchid IS NULL THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    -- Ownership: secretary of the host ranch (the booking's ranch IS the host)
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

    -- Block if the stall's own charge has already been paid (current
    -- billcharge.chargestatus semantics -- matches usp_admincancelstallbooking
    -- and every other sibling guard in this codebase; replaces the legacy
    -- billproductrequest.paymentid check).
    SELECT EXISTS (
        SELECT 1
        FROM public.billcharge bc
        WHERE bc.sourcetype = 'ProductRequest'
          AND bc.sourceid = p_stallbookingid
          AND bc.chargestatus = 'Paid'
    )
    INTO v_paid_exists;

    IF v_paid_exists THEN
        RAISE EXCEPTION 'Cannot delete a paid stall booking';
    END IF;

    -- Block if there is already a pending change request
    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists — resolve it first';
    END IF;

    INSERT INTO public.productchangerequest (
        originalprequestid,
        newprequestid,
        answeredbysystemuserid,
        status,
        requestdate,
        iscancelled
    )
    VALUES (
        p_stallbookingid,
        NULL,
        p_secretarysystemuserid,
        'Approved',
        now(),
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    -- Cancel the stall's own Open/PendingApproval charge(s). Paid rows never
    -- match (already proven none exist above) and are never touched. Bill
    -- ids are captured ONLY from what this UPDATE itself reports changing.
    WITH cancelled_stall_charges AS (
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'ProductRequest'
          AND sourceid   = p_stallbookingid
          AND chargestatus IN ('Open', 'PendingApproval')
        RETURNING billid
    )
    SELECT COALESCE(array_agg(DISTINCT billid), ARRAY[]::integer[])
    INTO v_stall_bill_ids
    FROM cancelled_stall_charges;

    -- Eligible shavings orders: every OTHER stall physically linked to the
    -- order must be "inactive" under the locked, cancellation-only
    -- active-link rule (Approved iscancelled=true AND no live charge --
    -- never a replacement, never an inconsistent state), AND (Policy A) the
    -- order itself must carry no Paid row anywhere in its own billcharge
    -- split. Physical shavingsorderforstallbooking rows are never touched,
    -- so eligibility is computed purely from the linked stalls' own
    -- business state, never from row existence.
    WITH eligible_shavings_orders AS (
        SELECT sofb.shavingsorderid
        FROM public.shavingsorderforstallbooking sofb
        WHERE sofb.stallbookingid = p_stallbookingid
          AND NOT EXISTS (
              SELECT 1
              FROM public.shavingsorderforstallbooking other
              WHERE other.shavingsorderid = sofb.shavingsorderid
                AND other.stallbookingid <> p_stallbookingid
                AND NOT (
                    EXISTS (
                        SELECT 1
                        FROM public.productchangerequest pcr
                        WHERE pcr.originalprequestid = other.stallbookingid
                          AND pcr.status = 'Approved'
                          AND pcr.iscancelled = true
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM public.billcharge bc
                        WHERE bc.sourcetype = 'ProductRequest'
                          AND bc.sourceid = other.stallbookingid
                          AND bc.chargestatus IN ('Open', 'Paid', 'PendingApproval')
                    )
                )
          )
    ),
    payable_shavings_orders AS (
        -- Policy A: any Paid row anywhere on this shavings sourceId excludes
        -- the WHOLE order, not just that one payer's row.
        SELECT eso.shavingsorderid
        FROM eligible_shavings_orders eso
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.billcharge bc
            WHERE bc.sourcetype = 'ProductRequest'
              AND bc.sourceid = eso.shavingsorderid
              AND bc.chargestatus = 'Paid'
        )
    ),
    cancelled_shavings_charges AS (
        UPDATE public.billcharge
        SET chargestatus = 'Cancelled',
            cancelledat  = now()
        WHERE sourcetype = 'ProductRequest'
          AND chargestatus IN ('Open', 'PendingApproval')
          AND sourceid IN (SELECT shavingsorderid FROM payable_shavings_orders)
        RETURNING billid
    )
    SELECT COALESCE(array_agg(DISTINCT billid), ARRAY[]::integer[])
    INTO v_shavings_bill_ids
    FROM cancelled_shavings_charges;

    -- Deduplicate every bill actually touched above and recalculate each
    -- exactly once. Never derived from productrequest/billproductrequest
    -- lookups -- only from what the two UPDATE...RETURNING blocks reported.
    v_all_bill_ids := ARRAY(
        SELECT DISTINCT unnest(v_stall_bill_ids || v_shavings_bill_ids)
    );

    FOREACH v_bill_id IN ARRAY v_all_bill_ids
    LOOP
        PERFORM public.usp_recalculatebillamount(v_bill_id);
    END LOOP;

    RETURN v_new_request_id;
END;
$$;
