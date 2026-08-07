-- ============================================================================
-- usp_getpayercompetitionaccount_body - shared JSON account assembly, NO
-- authorization logic of any kind.
-- ============================================================================
-- Added on fix/payer-proc212-self-service-hardening (2026-08-07), extracted
-- verbatim (byte-for-byte, from "with payer_base as (" through the final
-- "return coalesce(v_result, '{}'::jsonb)") out of
-- usp_getpayercompetitionaccount (212_usp_GetPayerCompetitionAccount.sql) as
-- it stood immediately before this change. No CTE, join, filter, or JSON key
-- was altered -- only the p_adminsystemuserid parameter and the
-- personmanagedbysystemuser/personranchrole managed-payer check above it were
-- removed, because this function has no notion of "which admin is asking" at
-- all.
--
-- WHY THIS EXISTS: the payer-proc212-self-service audit found that Proc 212
-- served two callers -- the Admin "view a managed payer" screen and the
-- Payer's own self-service screen -- through one signature, with the Payer
-- path forcing p_adminsystemuserid = p_payerpersonid to satisfy a
-- managed-payer check that was never meant to model self-identity (see the
-- audit trail in 212_usp_GetPayerCompetitionAccount.sql and
-- 251_usp_GetMyPayerCompetitionAccount.sql). Rather than duplicate this
-- ~1000-line body a second time for a new self-service proc (explicitly
-- rejected -- Oren: "do NOT create a second ~1000-line copy of Proc 212"),
-- the body was extracted once here and BOTH usp_getpayercompetitionaccount
-- (Admin, unchanged signature/authorization) and
-- usp_getmypayercompetitionaccount (self-service, new) now delegate to it
-- after running their own, distinct authorization checks.
--
-- SECURITY: this function performs ZERO authorization of any kind -- it
-- trusts p_payerpersonid completely. It must NEVER be reachable except
-- through its two callers, which is why EXECUTE is revoked from
-- PUBLIC/anon/authenticated/service_role in the same migration that creates
-- it (see the accompanying migration SQL). RideOnServer's Npgsql connection
-- authenticates directly as the owning DB role and is unaffected by that
-- revoke -- it never goes through PostgREST/anon/authenticated at all.
-- ============================================================================
--
-- ENTRY-CREATED FINE FOLD (fix/payer-proc250-fine-fold, 2026-08-07): mobile
-- Payer QA showed an Organizer entry-creation late fine (categorykey='fine',
-- sourcetype='Fine', sourceid=entryid -- see the "ENTRY-CREATION FINES" note
-- in 212_usp_GetPayerCompetitionAccount.sql) still rendering as its own
-- standalone "קנסות" card in PayerCompetitionAccountScreen.jsx /
-- AdminCompetitionPayerAccountScreen.jsx, separate from its entry's class
-- card -- even though usp_getcompetitionpayercategorysummary (203, the
-- Secretary Payments sidebar) and 206/247/248/204 were already fixed to fold
-- the same convention into 'classes' back on PR #327/#329. Proc 203's fix is
-- a pure category-aggregate GROUP BY and is NOT reused here by assumption --
-- this proc returns a per-entry classes[] list plus a separate fines[] list,
-- so the fold has to happen at the row level, not just the category label.
--
-- New class_charge_source CTE (feeding class_charge_summary instead of
-- payer_charges directly): UNIONs the base Entry/classes charge rows with
-- Organizer entry-creation fine rows (categorykey rewritten 'fine' ->
-- 'classes', chargeowner left as-is and filtered to 'Organizer' -- same
-- guard as proc 203's folded_charges CTE). sourceid already IS the entryid
-- for this fine convention (never joined through changeentryrequest), so no
-- new join key was needed -- class_charge_summary's existing
-- chargeowner/categorykey/chargestatus arithmetic treats the folded fine
-- amount exactly like the base Organizer charge. fine_items' second UNION ALL
-- branch (the entry-creation-fine branch) is removed entirely, since that
-- money is now folded into class_items instead of listed separately; the
-- first branch (ChangeEntryRequest change/cancellation fines, sourceid =
-- changeentryrequestid) is untouched and still renders in fines[] as its own
-- "קנסות" row -- unchanged by design, per the standing decision that
-- ChangeEntryRequest fines are a structurally different, still-out-of-scope
-- category.
--
-- Federation is untouched: this fine convention is Organizer-only by
-- construction (usp_InsertEntry/usp_AdminCreateEntry), and the fold branch
-- is filtered to chargeowner = 'Organizer' defensively regardless.
-- classGrandTotal/organizerTotal/grandTotal arithmetic is unaffected -- the
-- amount only moves from the finetotal bucket into the classorganizertotal/
-- classgrandtotal bucket, both already summed into organizertotal/grandtotal.
--
-- Live-verified for competition 78 / payer 79 / entry 10675 (ranch 11): entry
-- 10675 classes[] row went organizerCost 250->300, totalAmount 300->350,
-- federationCost unchanged at 50; fines[] no longer contains entry 10675 (was
-- 1 row, now 0); summary.classGrandTotal 300->350, summary.fineTotal 50->0,
-- summary.organizerTotal unchanged at 1060, summary.grandTotal unchanged at
-- 1110, summary.classFederationTotal unchanged at 50. Verified via a
-- rollback-only smoke test (BEGIN -> capture before -> CREATE OR REPLACE ->
-- capture after -> RAISE EXCEPTION carrying both JSON payloads -> forced
-- rollback) before live deploy, then re-confirmed against the live function
-- post-deploy. Proc 203/204/206/212/247/248/251 and Proc 200 are untouched by
-- this change.
-- ============================================================================
--
-- ENTRY-CREATED FINE METADATA (fix/payer-proc250-fine-metadata, 2026-08-07):
-- follow-up UX gap found in real Payer QA -- the fold above correctly hides
-- the fine as a separate line, but left the Payer with no way to see that a
-- class card's organizerCost/totalAmount now INCLUDES a late-entry fine.
-- Fully additive, informational-only extension, no existing sum/column
-- changed:
--
-- class_charge_source now passes bc.sourcetype through both UNION branches
-- (previously dropped once categorykey was rewritten to 'classes'), so
-- class_charge_summary can still tell which rows came in via the fine-fold
-- branch. A new aggregate, entrycreationfineamount, sums only sourcetype=
-- 'Fine' rows (same Open/Paid filter as organizercost). class_items exposes
-- it plus a derived hasentrycreationfine boolean. Both surface on each
-- classes[] item as 'hasEntryCreationFine' / 'entryCreationFineAmount'.
--
-- organizerCost/federationCost/totalAmount and every summary total are
-- computed by the exact same expressions as before -- this is a second,
-- independent aggregate over the same class_charge_source rows, never a
-- rederivation or a replacement. Federation is untouched (the fine
-- convention is Organizer-only by construction, same guard as the fold).
--
-- Live-verified for competition 78 / payer 79 / entry 10675 (ranch 11) via
-- rollback-only smoke test then live re-read: entry 10675 now carries
-- hasEntryCreationFine=true, entryCreationFineAmount=50.00, while
-- organizerCost (300), federationCost (50), totalAmount (350), and every
-- summary field (classGrandTotal 350, organizerTotal 1060, federationTotal
-- 50, grandTotal 1110, remainingAmount 1110, fineTotal 0) are byte-identical
-- before and after. fines[] is unaffected (still empty for this entry).
--
-- Consumed by PayerCompetitionAccountScreen.jsx and
-- AdminCompetitionPayerAccountScreen.jsx (both mobile, share this proc via
-- proc 212/251), which render "כולל קנס הרשמה מאוחרת: ₪X" inside the class
-- card only when hasEntryCreationFine is true -- never re-derived from
-- arithmetic client-side. Proc 203/204/206/212/247/248/251 and Proc 200 are
-- untouched by this change.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpayercompetitionaccount_body(p_competitionid integer, p_ranchid integer, p_payerpersonid integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_result jsonb;
begin
    if p_competitionid is null or p_competitionid <= 0 then
        raise exception 'Invalid competition id';
    end if;

    if p_ranchid is null or p_ranchid <= 0 then
        raise exception 'Invalid ranch id';
    end if;

    if p_payerpersonid is null or p_payerpersonid <= 0 then
        raise exception 'Invalid payer person id';
    end if;

    with payer_base as (
        select
            p.personid,
            p.firstname,
            p.lastname,
            p.cellphone,
            p.email
        from public.person p
        where p.personid = p_payerpersonid
    ),

    charge_allocations as (
        select
            fca.billchargeid,
            coalesce(sum(fca.allocatedamount), 0)::numeric as coveredamount
        from public.federationcreditallocation fca
        group by
            fca.billchargeid
    ),

    payer_charges as (
        select
            bc.*,
            coalesce(ca.coveredamount, 0)::numeric as federationcoveredamount
        from public.billcharge bc
        left join charge_allocations ca
            on ca.billchargeid = bc.billchargeid
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.chargestatus in ('Open', 'Paid')
    ),

    class_charge_history as (
        select
            bc.sourceid as entryid,

            max(case when bc.chargeowner = 'Organizer' then bc.amounttopay end) as historicalorganizeramount,
            max(case when bc.chargeowner = 'Federation' then bc.amounttopay end) as historicalfederationamount,

            max(case when bc.chargeowner = 'Organizer' then bc.chargestatus end) as organizerchargestatus,
            max(case when bc.chargeowner = 'Federation' then bc.chargestatus end) as federationchargestatus

        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.sourcetype = 'Entry'
          and bc.categorykey = 'classes'
          -- Blocker 2: exclude unresolved PendingApproval replacement charges.
          -- 'Open'/'Paid' are the only statuses a finalized entry's own charge
          -- can carry; 'Cancelled'/'Replaced' are the finalized-history
          -- statuses set by usp_answerchangeentryrequestsecured. Excluding
          -- 'PendingApproval' here is what keeps an unapproved replacement
          -- candidate out of the payer's visible history entirely.
          and bc.chargestatus in ('Open', 'Paid', 'Cancelled', 'Replaced')
        group by
            bc.sourceid
    ),

    -- Entry-created fine fold (2026-08-07): unions the base Entry/classes
    -- charge with any Organizer entry-creation late fine sharing the same
    -- entryid (categorykey rewritten 'fine' -> 'classes'), so
    -- class_charge_summary's existing Organizer/Federation arithmetic below
    -- treats the fine identically to the base charge. Federation is
    -- untouched -- this fine convention is Organizer-only by construction,
    -- and the second branch is filtered to chargeowner = 'Organizer'
    -- defensively, matching the same guard already live on proc 203's
    -- folded_charges CTE. sourcetype is passed through (2026-08-07, fine
    -- metadata follow-up) so class_charge_summary can still tell which rows
    -- were folded in, purely for read-side disclosure -- never used to
    -- change any sum.
    class_charge_source as (
        select
            bc.sourceid,
            bc.billid,
            bc.chargeowner,
            bc.categorykey,
            bc.chargestatus,
            bc.amounttopay,
            bc.federationcoveredamount,
            bc.sourcetype
        from payer_charges bc
        where bc.sourcetype = 'Entry'
          and bc.categorykey = 'classes'

        union all

        select
            bc.sourceid,
            bc.billid,
            bc.chargeowner,
            'classes' as categorykey,
            bc.chargestatus,
            bc.amounttopay,
            bc.federationcoveredamount,
            bc.sourcetype
        from payer_charges bc
        where bc.sourcetype = 'Fine'
          and bc.categorykey = 'fine'
          and bc.chargeowner = 'Organizer'
    ),

    class_charge_summary as (
        select
            bc.sourceid as entryid,

            max(bc.billid) as billid,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Organizer'
                     and bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as organizercost,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as federationcost,

            coalesce(sum(
                case
                    when bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as totalamount,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                    then
                        case
                            when bc.chargestatus = 'Paid' then bc.amounttopay
                            else least(
                                bc.amounttopay,
                                coalesce(bc.federationcoveredamount, 0)
                            )
                        end

                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay

                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargeowner = 'Federation'
                     and bc.categorykey = 'classes'
                    then greatest(
                        bc.amounttopay -
                        case
                            when bc.chargestatus = 'Paid' then bc.amounttopay
                            else least(
                                bc.amounttopay,
                                coalesce(bc.federationcoveredamount, 0)
                            )
                        end,
                        0
                    )

                    when bc.chargestatus = 'Open'
                    then bc.amounttopay

                    else 0
                end
            ), 0)::numeric as unpaidamount,

            -- Entry-creation fine metadata (2026-08-07, read-only disclosure):
            -- sums only the rows that entered class_charge_source via the
            -- fine-fold UNION branch above (sourcetype='Fine'), so the payer
            -- UI can show "includes a late-entry fine of X" without ever
            -- re-deriving the amount from arithmetic on the client. Purely
            -- additive -- organizercost/federationcost/totalamount above are
            -- unchanged, this is a separate aggregate over the same rows.
            coalesce(sum(
                case
                    when bc.sourcetype = 'Fine'
                     and bc.categorykey = 'classes'
                     and bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as entrycreationfineamount,

            (
                coalesce(sum(
                    case
                        when bc.categorykey = 'classes'
                         and bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargeowner = 'Federation'
                         and bc.categorykey = 'classes'
                        then greatest(
                            bc.amounttopay -
                            case
                                when bc.chargestatus = 'Paid' then bc.amounttopay
                                else least(
                                    bc.amounttopay,
                                    coalesce(bc.federationcoveredamount, 0)
                                )
                            end,
                            0
                        )

                        when bc.chargestatus = 'Open'
                        then bc.amounttopay

                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from class_charge_source bc
        group by
            bc.sourceid
    ),

    class_items as (
        select
            e.entryid,
            coalesce(ccs.billid, sr.billid) as billid,
            ct.classname::text as classname,
            cic.classdatetime,
            cic.starttime,
            cic.orderinday,
            cic.classincompid,

            coalesce(ccs.organizercost, 0)::numeric as organizercost,
            coalesce(ccs.federationcost, 0)::numeric as federationcost,
            coalesce(ccs.totalamount, 0)::numeric as totalamount,
            coalesce(ccs.paidamount, 0)::numeric as paidamount,
            coalesce(ccs.unpaidamount, 0)::numeric as unpaidamount,
            coalesce(ccs.ispaid, false)::boolean as ispaid,

            coalesce(ccs.entrycreationfineamount, 0)::numeric as entrycreationfineamount,
            (coalesce(ccs.entrycreationfineamount, 0) > 0)::boolean as hasentrycreationfine,

            cch.historicalorganizeramount,
            cch.historicalfederationamount,
            (coalesce(cch.historicalorganizeramount, 0) + coalesce(cch.historicalfederationamount, 0))::numeric as historicaltotalamount,
            cch.organizerchargestatus,
            cch.federationchargestatus,

            h.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            sr.riderfederationmemberid,
            sr.coachfederationmemberid,

            concat_ws(' ', rider_person.firstname, rider_person.lastname)::text as ridername,

            case
                when coach_person.personid is null then null
                else concat_ws(' ', coach_person.firstname, coach_person.lastname)::text
            end as coachname,

            e.entrystatus::text as entrystatus,
            e.prizerecipientname::text as prizerecipientname

        from class_charge_history cch
        inner join public.entry e
            on e.entryid = cch.entryid
        left join class_charge_summary ccs
            on ccs.entryid = cch.entryid
        inner join public.servicerequest sr
            on sr.srequestid = e.entryid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        inner join public.classtype ct
            on ct.classtypeid = cic.classtypeid
        inner join public.horse h
            on h.horseid = sr.horseid
        inner join public.federationmember rider_fm
            on rider_fm.federationmemberid = sr.riderfederationmemberid
        inner join public.person rider_person
            on rider_person.personid = rider_fm.federationmemberid
        left join public.federationmember coach_fm
            on coach_fm.federationmemberid = sr.coachfederationmemberid
        left join public.person coach_person
            on coach_person.personid = coach_fm.federationmemberid
        where cic.competitionid = p_competitionid
          and h.ranchid = p_ranchid
          -- Blocker 2: a Rejected replacement candidate's charge is flipped to
          -- 'Cancelled' by usp_answerchangeentryrequestsecured (same status as
          -- a genuine cancellation), so the chargestatus filter above cannot
          -- distinguish it. entrystatus is the only field that can -- this is
          -- the raw e.entrystatus::text value, never a guessed/defaulted one.
          and e.entrystatus <> 'Rejected'
    ),

    paidtime_charge_summary as (
        select
            bc.sourceid as paidtimerequestid,
            max(bc.billid) as billid,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as amounttopay,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount,

            (
                coalesce(sum(
                    case
                        when bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargestatus = 'Open'
                        then bc.amounttopay
                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from payer_charges bc
        where bc.sourcetype = 'PaidTimeRequest'
          and bc.categorykey = 'paid-time'
        group by
            bc.sourceid
    ),

    paidtime_items as (
        select
            ptr.paidtimerequestid,
            pcs.billid,

            ptr.status::text as status,
            ptr.notes::text as notes,
            pcs.amounttopay,
            pcs.paidamount,
            pcs.unpaidamount,

            p.productname::text as productname,

            h.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            concat_ws(' ', rider_person.firstname, rider_person.lastname)::text as ridername,

            case
                when coach_person.personid is null then null
                else concat_ws(' ', coach_person.firstname, coach_person.lastname)::text
            end as coachname,

            requested_slot.slotdate as requestedslotdate,
            requested_slot.starttime as requestedstarttime,
            requested_slot.endtime as requestedendtime,
            requested_arena.arenaname::text as requestedarenaname,

            assigned_slot.slotdate as assignedslotdate,
            assigned_slot.starttime as assignedstarttime,
            assigned_slot.endtime as assignedendtime,
            assigned_arena.arenaname::text as assignedarenaname,

            coalesce(assigned_slot.slotdate, requested_slot.slotdate) as displayslotdate,
            coalesce(assigned_slot.starttime, requested_slot.starttime) as displaystarttime,
            coalesce(assigned_slot.endtime, requested_slot.endtime) as displayendtime,
            coalesce(assigned_arena.arenaname, requested_arena.arenaname)::text as displayarenaname,

            pcs.ispaid

        from paidtime_charge_summary pcs
        inner join public.paidtimerequest ptr
            on ptr.paidtimerequestid = pcs.paidtimerequestid
        inner join public.servicerequest sr
            on sr.srequestid = ptr.paidtimerequestid
        inner join public.horse h
            on h.horseid = sr.horseid
        inner join public.federationmember rider_fm
            on rider_fm.federationmemberid = sr.riderfederationmemberid
        inner join public.person rider_person
            on rider_person.personid = rider_fm.federationmemberid
        left join public.federationmember coach_fm
            on coach_fm.federationmemberid = sr.coachfederationmemberid
        left join public.person coach_person
            on coach_person.personid = coach_fm.federationmemberid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = ptr.pricecatalogid
        inner join public.product p
            on p.productid = pc.productid
        inner join public.paidtimeslotincompetition requested_slot
            on requested_slot.paidtimeslotincompid = ptr.requestedcompslotid
        inner join public.arena requested_arena
            on requested_arena.ranchid = requested_slot.arenaranchid
           and requested_arena.arenaid = requested_slot.arenaid
        left join public.paidtimeslotincompetition assigned_slot
            on assigned_slot.paidtimeslotincompid = ptr.assignedcompslotid
        left join public.arena assigned_arena
            on assigned_arena.ranchid = assigned_slot.arenaranchid
           and assigned_arena.arenaid = assigned_slot.arenaid
        where requested_slot.competitionid = p_competitionid
          and h.ranchid = p_ranchid
    ),

    product_charge_summary as (
        select
            bc.sourceid as prequestid,
            max(bc.billid) as billid,
            bc.categorykey,

            coalesce(sum(
                case
                    when bc.chargestatus in ('Open', 'Paid')
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as amounttopay,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Paid'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as paidamount,

            coalesce(sum(
                case
                    when bc.chargestatus = 'Open'
                    then bc.amounttopay
                    else 0
                end
            ), 0)::numeric as unpaidamount,

            (
                coalesce(sum(
                    case
                        when bc.chargestatus in ('Open', 'Paid')
                        then bc.amounttopay
                        else 0
                    end
                ), 0) > 0
                and
                coalesce(sum(
                    case
                        when bc.chargestatus = 'Open'
                        then bc.amounttopay
                        else 0
                    end
                ), 0) = 0
            )::boolean as ispaid

        from payer_charges bc
        where bc.sourcetype = 'ProductRequest'
          and bc.categorykey in ('stalls', 'shavings')
        group by
            bc.sourceid,
            bc.categorykey
    ),

    stall_items as (
        select
            sb.stallbookingid,
            pcs.billid,

            sb.horseid,
            h.horsename::text as horsename,
            h.barnname::text as barnname,

            sb.isfortack,
            sb.startdate,
            sb.enddate,
            sb.compoundid,
            sb.stallid,

            pc.pricecatalogid,
            pc.itemprice,
            product.productname::text as productname,

            pr.notes,

            pcs.amounttopay,
            pcs.paidamount,
            pcs.unpaidamount,
            pcs.ispaid,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Approved'
            ) as iscancelled,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Pending'
            ) as haspendingcancellation,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = false
                  and pcr.status = 'Pending'
                  and pcr.newprequestid is not null
            ) as haspendingchange

        from product_charge_summary pcs
        inner join public.productrequest pr
            on pr.prequestid = pcs.prequestid
        inner join public.stallbooking sb
            on sb.stallbookingid = pr.prequestid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product product
            on product.productid = pc.productid
        left join public.horse h
            on h.horseid = sb.horseid
        where pcs.categorykey = 'stalls'
          and pr.competitionid = p_competitionid
          and sb.requestingranchid = p_ranchid
          and not exists (
              select 1
              from public.productchangerequest pcr
              where pcr.newprequestid = pr.prequestid
                and pcr.status = 'Pending'
          )
    ),

    shavings_charge_existence as (
        select
            bc.sourceid as prequestid,
            max(bc.billid) as billid
        from public.billcharge bc
        where bc.competitionid = p_competitionid
          and bc.paidbypersonid = p_payerpersonid
          and bc.sourcetype = 'ProductRequest'
          and bc.categorykey = 'shavings'
          and bc.chargestatus in ('Open', 'Paid', 'PendingApproval', 'Cancelled')
        group by
            bc.sourceid
    ),

    shavings_items as (
        select
            so.shavingsorderid,
            coalesce(pcs.billid, sce.billid) as billid,

            so.bagquantity,
            so.requesteddeliverytime,
            so.deliverystatus::text as deliverystatus,
            so.notes::text as notes,

            pc.pricecatalogid,
            pc.itemprice,
            product.productname::text as productname,

            coalesce(pcs.amounttopay, 0)::numeric as amounttopay,
            coalesce(pcs.paidamount, 0)::numeric as paidamount,
            coalesce(pcs.unpaidamount, 0)::numeric as unpaidamount,
            coalesce(pcs.ispaid, false)::boolean as ispaid,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Approved'
            ) as iscancelled,

            exists (
                select 1
                from public.productchangerequest pcr
                where pcr.originalprequestid = pr.prequestid
                  and pcr.iscancelled = true
                  and pcr.status = 'Pending'
            ) as haspendingcancellation

        from shavings_charge_existence sce
        inner join public.productrequest pr
            on pr.prequestid = sce.prequestid
        inner join public.shavingsorder so
            on so.shavingsorderid = pr.prequestid
        inner join public.pricecatalog pc
            on pc.pricecatalogid = pr.pricecatalogid
        inner join public.product product
            on product.productid = pc.productid
        left join product_charge_summary pcs
            on pcs.prequestid = sce.prequestid
           and pcs.categorykey = 'shavings'
        where pr.competitionid = p_competitionid
          and exists (
              select 1
              from public.shavingsorderforstallbooking sosb
              inner join public.stallbooking sb
                  on sb.stallbookingid = sosb.stallbookingid
              where sosb.shavingsorderid = so.shavingsorderid
                and sb.requestingranchid = p_ranchid
          )
    ),

    fine_items as (
        -- Change/cancellation fines only. sourceid is a changeentryrequestid;
        -- resolve the original entry through it. The entry-creation-fine
        -- branch that used to live here (sourceid = entryid directly,
        -- categorykey='fine') was removed 2026-08-07 -- that money is now
        -- folded into class_items via class_charge_source above instead of
        -- being listed as a separate fine row (see the header note).
        select
            bc.billchargeid,
            bc.billid,
            bc.sourceid,
            cer.originalentryid,
            e.classincompid,
            ct.classname::text as classname,
            bc.amounttopay,
            bc.chargestatus,
            bc.notes
        from payer_charges bc
        inner join public.changeentryrequest cer
            on cer.changeentryrequestid = bc.sourceid
        inner join public.entry e
            on e.entryid = cer.originalentryid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        inner join public.classtype ct
            on ct.classtypeid = cic.classtypeid
        where bc.categorykey = 'classes'
          and bc.sourcetype = 'Fine'
    ),

    summary_values as (
        select
            coalesce((select sum(organizercost) from class_items), 0)::numeric as classorganizertotal,
            coalesce((select sum(federationcost) from class_items), 0)::numeric as classfederationtotal,
            coalesce((select sum(totalamount) from class_items), 0)::numeric as classgrandtotal,

            coalesce((select sum(amounttopay) from paidtime_items), 0)::numeric as paidtimetotal,
            coalesce((select sum(amounttopay) from stall_items), 0)::numeric as stalltotal,
            coalesce((select sum(amounttopay) from shavings_items), 0)::numeric as shavingstotal,
            coalesce((select sum(amounttopay) from fine_items), 0)::numeric as finetotal,

            coalesce((select sum(paidamount) from class_items), 0)::numeric as classpaidamount,
            coalesce((select sum(paidamount) from paidtime_items), 0)::numeric as paidtimepaidamount,
            coalesce((select sum(paidamount) from stall_items), 0)::numeric as stallpaidamount,
            coalesce((select sum(paidamount) from shavings_items), 0)::numeric as shavingspaidamount,
            coalesce((
                select sum(amounttopay)
                from fine_items
                where chargestatus = 'Paid'
            ), 0)::numeric as finepaidamount
    ),

    final_summary as (
        select
            classorganizertotal,
            classfederationtotal,
            classgrandtotal,
            paidtimetotal,
            stalltotal,
            shavingstotal,
            finetotal,

            classorganizertotal + paidtimetotal + stalltotal + shavingstotal + finetotal as organizertotal,
            classfederationtotal as federationtotal,

            classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal as grandtotal,

            classpaidamount
            + paidtimepaidamount
            + stallpaidamount
            + shavingspaidamount
            + finepaidamount as paidamount,

            greatest(
                classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal
                -
                (
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount
                ),
                0
            ) as remainingamount,

            case
                when classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal = 0 then 'Unpaid'
                when
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount = 0
                    then 'Unpaid'
                when
                    classpaidamount
                    + paidtimepaidamount
                    + stallpaidamount
                    + shavingspaidamount
                    + finepaidamount
                    <
                    classgrandtotal + paidtimetotal + stalltotal + shavingstotal + finetotal
                    then 'Partial'
                else 'Paid'
            end as paymentstatus
        from summary_values
    )

    select jsonb_build_object(
        'payer',
        (
            select jsonb_build_object(
                'payerPersonId', pb.personid,
                'firstName', pb.firstname,
                'lastName', pb.lastname,
                'fullName', trim(pb.firstname || ' ' || pb.lastname),
                'cellPhone', pb.cellphone,
                'email', pb.email
            )
            from payer_base pb
        ),

        'summary',
        (
            select jsonb_build_object(
                'classOrganizerTotal', fs.classorganizertotal,
                'classFederationTotal', fs.classfederationtotal,
                'classGrandTotal', fs.classgrandtotal,
                'paidTimeTotal', fs.paidtimetotal,
                'stallTotal', fs.stalltotal,
                'shavingsTotal', fs.shavingstotal,
                'fineTotal', fs.finetotal,
                'organizerTotal', fs.organizertotal,
                'federationTotal', fs.federationtotal,
                'grandTotal', fs.grandtotal,
                'paidAmount', fs.paidamount,
                'remainingAmount', fs.remainingamount,
                'paymentStatus', fs.paymentstatus
            )
            from final_summary fs
        ),

        'classes',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'entryId', ci.entryid,
                        'billId', ci.billid,
                        'className', ci.classname,
                        'classDateTime', ci.classdatetime,
                        'startTime', ci.starttime,
                        'orderInDay', ci.orderinday,
                        'classInCompId', ci.classincompid,
                        'horseId', ci.horseid,
                        'horseName', ci.horsename,
                        'barnName', ci.barnname,
                        'riderName', ci.ridername,
                        'riderFederationMemberId', ci.riderfederationmemberid,
                        'coachName', ci.coachname,
                        'coachFederationMemberId', ci.coachfederationmemberid,
                        'paidByPersonId', p_payerpersonid,
                        'prizeRecipientName', ci.prizerecipientname,
                        'organizerCost', ci.organizercost,
                        'federationCost', ci.federationcost,
                        'totalAmount', ci.totalamount,
                        'paidAmount', ci.paidamount,
                        'unpaidAmount', ci.unpaidamount,
                        'historicalOrganizerAmount', ci.historicalorganizeramount,
                        'historicalFederationAmount', ci.historicalfederationamount,
                        'historicalAmount', ci.historicaltotalamount,
                        'organizerChargeStatus', ci.organizerchargestatus,
                        'federationChargeStatus', ci.federationchargestatus,
                        'entryStatus', ci.entrystatus,
                        'isPaid', ci.ispaid,
                        'hasEntryCreationFine', ci.hasentrycreationfine,
                        'entryCreationFineAmount', ci.entrycreationfineamount
                    )
                    order by
                        ci.classdatetime nulls last,
                        ci.orderinday nulls last,
                        ci.starttime nulls last,
                        ci.classname
                )
                from class_items ci
            ),
            '[]'::jsonb
        ),

        'paidTimes',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'paidTimeRequestId', pti.paidtimerequestid,
                        'billId', pti.billid,
                        'status', pti.status,
                        'notes', pti.notes,
                        'productName', pti.productname,
                        'amountToPay', pti.amounttopay,
                        'horseId', pti.horseid,
                        'horseName', pti.horsename,
                        'barnName', pti.barnname,
                        'riderName', pti.ridername,
                        'coachName', pti.coachname,
                        'displaySlotDate', pti.displayslotdate,
                        'displayStartTime', pti.displaystarttime,
                        'displayEndTime', pti.displayendtime,
                        'displayArenaName', pti.displayarenaname,
                        'requestedSlotDate', pti.requestedslotdate,
                        'requestedStartTime', pti.requestedstarttime,
                        'requestedEndTime', pti.requestedendtime,
                        'requestedArenaName', pti.requestedarenaname,
                        'assignedSlotDate', pti.assignedslotdate,
                        'assignedStartTime', pti.assignedstarttime,
                        'assignedEndTime', pti.assignedendtime,
                        'assignedArenaName', pti.assignedarenaname,
                        'isPaid', pti.ispaid
                    )
                    order by
                        pti.displayslotdate nulls last,
                        pti.displaystarttime nulls last,
                        pti.paidtimerequestid
                )
                from paidtime_items pti
            ),
            '[]'::jsonb
        ),

        'stalls',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'stallBookingId', si.stallbookingid,
                        'billId', si.billid,
                        'horseId', si.horseid,
                        'horseName', si.horsename,
                        'barnName', si.barnname,
                        'isForTack', si.isfortack,
                        'startDate', si.startdate,
                        'endDate', si.enddate,
                        'compoundId', si.compoundid,
                        'stallId', si.stallid,
                        'priceCatalogId', si.pricecatalogid,
                        'itemPrice', si.itemprice,
                        'productName', si.productname,
                        'notes', si.notes,
                        'amountToPay', si.amounttopay,
                        'paidAmount', si.paidamount,
                        'unpaidAmount', si.unpaidamount,
                        'isPaid', si.ispaid,
                        'isCancelled', si.iscancelled,
                        'hasPendingCancellation', si.haspendingcancellation,
                        'hasPendingChange', si.haspendingchange,
                        'shavingsOrders',
                        coalesce(
                            (
                                select jsonb_agg(
                                    jsonb_build_object(
                                        'shavingsOrderId', shi.shavingsorderid,
                                        'billId', shi.billid,
                                        'bagQuantity', shi.bagquantity,
                                        'requestedDeliveryTime', shi.requesteddeliverytime,
                                        'deliveryStatus', shi.deliverystatus,
                                        'notes', shi.notes,
                                        'priceCatalogId', shi.pricecatalogid,
                                        'itemPrice', shi.itemprice,
                                        'productName', shi.productname,
                                        'amountToPay', shi.amounttopay,
                                        'paidAmount', shi.paidamount,
                                        'unpaidAmount', shi.unpaidamount,
                                        'isPaid', shi.ispaid,
                                        'isCancelled', shi.iscancelled,
                                        'hasPendingCancellation', shi.haspendingcancellation
                                    )
                                    order by
                                        shi.requesteddeliverytime nulls last,
                                        shi.shavingsorderid
                                )
                                from shavings_items shi
                                inner join public.shavingsorderforstallbooking sofsb
                                    on sofsb.shavingsorderid = shi.shavingsorderid
                                where sofsb.stallbookingid = si.stallbookingid
                            ),
                            '[]'::jsonb
                        )
                    )
                    order by
                        si.startdate,
                        si.horsename nulls last,
                        si.stallbookingid
                )
                from stall_items si
            ),
            '[]'::jsonb
        ),

        'shavings',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'shavingsOrderId', shi.shavingsorderid,
                        'billId', shi.billid,
                        'bagQuantity', shi.bagquantity,
                        'requestedDeliveryTime', shi.requesteddeliverytime,
                        'deliveryStatus', shi.deliverystatus,
                        'notes', shi.notes,
                        'priceCatalogId', shi.pricecatalogid,
                        'itemPrice', shi.itemprice,
                        'productName', shi.productname,
                        'amountToPay', shi.amounttopay,
                        'paidAmount', shi.paidamount,
                        'unpaidAmount', shi.unpaidamount,
                        'isPaid', shi.ispaid,
                        'isCancelled', shi.iscancelled,
                        'hasPendingCancellation', shi.haspendingcancellation,
                        'stallBookingIds',
                        coalesce(
                            (
                                select jsonb_agg(distinct sofsb.stallbookingid order by sofsb.stallbookingid)
                                from public.shavingsorderforstallbooking sofsb
                                inner join public.stallbooking sb
                                    on sb.stallbookingid = sofsb.stallbookingid
                                where sofsb.shavingsorderid = shi.shavingsorderid
                                  and sb.requestingranchid = p_ranchid
                            ),
                            '[]'::jsonb
                        )
                    )
                    order by
                        shi.requesteddeliverytime nulls last,
                        shi.shavingsorderid
                )
                from shavings_items shi
            ),
            '[]'::jsonb
        ),

        'fines',
        coalesce(
            (
                select jsonb_agg(
                    jsonb_build_object(
                        'billChargeId', fi.billchargeid,
                        'billId', fi.billid,
                        'sourceId', fi.sourceid,
                        'originalEntryId', fi.originalentryid,
                        'classInCompId', fi.classincompid,
                        'className', fi.classname,
                        'amountToPay', fi.amounttopay,
                        'paidAmount', case when fi.chargestatus = 'Paid' then fi.amounttopay else 0 end,
                        'unpaidAmount', case when fi.chargestatus = 'Open' then fi.amounttopay else 0 end,
                        'chargeStatus', fi.chargestatus,
                        'notes', fi.notes
                    )
                    order by fi.billchargeid
                )
                from fine_items fi
            ),
            '[]'::jsonb
        )
    )
    into v_result;

    return coalesce(v_result, '{}'::jsonb);
end;
$function$
