-- =============================================================================
-- usp_GetHostSecretaryPendingChangeRequestsCount
-- Ranch-wide pending change/cancel request badge count (entry + product).
--
-- CAP-1b (SPEC-change-tracking-improvements): mirror the list proc's paid-zombie
-- filter so the badge count agrees with the rows actually rendered. Both
-- subqueries are already Pending-only, so this is a pure `and not exists (...)`
-- addition using the answer procs' exact paid definition
-- (billcharge.chargestatus='Paid', keyed by sourcetype/sourceid). Single
-- PendingCount output column unchanged -> CREATE OR REPLACE is safe.
--
-- NOTE (by design, not a bug): this count is ranch-wide while the list is
-- competition-scoped, so the badge can legitimately exceed one competition's
-- visible rows. The paid filter keeps them consistent per request; it does not
-- collapse the ranch-vs-competition scope difference.
--
-- These procs are live-only historically; this file is the first committed copy.
-- Body captured from live via pg_get_functiondef on 2026-07-27.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.usp_gethostsecretarypendingchangerequestscount(p_ranchid integer)
 RETURNS TABLE("PendingCount" integer)
 LANGUAGE plpgsql
AS $function$
begin
    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    return query
    select
        (
            coalesce((
                select count(*)
                from changeentryrequest cer
                inner join entry e
                    on e.entryid = cer.originalentryid
                inner join classincompetition cic
                    on cic.classincompid = e.classincompid
                inner join competition c
                    on c.competitionid = cic.competitionid
                where c.hostranchid = p_ranchid
                  and lower(cer.status) = 'pending'
                  -- CAP-1b: exclude paid zombies so the badge matches the list
                  and not exists (
                      select 1 from public.billcharge bc
                      where bc.sourcetype = 'Entry'
                        and bc.sourceid = cer.originalentryid
                        and bc.chargestatus = 'Paid'
                  )
            ), 0)
            +
            coalesce((
                select count(*)
                from productchangerequest pcr
                inner join productrequest pr
                    on pr.prequestid = pcr.originalprequestid
                inner join competition c
                    on c.competitionid = pr.competitionid
                where c.hostranchid = p_ranchid
                  and lower(pcr.status) = 'pending'
                  -- CAP-1b: exclude paid zombies so the badge matches the list
                  and not exists (
                      select 1 from public.billcharge bc
                      where bc.sourcetype = 'ProductRequest'
                        and bc.sourceid = pcr.originalprequestid
                        and bc.chargestatus = 'Paid'
                  )
            ), 0)
        )::integer as "PendingCount";
end;
$function$;
