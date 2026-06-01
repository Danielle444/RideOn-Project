-- ============================================================================
-- usp_UpdatePaidTimeNotesByPayer
-- ============================================================================
-- Payer updates the notes field on their own paid-time request.
-- Limited scope: notes only (no slot change, no product change).
--
-- Ownership: payer must be bill.paidbypersonid via servicerequest.billid.
-- Guards: not already paid, not cancelled.
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_updatepaidtimenotesbypayer(integer, integer, text);

CREATE OR REPLACE FUNCTION public.usp_updatepaidtimenotesbypayer(
    p_paidtimerequestid  integer,
    p_payerpersonid      integer,
    p_notes              text
)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_personid  integer;
    v_paymentid       integer;
    v_status          varchar;
BEGIN
    SELECT
        b.paidbypersonid,
        sr.paymentid,
        ptr.status
    INTO
        v_owner_personid,
        v_paymentid,
        v_status
    FROM public.paidtimerequest ptr
    JOIN public.servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
    JOIN public.bill b ON b.billid = sr.billid
    WHERE ptr.paidtimerequestid = p_paidtimerequestid;

    IF v_owner_personid IS NULL THEN
        RAISE EXCEPTION 'Paid time request not found';
    END IF;

    IF v_owner_personid <> p_payerpersonid THEN
        RAISE EXCEPTION 'Permission denied: payer does not own this paid time request';
    END IF;

    IF v_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Cannot edit a cancelled request';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit a paid request';
    END IF;

    UPDATE public.paidtimerequest
    SET notes = NULLIF(TRIM(p_notes), '')
    WHERE paidtimerequestid = p_paidtimerequestid;
END;
$$;
