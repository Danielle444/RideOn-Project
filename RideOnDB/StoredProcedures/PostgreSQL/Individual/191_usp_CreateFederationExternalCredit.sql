-- ============================================================================
-- usp_createfederationexternalcredit - insert a federation external credit row
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository - it existed
-- live but had never been committed anywhere under RideOnDB/. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). See the Stage 1 audit report for the full subsystem findings.
-- No issue specific to this proc was flagged in that audit - it validates
-- source type / amount / competition / creator, then inserts with
-- creditstatus='Available', usedamount=0, availableamount=originalamount.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_createfederationexternalcredit(p_competitionid integer, p_sourcetype character varying, p_externalreference character varying, p_externalname character varying, p_externalclubname character varying, p_externalidnumber character varying, p_originalamount numeric, p_createdbysystemuserid integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(federationexternalcreditid integer, competitionid integer, sourcetype character varying, externalreference character varying, externalname character varying, externalclubname character varying, externalidnumber character varying, originalamount numeric, usedamount numeric, availableamount numeric, creditstatus character varying, createdbysystemuserid integer, createdat timestamp with time zone, notes text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null then
        raise exception 'Competition id is required';
    end if;

    if p_createdbysystemuserid is null then
        raise exception 'Created by system user id is required';
    end if;

    if p_sourcetype is null or trim(p_sourcetype) = '' then
        raise exception 'Source type is required';
    end if;

    if p_sourcetype not in (
        'ExcelReceipt',
        'BankTransfer',
        'PreviousCredit',
        'Manual',
        'Exception'
    ) then
        raise exception 'Invalid federation credit source type: %', p_sourcetype;
    end if;

    if p_originalamount is null or p_originalamount <= 0 then
        raise exception 'Original amount must be greater than zero';
    end if;

    if not exists (
        select 1
        from public.competition c
        where c.competitionid = p_competitionid
    ) then
        raise exception 'Competition % was not found', p_competitionid;
    end if;

    if not exists (
        select 1
        from public.systemuser su
        where su.systemuserid = p_createdbysystemuserid
    ) then
        raise exception 'System user % was not found', p_createdbysystemuserid;
    end if;

    return query
    insert into public.federationexternalcredit (
        competitionid,
        sourcetype,
        externalreference,
        externalname,
        externalclubname,
        externalidnumber,
        originalamount,
        usedamount,
        availableamount,
        creditstatus,
        createdbysystemuserid,
        notes
    )
    values (
        p_competitionid,
        p_sourcetype,
        nullif(trim(p_externalreference), ''),
        nullif(trim(p_externalname), ''),
        nullif(trim(p_externalclubname), ''),
        nullif(trim(p_externalidnumber), ''),
        p_originalamount,
        0,
        p_originalamount,
        'Available',
        p_createdbysystemuserid,
        p_notes
    )
    returning
        federationexternalcredit.federationexternalcreditid,
        federationexternalcredit.competitionid,
        federationexternalcredit.sourcetype,
        federationexternalcredit.externalreference,
        federationexternalcredit.externalname,
        federationexternalcredit.externalclubname,
        federationexternalcredit.externalidnumber,
        federationexternalcredit.originalamount,
        federationexternalcredit.usedamount,
        federationexternalcredit.availableamount,
        federationexternalcredit.creditstatus,
        federationexternalcredit.createdbysystemuserid,
        federationexternalcredit.createdat,
        federationexternalcredit.notes;
end;
$function$
