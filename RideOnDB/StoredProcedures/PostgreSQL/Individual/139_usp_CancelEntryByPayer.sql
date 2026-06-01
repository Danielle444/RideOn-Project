-- ============================================================================
-- usp_CancelEntryByPayer
-- ============================================================================
-- Payer initiates a cancel request for an entry they pay for.
-- Creates a row in changeentryrequest (Pending, iscancelled=true).
-- Secretary must approve later (same workflow as admin-initiated cancel).
--
-- Ownership: payer must be bill.paidbypersonid via servicerequest.billid.
-- Guards: not already cancelled, not paid, no existing pending cancellation.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_cancelentrybypayer(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_cancelentrybypayer(
    p_entryid         integer,
    p_payerpersonid   integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_personid  integer;
    v_paymentid       integer;
    v_entrystatus     varchar;
    v_existing_pend   integer;
    v_new_request_id  integer;
BEGIN
    -- Look up payer (bill owner) + payment + entry status
    SELECT
        b.paidbypersonid,
        sr.paymentid,
        COALESCE(e.entrystatus, 'Active')
    INTO
        v_owner_personid,
        v_paymentid,
        v_entrystatus
    FROM public.entry e
    JOIN public.servicerequest sr ON sr.srequestid = e.entryid
    JOIN public.bill b ON b.billid = sr.billid
    WHERE e.entryid = p_entryid;

    IF v_owner_personid IS NULL THEN
        RAISE EXCEPTION 'Entry not found';
    END IF;

    IF v_owner_personid <> p_payerpersonid THEN
        RAISE EXCEPTION 'Permission denied: payer does not own this entry';
    END IF;

    IF v_entrystatus = 'Cancelled' OR v_entrystatus = 'CancelledAfterStart' THEN
        RAISE EXCEPTION 'Entry already cancelled';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot cancel a paid entry';
    END IF;

    -- Prevent duplicate pending cancellation request
    SELECT cer.changeentryrequestid
    INTO v_existing_pend
    FROM public.changeentryrequest cer
    WHERE cer.originalentryid = p_entryid
      AND cer.status = 'Pending'
      AND cer.iscancelled = TRUE
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending cancellation request already exists for this entry';
    END IF;

    INSERT INTO public.changeentryrequest (
        originalentryid,
        newentryid,
        requestdatetime,
        status,
        iscancelled
    )
    VALUES (
        p_entryid,
        NULL,
        now(),
        'Pending',
        TRUE
    )
    RETURNING changeentryrequestid INTO v_new_request_id;

    RETURN v_new_request_id;
END;
$$;
