-- ============================================================================
-- usp_CreateStallChangeRequestByPayer
-- ============================================================================
-- Payer requests a stall booking change (new dates / notes).
-- Creates a Pending productchangerequest row that secretary must approve.
-- Note: actual stall booking changes apply only after approval.
--
-- Ownership: payer must be on at least one bill linked to this booking
-- (via billproductrequest).
-- Guards: no existing pending change/cancel, booking exists.
--
-- The current minimum-viable version stores ONLY the request itself.
-- Secretary still needs to write the new dates to the booking on approval.
-- Mirrors how the admin endpoint operates today.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_createstallchangerequestbypayer(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_createstallchangerequestbypayer(
    p_stallbookingid  integer,
    p_payerpersonid   integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_exists    boolean;
    v_existing_pend   integer;
    v_new_request_id  integer;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.stallbooking
        WHERE stallbookingid = p_stallbookingid
    ) THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.billproductrequest bpr
        JOIN public.bill b ON b.billid = bpr.billid
        WHERE bpr.prequestid = p_stallbookingid
          AND b.paidbypersonid = p_payerpersonid
    )
    INTO v_owner_exists;

    IF NOT v_owner_exists THEN
        RAISE EXCEPTION 'Permission denied: payer does not pay for this stall booking';
    END IF;

    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending request already exists for this stall booking';
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
        NULL,
        'Pending',
        now(),
        FALSE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    RETURN v_new_request_id;
END;
$$;
