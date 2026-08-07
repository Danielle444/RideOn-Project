-- ============================================================================
-- usp_GetStallAssignmentsForCompetitionPayer - payer-safe stall-map assignment
-- projection (mobile stall-map slice 1, 2026-08-07).
-- ============================================================================
-- LIVE (confirmed via pg_get_functiondef, 2026-08-07). The header below
-- previously read "NOT YET APPLIED LIVE" -- that was stale; a live read
-- proved this body was already deployed byte-for-byte before the IsMyRanch
-- addition further down was applied.
--
-- Companion to usp_GetStallAssignmentsForCompetition (the existing
-- Admin/HostSecretary-only full-detail read, unchanged). That proc returns
-- StallBookingId/BookingRanchId/BookingRanchName/ProductName/HorseId and
-- HorseName/BarnName for EVERY assignment in the competition, unconditionally
-- - correct for RanchAdmin/HostSecretary (established, unchanged behavior)
-- but not safe to hand to a Payer, who must never receive another
-- participant's identifying details merely to render "this stall is
-- occupied."
--
-- Ownership predicate mirrors the ALREADY-PROVEN definition
-- usp_GetPayerCompetitionAccount's stall_items CTE uses (see
-- RideOnDB/StoredProcedures/PostgreSQL/Individual/212_usp_GetPayerCompetitionAccount.sql):
-- billcharge rows with sourcetype='ProductRequest', categorykey='stalls',
-- paidbypersonid = the payer, chargestatus in ('Open','Paid'). Not a new or
-- guessed rule.
--
-- Row-multiplication guard (explicit requirement): a stallbooking can have
-- MORE THAN ONE matching billcharge row (e.g. a stall product that also
-- carries a separate adjustment/fine charge under the same sourceid). A
-- naive `LEFT JOIN billcharge ... ON bc.sourceid = sb.stallbookingid` would
-- therefore multiply the stallassignment row once per matching billcharge
-- row. payer_owned_stallbookings pre-aggregates ownership to AT MOST ONE row
-- per stallbookingid (DISTINCT) BEFORE it is ever joined onto stallassignment,
-- so the final LEFT JOIN can never multiply rows - one assignment stays one
-- row regardless of how many billcharge rows back it.
--
-- Cross-competition hardening (2026-08-07, clarity/performance, not a
-- correctness fix): the ownership CTE now also filters
-- bc.competitionid = p_competitionid. This was never exploitable - the
-- outer query's own `where sa.competitionid = p_competitionid` already
-- limits every returned row to this competition, and stallbookingid is a
-- globally-unique PK so a match against a DIFFERENT competition's booking
-- could never occur. Added purely so the CTE's own scope reads as
-- self-evidently competition-bound, and so it scans fewer rows for a payer
-- with a long cross-competition billing history.
--
-- Safe column set only: AssignmentId, CompoundId, StallId, StallNumber,
-- IsOccupied (hardcoded true - every row here IS an occupied stall by
-- definition, since empty stalls have no stallassignment row at all),
-- IsMine, IsForTack (never identity-bearing, always safe), and
-- HorseName/BarnName - the ONLY two fields gated on IsMine, via CASE WHEN so
-- they are NULL at the SQL layer (never transmitted) when the stall belongs
-- to someone else. Deliberately OMITTED versus the admin proc:
-- StallBookingId, BookingRanchId, BookingRanchName, ProductName, HorseId -
-- none of these are needed to render occupied/mine/tack, and every one of
-- them identifies another participant or their ranch.
--
-- IsMyRanch (2026-08-07, "My ranch" UX, applied live via migration
-- add_ismyranch_to_stall_assignments_for_competition_payer). Deliberately
-- the ONE narrow exception to the redaction above: a same-ranch boolean, not
-- an identity. p_ranchid is the caller's own already-authorized active ranch
-- (StallAssignmentsController.GetAssignmentsForPayer already validates it via
-- EnsureUserHasRoleInRanch before this proc is ever called). The predicate
-- (sb.requestingranchid = p_ranchid) mirrors the authoritative "booking
-- ranch" column usp_GetStallAssignmentsForCompetition (the admin proc) uses
-- for the same concept (see the ranch-model correction note in
-- 107_usp_GetStallAssignmentsForCompetition.sql) - not a new or guessed
-- relationship. It reveals only same/not-same versus the caller, never the
-- actual requestingranchid value, ranch name, or any other participant
-- identity - StallBookingId/BookingRanchId/BookingRanchName/HorseId remain
-- fully absent from the return shape, unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getstallassignmentsforcompetitionpayer(p_competitionid integer, p_payerpersonid integer, p_ranchid integer)
 RETURNS TABLE(
     "AssignmentId" integer,
     "CompoundId" smallint,
     "StallId" smallint,
     "StallNumber" text,
     "IsOccupied" boolean,
     "IsMine" boolean,
     "IsForTack" boolean,
     "HorseName" text,
     "BarnName" text,
     "IsMyRanch" boolean
 )
 LANGUAGE plpgsql
AS $function$
begin
    return query
    with payer_owned_stallbookings as (
        select distinct bc.sourceid as stallbookingid
        from public.billcharge bc
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'stalls'
          and bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.chargestatus in ('Open', 'Paid')
    )
    select
        sa.assignmentid::integer as "AssignmentId",
        sa.compoundid::smallint as "CompoundId",
        sa.stallid::smallint as "StallId",
        s.stallnumber::text as "StallNumber",

        true::boolean as "IsOccupied",
        (pos.stallbookingid is not null)::boolean as "IsMine",
        sb.isfortack::boolean as "IsForTack",

        case when pos.stallbookingid is not null then h.horsename::text else null end as "HorseName",
        case when pos.stallbookingid is not null then h.barnname::text else null end as "BarnName",

        (sb.requestingranchid = p_ranchid)::boolean as "IsMyRanch"

    from public.stallassignment sa
    inner join public.stallbooking sb
        on sb.stallbookingid = sa.stallbookingid
    inner join public.stall s
        on s.ranchid = sa.ranchid
       and s.compoundid = sa.compoundid
       and s.stallid = sa.stallid
    left join public.horse h
        on h.horseid = sb.horseid
    left join payer_owned_stallbookings pos
        on pos.stallbookingid = sb.stallbookingid

    where sa.competitionid = p_competitionid

    order by
        sa.compoundid,
        s.stallnumber;
end;
$function$
