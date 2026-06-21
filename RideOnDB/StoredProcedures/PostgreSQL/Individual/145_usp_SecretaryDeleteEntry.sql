-- ============================================================================
-- usp_SecretaryDeleteEntry
-- ============================================================================
-- Direct cancel of an entry by the host secretary (no pending change request).
-- Pattern: soft-delete via entry.entrystatus + audit row in changeentryrequest
-- (status='Approved', iscancelled=true) so the action is traceable.
-- Also marks the related billcharge as Cancelled so it stops showing in
-- payment screens.
--
-- Ownership: caller must hold the 'מזכירת חווה מארחת' role at the ranch
-- that hosts the competition this entry belongs to.
--
-- Guards:
--   - Entry exists
--   - Not already cancelled
--   - Not paid (sr.paymentid IS NULL)
--   - No open pending change request (to avoid race)
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_secretarydeleteentry(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_secretarydeleteentry(
    p_entryid                  integer,
    p_secretarysystemuserid    integer
)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    v_classincompid    integer;
    v_competitionid    integer;
    v_hostranchid      integer;
    v_paymentid        integer;
    v_entrystatus      varchar;
    v_existing_pend    integer;
    v_new_request_id   integer;
BEGIN
    -- Look up entry context
    SELECT
        e.classincompid,
        cic.competitionid,
        c.hostranchid,
        sr.paymentid,
        COALESCE(e.entrystatus, 'Active')
    INTO
        v_classincompid,
        v_competitionid,
        v_hostranchid,
        v_paymentid,
        v_entrystatus
    FROM public.entry e
    JOIN public.classincompetition cic ON cic.classincompid = e.classincompid
    JOIN public.competition c ON c.competitionid = cic.competitionid
    JOIN public.servicerequest sr ON sr.srequestid = e.entryid
    WHERE e.entryid = p_entryid;

    IF v_classincompid IS NULL THEN
        RAISE EXCEPTION 'Entry not found';
    END IF;

    -- Ownership: secretary of the host ranch
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

    IF v_entrystatus = 'Cancelled' OR v_entrystatus = 'CancelledAfterStart' THEN
        RAISE EXCEPTION 'Entry already cancelled';
    END IF;

    IF v_paymentid IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete a paid entry';
    END IF;

    -- Block if another change request is still Pending
    SELECT cer.changeentryrequestid
    INTO v_existing_pend
    FROM public.changeentryrequest cer
    WHERE cer.originalentryid = p_entryid
      AND cer.status = 'Pending'
    LIMIT 1;

    IF v_existing_pend IS NOT NULL THEN
        RAISE EXCEPTION 'A pending change request exists for this entry — resolve it first';
    END IF;

    -- Audit row: pre-approved cancel by secretary
    INSERT INTO public.changeentryrequest (
        originalentryid,
        newentryid,
        requestdatetime,
        status,
        iscancelled,
        fineid,
        fineamountsnapshot
    )
    VALUES (
        p_entryid,
        NULL,
        now(),
        'Approved',
        TRUE,
        NULL,
        NULL
    )
    RETURNING changeentryrequestid INTO v_new_request_id;

    -- Mark entry as cancelled
    UPDATE public.entry
    SET entrystatus              = 'Cancelled',
        cancelledat              = now(),
        cancelledbychangerequestid = v_new_request_id
    WHERE entryid = p_entryid;

    -- Cancel related charges
    UPDATE public.billcharge
    SET chargestatus = 'Cancelled',
        cancelledat  = now()
    WHERE sourcetype = 'Entry'
      AND sourceid   = p_entryid
      AND chargestatus IN ('Open', 'PendingApproval');

    RETURN v_new_request_id;
END;
$$;
