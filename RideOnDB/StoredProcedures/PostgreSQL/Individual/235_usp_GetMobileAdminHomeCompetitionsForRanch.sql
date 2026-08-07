-- CAP-1 (mobile-home-boards-unification, 2026-08-05): additive ranch-scoped
-- replacement for the admin-home teaser. usp_getmobileadminhomecompetitions
-- (person-scoped, EXISTS-gated on personal orders) is left unchanged so the
-- currently-deployed backend keeps working until this branch's server ships.
--
-- CAP-1 fix (competition-visibility-gating-backend, 2026-08-06): the original
-- filter matched on stored competitionstatus in ('כעת','פעילה','עתידית') --
-- values that are recomputed in C# (Competition.CalculateEffectiveStatus) and
-- are not reliably persisted, so the filter matched zero rows in practice
-- (live audit: no row in the table has ever stored any of those three
-- values). Replaced with a date-based gate (not yet finished) plus explicit
-- exclusion of the two reliably-stored non-public states; LIMIT widened from
-- 3 to 10 so the BL's own effective-status recompute + Take(3) still has a
-- real candidate pool to work with.
--
-- Bug 5 fix (ranch-admin-home-competitions, 2026-08-06): hostranchid-only
-- match hid every competition a ranch merely PARTICIPATES in without
-- hosting it. Live proof: ranch 17 (משה) has 2 Active entries, a stall
-- booking and a paid-time request in competition 78 (hosted by ranch 11)
-- and this proc returned zero rows for ranch 17. Added an OR'd participation
-- check via EXISTS (never a JOIN, so a ranch with multiple participation
-- records in the same competition still gets exactly one row):
--   * entries: entry -> servicerequest -> horse.ranchid, whitelisted to
--     COALESCE(entrystatus,'Active') = 'Active' -- same convention as
--     104_usp_GetHorsesForCompetition and 220_usp_GetRegistrationStepStatus.
--   * stall bookings: productrequest -> stallbooking.requestingranchid, the
--     current (2026-08-05) post-ranch-conflation-fix column for "which ranch
--     asked for this booking" (stallbooking.ranchid now means HOST ranch --
--     see migrations/add_stallbooking_requestingranchid.sql). Matches
--     176_usp_GetShavingsOrdersForCompetitionAndRanch's filter.
--   * paid time: paidtimeslotincompetition -> paidtimerequest ->
--     servicerequest -> horse.ranchid.
--   * shavings orders deliberately NOT queried separately: every shavings
--     order requires an underlying stallbooking row, already covered above.
--   * no competitioninvitation-style table exists in the live schema
--     (checked information_schema.tables) -- not a real participation source.
-- usp_getcompetitionsformobilepayer was read as a reference but not copied:
-- it is person-scoped (bill.paidbypersonid), the wrong dimension for a
-- ranch-wide teaser, and applies no entrystatus filter at all. Return
-- shape/params unchanged from live -- CREATE OR REPLACE, no DROP needed.

CREATE OR REPLACE FUNCTION public.usp_getmobileadminhomecompetitionsforranch(p_ranchid integer)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer, "HostRanchName" text, "FieldId" smallint, "CreatedBySystemUserId" integer, "CompetitionName" character varying, "CompetitionStartDate" date, "CompetitionEndDate" date, "RegistrationOpenDate" date, "RegistrationEndDate" date, "PaidTimeRegistrationDate" date, "PaidTimePublicationDate" date, "CompetitionStatus" character varying, "Notes" character varying, "StallMapUrl" character varying, "FieldName" text)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    select
        c.competitionid as "CompetitionId",
        c.hostranchid as "HostRanchId",
        r.ranchname::text as "HostRanchName",
        c.fieldid as "FieldId",
        c.createdbysystemuserid as "CreatedBySystemUserId",
        c.competitionname as "CompetitionName",
        c.competitionstartdate as "CompetitionStartDate",
        c.competitionenddate as "CompetitionEndDate",
        c.registrationopendate as "RegistrationOpenDate",
        c.registrationenddate as "RegistrationEndDate",
        c.paidtimeregistrationdate as "PaidTimeRegistrationDate",
        c.paidtimepublicationdate as "PaidTimePublicationDate",
        c.competitionstatus as "CompetitionStatus",
        c.notes as "Notes",
        c.stallmapurl as "StallMapUrl",
        f.fieldname::text as "FieldName"
    from public.competition c
    inner join public.field f
        on f.fieldid = c.fieldid
    inner join public.ranch r
        on c.hostranchid = r.ranchid
    where (
        c.hostranchid = p_ranchid
        or exists (
            select 1
            from public.classincompetition cic
            inner join public.entry e
                on e.classincompid = cic.classincompid
            inner join public.servicerequest sr
                on sr.srequestid = e.entryid
            inner join public.horse h
                on h.horseid = sr.horseid
            where cic.competitionid = c.competitionid
              and h.ranchid = p_ranchid
              and coalesce(e.entrystatus, 'Active') = 'Active'
        )
        or exists (
            select 1
            from public.productrequest pr
            inner join public.stallbooking sb
                on sb.stallbookingid = pr.prequestid
            where pr.competitionid = c.competitionid
              and sb.requestingranchid = p_ranchid
        )
        or exists (
            select 1
            from public.paidtimeslotincompetition ptsc
            inner join public.paidtimerequest ptr
                on ptr.requestedcompslotid = ptsc.paidtimeslotincompid
            inner join public.servicerequest sr
                on sr.srequestid = ptr.paidtimerequestid
            inner join public.horse h
                on h.horseid = sr.horseid
            where ptsc.competitionid = c.competitionid
              and h.ranchid = p_ranchid
        )
    )
      and c.competitionenddate >= current_date
      and c.competitionstatus is distinct from 'טיוטה'
      and c.competitionstatus is distinct from 'בוטלה'
    order by
        c.competitionstartdate asc
    limit 10;
end;
$function$
