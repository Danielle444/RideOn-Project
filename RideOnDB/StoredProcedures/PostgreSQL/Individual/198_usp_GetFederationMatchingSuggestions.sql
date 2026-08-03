-- ============================================================================
-- usp_getfederationmatchingsuggestions - score candidate credit<->payer matches
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. Reproduced
-- verbatim via pg_get_functiondef; no behavioral change of any kind was made.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). Recalculated on every call - no suggestion table exists anywhere,
-- so there is nothing to go stale. KNOWN ISSUES documented in the audit, NOT
-- fixed here:
--   - No date/reference/identity matching at all (externalidnumber and
--     externalreference are returned but never scored); name matching is
--     exact-or-substring after stripping to Hebrew/a-z/digits, no fuzzy/edit-
--     distance logic.
--   - Full CROSS JOIN of every available credit x every payer with missing
--     amount, scored afterward - not narrowed before scoring.
--   - The final `where matchscore >= 45` filter makes the 'נמוכה' (low)
--     confidencelevel branch dead code, since every score that reaches the
--     CASE is already >= 45.
--   - Candidate credits are selected purely on availableamount > 0,
--     regardless of creditstatus (including NeedsReview).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getfederationmatchingsuggestions(p_competitionid integer)
 RETURNS TABLE(federationexternalcreditid integer, competitionid integer, sourcetype text, externalreference text, externalname text, externalclubname text, externalidnumber text, originalamount numeric, usedamount numeric, availableamount numeric, creditstatus text, paidbypersonid integer, payerfullname text, totalfederationamount numeric, coveredfederationamount numeric, missingfederationamount numeric, suggestedallocatedamount numeric, matchscore integer, confidencelevel text, matchreason text)
 LANGUAGE plpgsql
AS $function$
begin
    if p_competitionid is null then
        raise exception 'Competition id is required';
    end if;

    return query
    with charge_allocations as (
        select
            fca.billchargeid,
            coalesce(sum(fca.allocatedamount), 0) as coveredamount
        from public.federationcreditallocation fca
        group by fca.billchargeid
    ),
    payer_federation_summary as (
        select
            bc.competitionid,
            bc.paidbypersonid,
            concat_ws(' ', p.firstname, p.lastname)::text as payerfullname,

            coalesce(sum(bc.amounttopay), 0) as totalfederationamount,
            coalesce(sum(coalesce(ca.coveredamount, 0)), 0) as coveredfederationamount,
            coalesce(
                sum(bc.amounttopay - coalesce(ca.coveredamount, 0)),
                0
            ) as missingfederationamount
        from public.billcharge bc
        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid
        left join public.person p
            on p.personid = bc.paidbypersonid
        where bc.competitionid = p_competitionid
          and bc.chargeowner = 'Federation'
          and bc.categorykey = 'classes'
          and bc.sourcetype = 'Entry'
          and bc.chargestatus not in (
              'Cancelled',
              'Replaced',
              'Rejected',
              'PendingApproval'
          )
        group by
            bc.competitionid,
            bc.paidbypersonid,
            p.firstname,
            p.lastname
        having coalesce(
            sum(bc.amounttopay - coalesce(ca.coveredamount, 0)),
            0
        ) > 0
    ),
    available_credits as (
        select
            fec.federationexternalcreditid,
            fec.competitionid,
            fec.sourcetype::text as sourcetype,
            fec.externalreference::text as externalreference,
            fec.externalname::text as externalname,
            fec.externalclubname::text as externalclubname,
            fec.externalidnumber::text as externalidnumber,
            fec.originalamount,
            fec.usedamount,
            fec.availableamount,
            fec.creditstatus::text as creditstatus,

            regexp_replace(
                lower(coalesce(fec.externalname, '')),
                '[^א-תa-z0-9]',
                '',
                'g'
            ) as normalizedexternalname
        from public.federationexternalcredit fec
        where fec.competitionid = p_competitionid
          and coalesce(fec.availableamount, 0) > 0
    ),
    suggestions_base as (
        select
            ac.federationexternalcreditid,
            ac.competitionid,
            ac.sourcetype,
            ac.externalreference,
            ac.externalname,
            ac.externalclubname,
            ac.externalidnumber,
            ac.originalamount,
            ac.usedamount,
            ac.availableamount,
            ac.creditstatus,
            ac.normalizedexternalname,

            ps.paidbypersonid,
            ps.payerfullname,
            ps.totalfederationamount,
            ps.coveredfederationamount,
            ps.missingfederationamount,

            least(
                ac.availableamount,
                ps.missingfederationamount
            ) as suggestedallocatedamount,

            regexp_replace(
                lower(coalesce(ps.payerfullname, '')),
                '[^א-תa-z0-9]',
                '',
                'g'
            ) as normalizedpayername
        from available_credits ac
        cross join payer_federation_summary ps
    ),
    scored as (
        select
            sb.*,

            (
                case
                    when sb.normalizedexternalname <> ''
                     and sb.normalizedexternalname = sb.normalizedpayername
                        then 50

                    when sb.normalizedexternalname <> ''
                     and (
                         sb.normalizedexternalname like '%' || sb.normalizedpayername || '%'
                         or sb.normalizedpayername like '%' || sb.normalizedexternalname || '%'
                     )
                        then 35

                    else 0
                end
                +
                case
                    when sb.availableamount = sb.missingfederationamount
                        then 30

                    when sb.availableamount < sb.missingfederationamount
                        then 15

                    when sb.availableamount > sb.missingfederationamount
                        then 10

                    else 0
                end
            )::integer as matchscore
        from suggestions_base sb
    )
    select
        s.federationexternalcreditid,
        s.competitionid,
        s.sourcetype,
        s.externalreference,
        s.externalname,
        s.externalclubname,
        s.externalidnumber,
        s.originalamount,
        s.usedamount,
        s.availableamount,
        s.creditstatus,

        s.paidbypersonid,
        s.payerfullname,
        s.totalfederationamount,
        s.coveredfederationamount,
        s.missingfederationamount,

        s.suggestedallocatedamount,
        s.matchscore,

        case
            when s.matchscore >= 60 then 'גבוהה'
            when s.matchscore >= 45 then 'בינונית'
            else 'נמוכה'
        end as confidencelevel,

        concat_ws(
            ' | ',
            case
                when s.normalizedexternalname <> ''
                 and s.normalizedexternalname = s.normalizedpayername
                    then 'שם תואם בדיוק'

                when s.normalizedexternalname <> ''
                 and (
                     s.normalizedexternalname like '%' || s.normalizedpayername || '%'
                     or s.normalizedpayername like '%' || s.normalizedexternalname || '%'
                 )
                    then 'שם דומה'

                else 'שם לא תואם'
            end,
            case
                when s.availableamount = s.missingfederationamount
                    then 'סכום תואם בדיוק לחוסר'

                when s.availableamount < s.missingfederationamount
                    then 'הקבלה מכסה חלק מהחוסר'

                when s.availableamount > s.missingfederationamount
                    then 'הקבלה גדולה מהחוסר'

                else null
            end
        )::text as matchreason
    from scored s
    where s.matchscore >= 45
    order by
        s.matchscore desc,
        s.externalname,
        s.payerfullname;
end;
$function$
