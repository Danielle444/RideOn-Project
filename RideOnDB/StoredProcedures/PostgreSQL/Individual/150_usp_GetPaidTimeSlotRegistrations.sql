-- ============================================================================
-- usp_GetPaidTimeSlotRegistrations
-- ============================================================================
-- Returns every paidtimerequest that touches the given slot — both rows
-- whose requestedcompslotid is this slot (Pending requests for it) and rows
-- assigned to this slot.
--
-- Used by the secretary "click on slot" modal to see who's there + Pending.
--
-- Ownership: secretary of the competition's host ranch (slot lives inside
-- a competition's arena).
-- ============================================================================

DROP FUNCTION IF EXISTS public.usp_getpaidtimeslotregistrations(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getpaidtimeslotregistrations(
    p_slotincompid             integer,
    p_secretarysystemuserid    integer
)
RETURNS TABLE (
    paidtimerequestid          integer,
    requeststatus              varchar,
    isassignedtothisslot       boolean,
    isrequestedforthisslot     boolean,
    assignedstarttime          timestamptz,
    assignedorder              integer,
    productname                varchar,
    durationminutes            integer,
    horseid                    integer,
    horsename                  varchar,
    barnname                   varchar,
    riderfederationmemberid    integer,
    ridername                  varchar,
    coachfederationmemberid    integer,
    coachname                  varchar,
    paidbypersonid             integer,
    payername                  varchar,
    notes                      varchar
)
LANGUAGE plpgsql AS $$
DECLARE
    v_competitionid    integer;
    v_hostranchid      integer;
BEGIN
    SELECT pts.competitionid, c.hostranchid
    INTO v_competitionid, v_hostranchid
    FROM public.paidtimeslotincompetition pts
    JOIN public.competition c ON c.competitionid = pts.competitionid
    WHERE pts.paidtimeslotincompid = p_slotincompid;

    IF v_competitionid IS NULL THEN
        RAISE EXCEPTION 'Paid time slot not found';
    END IF;

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

    RETURN QUERY
    SELECT
        ptr.paidtimerequestid,
        ptr.status::varchar                                            AS requeststatus,
        (ptr.assignedcompslotid = p_slotincompid)                      AS isassignedtothisslot,
        (ptr.requestedcompslotid = p_slotincompid
            AND ptr.assignedcompslotid IS DISTINCT FROM p_slotincompid)
                                                                       AS isrequestedforthisslot,
        ptr.assignedstarttime,
        ptr.assignedorder,
        prod.productname::varchar,
        ptp.durationminutes,
        sr.horseid,
        h.horsename::varchar,
        h.barnname::varchar,
        sr.riderfederationmemberid,
        (rider_p.firstname || ' ' || rider_p.lastname)::varchar        AS ridername,
        sr.coachfederationmemberid,
        CASE
            WHEN sr.coachfederationmemberid IS NULL THEN NULL
            ELSE (coach_p.firstname || ' ' || coach_p.lastname)::varchar
        END                                                            AS coachname,
        b.paidbypersonid,
        (payer_p.firstname || ' ' || payer_p.lastname)::varchar        AS payername,
        ptr.notes::varchar
    FROM public.paidtimerequest ptr
    JOIN public.servicerequest sr      ON sr.srequestid    = ptr.paidtimerequestid
    JOIN public.bill b                 ON b.billid         = sr.billid
    JOIN public.horse h                ON h.horseid        = sr.horseid
    JOIN public.person rider_p         ON rider_p.personid = sr.riderfederationmemberid
    LEFT JOIN public.person coach_p    ON coach_p.personid = sr.coachfederationmemberid
    JOIN public.person payer_p         ON payer_p.personid = b.paidbypersonid
    JOIN public.pricecatalog pc        ON pc.pricecatalogid = ptr.pricecatalogid
    JOIN public.product prod           ON prod.productid    = pc.productid
    LEFT JOIN public.paidtimeproduct ptp ON ptp.productid   = prod.productid
    WHERE ptr.requestedcompslotid = p_slotincompid
       OR ptr.assignedcompslotid  = p_slotincompid
    ORDER BY isassignedtothisslot DESC, ptr.assignedorder NULLS LAST,
             ptr.paidtimerequestid;
END;
$$;
