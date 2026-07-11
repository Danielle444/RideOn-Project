-- הוספת BatchId+BatchPayload משנה את טבלת ההחזרה - חייבים DROP לפני CREATE.
DROP FUNCTION IF EXISTS usp_GetPaidTimeRequestsForAssignment(INTEGER, INTEGER[], BOOLEAN);

CREATE OR REPLACE FUNCTION usp_GetPaidTimeRequestsForAssignment(
    p_CompetitionId       INTEGER,
    p_SelectedCompSlotIds INTEGER[],
    p_IncludeAllPending   BOOLEAN
)
RETURNS TABLE(
    "PaidTimeRequestId"         INTEGER,
    "RequestedCompSlotId"       INTEGER,
    "AssignedCompSlotId"        INTEGER,
    "AssignedStartTime"         TIMESTAMP WITH TIME ZONE,
    "AssignedOrder"             INTEGER,
    "Status"                    TEXT,
    "Notes"                     TEXT,
    "HorseId"                   INTEGER,
    "HorseName"                 TEXT,
    "BarnName"                  TEXT,
    "RanchId"                   INTEGER,
    "RiderFederationMemberId"   INTEGER,
    "RiderName"                 TEXT,
    "CoachFederationMemberId"   INTEGER,
    "CoachName"                 TEXT,
    "PaidByPersonId"            INTEGER,
    "PayerName"                 TEXT,
    "ProductId"                 SMALLINT,
    "ProductName"               TEXT,
    "DurationMinutes"           INTEGER,
    "EffectiveDurationMinutes"  INTEGER,
    "RequestedSlotDate"         DATE,
    "RequestedStartTime"        TIME,
    "RequestedEndTime"          TIME,
    "RequestedArenaName"        TEXT,
    "AssignedSlotDate"          DATE,
    "AssignedSlotStartTime"     TIME,
    "AssignedSlotEndTime"       TIME,
    "AssignedArenaName"         TEXT,
    "BatchId"                   INTEGER,
    "BatchPayload"              JSONB
)
LANGUAGE plpgsql AS $$
begin
    return query
    select
        ptr.paidtimerequestid,
        ptr.requestedcompslotid,
        ptr.assignedcompslotid,
        ptr.assignedstarttime,
        ptr.assignedorder,
        ptr.status::text,
        ptr.notes::text,

        h.horseid,
        h.horsename::text,
        h.barnname::text,
        h.ranchid,

        sr.riderfederationmemberid,
        (rider_person.firstname || ' ' || rider_person.lastname) as ridername,

        sr.coachfederationmemberid,
        case
            when coach_person.personid is null then null
            else coach_person.firstname || ' ' || coach_person.lastname
        end as coachname,

        b.paidbypersonid,
        (payer_person.firstname || ' ' || payer_person.lastname) as payername,

        pc.productid,
        p.productname::text,
        ptp.durationminutes,
        ptp.durationminutes + 1 as effectivedurationminutes,

        requested_slot.slotdate,
        requested_slot.starttime,
        requested_slot.endtime,
        requested_arena.arenaname::text,

        assigned_slot.slotdate,
        assigned_slot.starttime,
        assigned_slot.endtime,
        assigned_arena.arenaname::text,

        ptr.batchid,
        batch.payload

    from paidtimerequest ptr
    inner join servicerequest sr
        on sr.srequestid = ptr.paidtimerequestid
    inner join horse h
        on h.horseid = sr.horseid
    inner join federationmember rider_fm
        on rider_fm.federationmemberid = sr.riderfederationmemberid
    inner join person rider_person
        on rider_person.personid = rider_fm.federationmemberid
    left join federationmember coach_fm
        on coach_fm.federationmemberid = sr.coachfederationmemberid
    left join person coach_person
        on coach_person.personid = coach_fm.federationmemberid
    inner join bill b
        on b.billid = sr.billid
    inner join person payer_person
        on payer_person.personid = b.paidbypersonid
    inner join pricecatalog pc
        on pc.pricecatalogid = ptr.pricecatalogid
    inner join product p
        on p.productid = pc.productid
    inner join paidtimeproduct ptp
        on ptp.productid = pc.productid
    inner join paidtimeslotincompetition requested_slot
        on requested_slot.paidtimeslotincompid = ptr.requestedcompslotid
    inner join arena requested_arena
        on requested_arena.ranchid = requested_slot.arenaranchid
       and requested_arena.arenaid = requested_slot.arenaid
    left join paidtimeslotincompetition assigned_slot
        on assigned_slot.paidtimeslotincompid = ptr.assignedcompslotid
    left join arena assigned_arena
        on assigned_arena.ranchid = assigned_slot.arenaranchid
       and assigned_arena.arenaid = assigned_slot.arenaid
    left join paidtimerequestbatch batch
        on batch.batchid = ptr.batchid
    where requested_slot.competitionid = p_competitionid
      and (
            ptr.assignedcompslotid = any(p_selectedcompslotids)
            or (
                ptr.status = 'Pending'
                and (
                    p_includeallpending = true
                    or ptr.requestedcompslotid = any(p_selectedcompslotids)
                )
            )
      )
    order by
        ptr.assignedcompslotid nulls last,
        ptr.assignedorder nulls last,
        ptr.assignedstarttime nulls last,
        requested_slot.slotdate,
        requested_slot.starttime,
        sr.srequestdatetime;
end;
$$;
