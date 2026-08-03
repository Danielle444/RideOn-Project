-- ============================================================================
-- usp_getorcreateopenbillforpayerandcompetition - fetch or lazily create a payer's bill
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). DB-internal helper - never called directly from C#, only from
-- other charge-creating procs (usp_insertentry, usp_createstallbooking,
-- usp_createshavingsorder, usp_insertpaidtimerequest). Delegates to
-- usp_getopenbillforpayerandcompetition (not part of this recovery batch; not
-- flagged as a subsystem issue in the audit). No issue specific to this proc
-- was flagged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getorcreateopenbillforpayerandcompetition(p_paidbypersonid integer, p_competitionid integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
    v_billid integer;
begin
    if p_paidbypersonid is null or p_paidbypersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if not exists (
        select 1
        from public.person p
        where p.personid = p_paidbypersonid
    ) then
        raise exception 'Payer not found';
    end if;

    if not exists (
        select 1
        from public.competition c
        where c.competitionid = p_competitionid
    ) then
        raise exception 'Competition not found';
    end if;

    v_billid :=
        public.usp_getopenbillforpayerandcompetition(
            p_paidbypersonid,
            p_competitionid
        );

    if v_billid is not null then
        return v_billid;
    end if;

    insert into public.bill
    (
        paidbypersonid,
        competitionid,
        amounttopay,
        dateopened,
        dateclosed
    )
    values
    (
        p_paidbypersonid,
        p_competitionid,
        0,
        now(),
        null
    )
    returning billid
    into v_billid;

    return v_billid;
end;
$function$
