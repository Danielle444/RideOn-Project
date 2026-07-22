CREATE OR REPLACE FUNCTION usp_UnassignPaidTimeRequest(
    p_RanchId           INTEGER,
    p_PaidTimeRequestId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
declare
    v_previous_slotid integer;
    v_competitionid integer;
begin
    select
        ptr.assignedcompslotid,
        requested_slot.competitionid
    into
        v_previous_slotid,
        v_competitionid
    from paidtimerequest ptr
    inner join paidtimeslotincompetition requested_slot
        on requested_slot.paidtimeslotincompid = ptr.requestedcompslotid
    inner join competition c
        on c.competitionid = requested_slot.competitionid
    where ptr.paidtimerequestid = p_paidtimerequestid
      and c.hostranchid = p_ranchid;

    if not found then
        raise exception 'Paid time request not found for this ranch';
    end if;

    -- נעילת-ייעוץ ברמת התחרות (מזהה-התחרות קבוע, נקרא לפני הנעילה).
    perform pg_advisory_xact_lock(1734, v_competitionid);

    update paidtimerequest
    set
        assignedcompslotid = null,
        assignedstarttime = null,
        assignedorder = null,
        status = 'Pending',
        allocationorigin = null   -- אין שיבוץ פעיל
    where paidtimerequestid = p_paidtimerequestid;

    if v_previous_slotid is not null then
        perform public.usp_recalculatepaidtimeslotassignments(
            p_ranchid,
            v_previous_slotid
        );
    end if;
end;
$$;
