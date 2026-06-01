-- ============================================================================
-- usp_CancelStallBookingByPayer
-- ============================================================================
-- Payer initiates a cancel request for a stall booking they pay for.
-- Creates a row in productchangerequest (Pending, iscancelled=true).
-- Secretary must approve later.
--
-- Stall data model:
--   stallbooking.stallbookingid = productrequest.prequestid (FK)
--   billproductrequest bridges productrequest <-> bill (many-to-many)
--   bill.paidbypersonid = the payer
--
-- Ownership: payer must be in at least one bill linked to this booking.
-- Guards: not already cancelled, no existing pending request (unique constraint
-- on originalprequestid will also prevent double-insert).
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_cancelstallbookingbypayer(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_cancelstallbookingbypayer(
    p_stallbookingid   integer,
    p_payerpersonid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_exists    boolean;
    v_existing_pend   integer;
    v_new_request_id  integer;
BEGIN
    -- Validate stall booking exists
    IF NOT EXISTS (
        SELECT 1
        FROM public.stallbooking
        WHERE stallbookingid = p_stallbookingid
    ) THEN
        RAISE EXCEPTION 'Stall booking not found';
    END IF;

    -- Validate payer pays for this booking (via billproductrequest -> bill)
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

    -- Prevent duplicate pending request
    SELECT pcr.productchangerequestid
    INTO v_existing_pend
    FROM public.productchangerequest pcr
    WHERE pcr.originalprequestid = p_stallbookingid
      AND pcr.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change/cancel request already exists for this stall booking';
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
        TRUE
    )
    RETURNING productchangerequestid INTO v_new_request_id;

    RETURN v_new_request_id;
END;
$$;
