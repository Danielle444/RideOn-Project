-- ============================================================================
-- usp_getfederationcreditallocations - list allocation history for one credit
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). KNOWN ISSUE documented in that audit, NOT fixed here:
--   - This function takes ONLY p_federationexternalcreditid - there is no
--     competition/ranch parameter at all. The C# controller
--     (CompetitionPaymentsController.GetFederationCreditAllocations) does
--     verify the caller is a HostSecretary of a competition/ranch pair it is
--     GIVEN, but that pair is never cross-checked against the credit id
--     actually being requested, and the BL/DAL discard competitionId/ranchId
--     entirely before calling this proc. Net effect: any HostSecretary of any
--     competition can read any other competition's full allocation detail
--     (payer names, amounts, rider/horse identities) by supplying an
--     arbitrary federationexternalcreditid. Fixing this requires a signature
--     change (DROP + CREATE, adding p_competitionid/p_ranchid) plus the C#
--     wiring to pass and check them - proposed as Stage 2 in the audit, not
--     done here.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getfederationcreditallocations(p_federationexternalcreditid integer)
 RETURNS TABLE(federationcreditallocationid integer, federationexternalcreditid integer, billchargeid integer, entryid integer, allocatedamount numeric, allocatedat timestamp with time zone, allocationnotes text, billid integer, paidbypersonid integer, payerfullname text, riderfederationmemberid integer, riderfullname text, horseid integer, horsename text, classincompid integer, classname text, classdatetime timestamp with time zone, billchargeamount numeric, billchargestatus character varying)
 LANGUAGE plpgsql
AS $function$
begin
    if p_federationexternalcreditid is null then
        raise exception 'Federation external credit id is required';
    end if;

    if not exists (
        select 1
        from public.federationexternalcredit fec
        where fec.federationexternalcreditid = p_federationexternalcreditid
    ) then
        raise exception 'Federation external credit % was not found', p_federationexternalcreditid;
    end if;

    return query
    select
        fca.federationcreditallocationid,
        fca.federationexternalcreditid,
        fca.billchargeid,
        fca.entryid,
        fca.allocatedamount,
        fca.allocatedat,
        fca.notes::text as allocationnotes,

        bc.billid,
        bc.paidbypersonid,
        concat_ws(' ', payer.firstname, payer.lastname)::text as payerfullname,

        sr.riderfederationmemberid,
        concat_ws(' ', rider.firstname, rider.lastname)::text as riderfullname,

        sr.horseid,
        h.horsename::text as horsename,

        e.classincompid,
        ct.classname::text as classname,
        cic.classdatetime,

        bc.amounttopay as billchargeamount,
        bc.chargestatus as billchargestatus
    from public.federationcreditallocation fca
    join public.billcharge bc
        on bc.billchargeid = fca.billchargeid
    left join public.person payer
        on payer.personid = bc.paidbypersonid
    left join public.entry e
        on e.entryid = fca.entryid
    left join public.servicerequest sr
        on sr.srequestid = e.entryid
    left join public.person rider
        on rider.personid = sr.riderfederationmemberid
    left join public.horse h
        on h.horseid = sr.horseid
    left join public.classincompetition cic
        on cic.classincompid = e.classincompid
    left join public.classtype ct
        on ct.classtypeid = cic.classtypeid
    where fca.federationexternalcreditid = p_federationexternalcreditid
    order by fca.allocatedat desc, fca.federationcreditallocationid desc;
end;
$function$
