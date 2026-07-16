CREATE OR REPLACE FUNCTION public.usp_getpaidtimeslotsbycompid(p_competitionid integer)
 RETURNS TABLE("PaidTimeSlotInCompId" integer, "PaidTimeSlotId" integer, "SlotDate" date, "TimeOfDay" character varying, "StartTime" time without time zone, "EndTime" time without time zone, "ArenaRanchId" integer, "ArenaId" integer, "ArenaName" character varying, "SlotStatus" character varying, "SlotNotes" character varying, "TotalCapacityMinutes" integer, "UsedCapacityMinutes" integer, "RemainingCapacityMinutes" integer, "EstimatedAvailablePlaces" integer, "AssignedCount" integer, "PendingRequestsCount" integer)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select
        ptc.paidtimeslotincompid,
        ptc.paidtimeslotid,
        ptc.slotdate,
        pt.timeofday,
        ptc.starttime,
        ptc.endtime,
        ptc.arenaranchid,
        ptc.arenaid,
        a.arenaname,
        ptc.slotstatus,
        ptc.slotnotes,

        greatest(
            (extract(epoch from (ptc.endtime - ptc.starttime))::integer / 60) - 10,
            0
        ) as totalcapacityminutes,

        coalesce(sum(ptp.durationminutes + 1), 0)::integer as usedcapacityminutes,

        greatest(
            greatest(
                (extract(epoch from (ptc.endtime - ptc.starttime))::integer / 60) - 10,
                0
            ) - coalesce(sum(ptp.durationminutes + 1), 0)::integer,
            0
        ) as remainingcapacityminutes,

        greatest(
            floor(
                greatest(
                    greatest(
                        (extract(epoch from (ptc.endtime - ptc.starttime))::integer / 60) - 10,
                        0
                    ) - coalesce(sum(ptp.durationminutes + 1), 0)::integer,
                    0
                ) / 11
            )::integer,
            0
        ) as estimatedavailableplaces,

        count(ptr.paidtimerequestid)::integer as assignedcount,

        (
            select count(*)::integer
            from paidtimerequest pending_ptr
            where pending_ptr.requestedcompslotid = ptc.paidtimeslotincompid
              and pending_ptr.status = 'Pending'
              and pending_ptr.assignedcompslotid is null
        ) as pendingrequestscount

    from paidtimeslotincompetition ptc
    inner join paidtimeslot pt
        on ptc.paidtimeslotid = pt.paidtimeslotid
    inner join arena a
        on ptc.arenaranchid = a.ranchid
       and ptc.arenaid = a.arenaid
    left join paidtimerequest ptr
        on ptr.assignedcompslotid = ptc.paidtimeslotincompid
       and ptr.status = 'Assigned'
    left join pricecatalog pc
        on pc.pricecatalogid = ptr.pricecatalogid
    left join paidtimeproduct ptp
        on ptp.productid = pc.productid
    where ptc.competitionid = p_competitionid
    group by
        ptc.paidtimeslotincompid,
        ptc.paidtimeslotid,
        ptc.slotdate,
        pt.timeofday,
        ptc.starttime,
        ptc.endtime,
        ptc.arenaranchid,
        ptc.arenaid,
        a.arenaname,
        ptc.slotstatus,
        ptc.slotnotes
    order by ptc.slotdate asc, ptc.starttime asc;
end;
$function$;
