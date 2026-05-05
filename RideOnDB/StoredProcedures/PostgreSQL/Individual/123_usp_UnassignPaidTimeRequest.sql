CREATE OR REPLACE FUNCTION usp_UnassignPaidTimeRequest(
    p_RanchId           INTEGER,
    p_PaidTimeRequestId INTEGER
)
RETURNS VOID
LANGUAGE plpgsql AS $$
declare
    v_previous_slotid integer;
begin
    select ptr.assignedcompslotid
    into v_previous_slotid
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

    update paidtimerequest
    set
        assignedcompslotid = null,
        assignedstarttime = null,
        assignedorder = null,
        status = 'Pending'
    where paidtimerequestid = p_paidtimerequestid;

    if v_previous_slotid is not null then
        perform public.usp_recalculatepaidtimeslotassignments(
            p_ranchid,
            v_previous_slotid
        );
    end if;
end;
$$;
