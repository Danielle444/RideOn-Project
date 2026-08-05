-- CAP-1 (mobile-home-boards-unification, 2026-08-05): additive ranch-scoped
-- replacement for the admin-home teaser. usp_getmobileadminhomecompetitions
-- (person-scoped, EXISTS-gated on personal orders) is left unchanged so the
-- currently-deployed backend keeps working until this branch's server ships.

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
    where c.hostranchid = p_ranchid
      and c.competitionstatus in ('כעת', 'פעילה', 'עתידית')
    order by
        case c.competitionstatus
            when 'כעת' then 0
            when 'פעילה' then 1
            when 'עתידית' then 2
        end,
        c.competitionstartdate asc
    limit 3;
end;
$function$
