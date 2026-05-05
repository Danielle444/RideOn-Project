CREATE OR REPLACE FUNCTION usp_AssignPaidTimeRequest(
    p_RanchId             INTEGER,
    p_PaidTimeRequestId   INTEGER,
    p_AssignedCompSlotId  INTEGER,
    p_AssignedOrder       INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
declare
    v_request_competitionid integer;
    v_assigned_competitionid integer;
    v_previous_slotid integer;
    v_existing_name text;
begin
    if p_assignedorder is null or p_assignedorder <= 0 then
        raise exception 'Invalid assigned order';
    end if;

    select
        requested_slot.competitionid,
        ptr.assignedcompslotid
    into
        v_request_competitionid,
        v_previous_slotid
    from paidtimerequest ptr
    inner join paidtimeslotincompetition requested_slot
        on requested_slot.paidtimeslotincompid = ptr.requestedcompslotid
    inner join competition c
        on c.competitionid = requested_slot.competitionid
    where ptr.paidtimerequestid = p_paidtimerequestid
      and c.hostranchid = p_ranchid;

    if v_request_competitionid is null then
        raise exception 'Paid time request not found for this ranch';
    end if;

    select ptc.competitionid
    into v_assigned_competitionid
    from paidtimeslotincompetition ptc
    inner join competition c
        on c.competitionid = ptc.competitionid
    where ptc.paidtimeslotincompid = p_assignedcompslotid
      and c.hostranchid = p_ranchid;

    if v_assigned_competitionid is null then
        raise exception 'Assigned paid time slot not found for this ranch';
    end if;

    if v_request_competitionid <> v_assigned_competitionid then
        raise exception 'Cannot assign paid time request to a slot from another competition';
    end if;

    select coalesce(h.barnname, h.horsename)
    into v_existing_name
    from paidtimerequest ptr
    inner join servicerequest sr
        on sr.srequestid = ptr.paidtimerequestid
    inner join horse h
        on h.horseid = sr.horseid
    where ptr.assignedcompslotid = p_assignedcompslotid
      and ptr.assignedorder = p_assignedorder
      and ptr.status = 'Assigned'
      and ptr.paidtimerequestid <> p_paidtimerequestid
    limit 1;

    if v_existing_name is not null then
        raise exception 'המקום % כבר תפוס על ידי %. יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים',
            p_assignedorder,
            v_existing_name;
    end if;

    update paidtimerequest
    set
        assignedcompslotid = p_assignedcompslotid,
        assignedorder = p_assignedorder,
        assignedstarttime = null,
        status = 'Assigned'
    where paidtimerequestid = p_paidtimerequestid;

    perform public.usp_recalculatepaidtimeslotassignments(
        p_ranchid,
        p_assignedcompslotid
    );

    if v_previous_slotid is not null and v_previous_slotid <> p_assignedcompslotid then
        perform public.usp_recalculatepaidtimeslotassignments(
            p_ranchid,
            v_previous_slotid
        );
    end if;
end;
$$;
