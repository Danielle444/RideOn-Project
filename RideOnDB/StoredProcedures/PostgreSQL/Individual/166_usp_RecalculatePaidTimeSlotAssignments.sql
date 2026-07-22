CREATE OR REPLACE FUNCTION public.usp_recalculatepaidtimeslotassignments(p_ranchid integer, p_assignedcompslotid integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    v_slotdate date;
    v_slotstart time;
    v_slotend time;
    v_slot_start_ts timestamp with time zone;
    v_slot_end_ts timestamp with time zone;

    v_max_order integer;
    v_order integer := 1;
    v_current_start timestamp with time zone;

    v_requestid integer;
    v_duration integer;
    v_competitionid integer;
begin
    select
        ptc.slotdate,
        ptc.starttime,
        ptc.endtime,
        ptc.competitionid
    into
        v_slotdate,
        v_slotstart,
        v_slotend,
        v_competitionid
    from paidtimeslotincompetition ptc
    inner join competition c
        on c.competitionid = ptc.competitionid
    where ptc.paidtimeslotincompid = p_assignedcompslotid
      and c.hostranchid = p_ranchid;

    if v_slotdate is null then
        raise exception 'Paid time slot not found for this ranch';
    end if;

    -- נעילת-ייעוץ ברמת התחרות. הפרוצדורה נקראת בדרך-כלל מתוך פרוצדורה נועלת
    -- אחרת (assign/transfer/unassign) - נעילת-טרנזקציה חוזרת על אותו מפתח
    -- אינה חוסמת (re-entrant), ולכן בטוח לרכוש אותה גם כאן.
    perform pg_advisory_xact_lock(1734, v_competitionid);

    v_slot_start_ts := (v_slotdate + v_slotstart)::timestamp with time zone;
    v_slot_end_ts := (v_slotdate + v_slotend)::timestamp with time zone;
    v_current_start := v_slot_start_ts;

    select max(ptr.assignedorder)
    into v_max_order
    from paidtimerequest ptr
    where ptr.assignedcompslotid = p_assignedcompslotid
      and ptr.status = 'Assigned';

    if v_max_order is null then
        return;
    end if;

    while v_order <= v_max_order loop
        v_requestid := null;
        v_duration := 11; -- מקום ריק נחשב כברירת מחדל כמו ארוך

        select
            ptr.paidtimerequestid,
            ptp.durationminutes + 1
        into
            v_requestid,
            v_duration
        from paidtimerequest ptr
        inner join pricecatalog pc
            on pc.pricecatalogid = ptr.pricecatalogid
        inner join paidtimeproduct ptp
            on ptp.productid = pc.productid
        where ptr.assignedcompslotid = p_assignedcompslotid
          and ptr.status = 'Assigned'
          and ptr.assignedorder = v_order
        limit 1;

        if v_requestid is not null then
            if v_current_start + (v_duration || ' minutes')::interval > v_slot_end_ts then
                raise exception 'Paid time slot capacity exceeded';
            end if;

            update paidtimerequest
            set assignedstarttime = v_current_start
            where paidtimerequestid = v_requestid;
        end if;

        v_current_start := v_current_start + (v_duration || ' minutes')::interval;
        v_order := v_order + 1;
    end loop;
end;
$function$;
