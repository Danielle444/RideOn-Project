-- ============================================================================
-- usp_getpayercompetitionaccount - full JSON account view for one managed payer
-- ============================================================================
-- RECOVERED FROM LIVE SUPABASE (project sxplumrexbolpwqacpiz), 2026-08-03.
-- First tracked definition of this function in the repository. This proc had
-- only been recovered at signature level during the initial Stage 1 sweep; a
-- fresh pg_get_functiondef read was performed before writing this file.
-- Reproduced verbatim; no behavioral change of any kind.
--
-- Part of the 2026-08-03 federation-payment Stage 1 recovery (SP files
-- 191-217). This proc DOES perform a real authorization check internally -
-- it verifies p_adminsystemuserid actually manages p_payerpersonid (via
-- personmanagedbysystemuser + personranchrole, role 'משלם') within
-- p_ranchid, and raises if not. The audit's finding was at the C# controller
-- layer only: GET /api/Payers/competition-account checks the caller's role
-- but never cross-checks that the competition it was given belongs to the
-- ranch it was given (unlike the self-service my-competition-account variant,
-- which forces payerPersonId=caller and so has limited blast radius). No
-- issue in this SQL body itself was flagged.
--
-- RANCH-MODEL CORRECTION (2026-08-05, owner-approved architecture fix):
-- p_ranchid here means the guest/requesting ranch -- confirmed by
-- class_items/paidtime_items already filtering on h.ranchid = p_ranchid
-- (the horse's own home ranch) and by the internal authorization check
-- being against personranchrole.ranchid (the admin's own managed ranch),
-- never against competition.hostranchid. The stall_items and
-- shavings_items CTEs filtered by sb.ranchid = p_ranchid, which before this
-- fix held the same (buggy) value as home ranch -- now that
-- stallbooking.ranchid means host ranch, both were changed to
-- sb.requestingranchid = p_ranchid (see
-- migrations/add_stallbooking_requestingranchid.sql) for consistency with
-- the class/paid-time filtering already in this same query. No other
-- behavior changed.
--
-- STANDALONE SHAVINGS CANCELLATION (2026-08-06): shavings_items gains its
-- own iscancelled/haspendingcancellation, computed from the shavings
-- order's OWN productchangerequest (originalprequestid = the shavings
-- order's prequestid) -- exact same technique already used for stall_items'
-- si.iscancelled/si.haspendingcancellation just above it. Before this,
-- a shavings order's cancellation state was only ever inherited from its
-- linked stall's lifecycle (mobile payerAccountLifecycle.js
-- resolveShavingsLifecycleState) because no independent cancellation path
-- existed for shavings; now that usp_admincancelshavingsorder (241) /
-- usp_cancelshavingsorderbypayer (240) / usp_secretarycancelshavingsorder
-- (242) can cancel a shavings order on its own, the order needs to expose
-- its own state too. Surfaced on BOTH JSON shapes that carry a shavings
-- item -- the nested one inside each stalls[] entry's shavingsOrders[], and
-- the top-level shavings[] array -- so a standalone-cancelled order renders
-- correctly regardless of which tab reads it. No existing key removed or
-- renamed; return type is still a single jsonb scalar, so no signature
-- change. hasPendingChange is deliberately NOT added here: unlike stalls,
-- nothing in this system ever creates a non-cancel ("change") request
-- against a shavings order, so there is no live case for it to cover yet.
--
-- CAP-8 PROC-212 ENRICHMENT (2026-08-06, Phase 3B, validated via a
-- rollback-only smoke test against a fully isolated fixture -- proven by
-- BEGIN ... ROLLBACK with zero residual rows, pre/post proc-definition hash
-- equality, and pre/post sequence equality on every touched identity/serial
-- column -- proc212_phase3b_smoketest.sql, SHA-256
-- 1453b15af0be282b55ae211d276f711507ee03c133d63f4b881695294940c4ae):
-- classes[] gains classInCompId, riderFederationMemberId,
-- coachFederationMemberId, paidByPersonId, prizeRecipientName, paidAmount,
-- unpaidAmount, historicalOrganizerAmount, historicalFederationAmount,
-- historicalAmount, organizerChargeStatus, federationChargeStatus, and
-- entryStatus -- no existing classes[] key removed or renamed. A new
-- class_charge_history CTE surfaces finalized-history Entry/classes charges
-- (chargestatus Open/Paid/Cancelled/Replaced, excluding PendingApproval) so
-- approved-cancelled and approved-replaced entries now appear as historical
-- rows (totalAmount=0, since current totals still come from class_items'
-- existing Open/Paid-only class_charge_summary join) carrying their
-- historical amounts and per-owner charge statuses; class_items additionally
-- excludes entrystatus='Rejected' so a rejected replacement candidate (whose
-- own charge is flipped to 'Cancelled' by usp_answerchangeentryrequestsecured,
-- making the chargestatus filter alone unable to distinguish it from a real
-- cancellation) never surfaces. fine_items is corrected to filter
-- categorykey='classes' (previously 'fine', which never matched any live
-- billcharge row -- see ck_billcharge_categorykey) and joins through
-- changeentryrequest to the original entry, so fines[] gains
-- originalEntryId, classInCompId, className, paidAmount, and unpaidAmount
-- (sourceId is retained). shavings[] top-level objects gain stallBookingIds
-- (a sorted, distinct jsonb array of every stall the order is linked to)
-- without duplicating bagQuantity/amountToPay/paidAmount/unpaidAmount across
-- multi-stall links. No other behavior changed: payer, authorization,
-- paid-time, stall, and financial-summary logic are unchanged, apart from
-- fines now correctly contributing to fineTotal/grandTotal since the
-- categorykey fix makes fine_items non-empty for the first time.
--
-- SHAVINGS TERMINAL-CANCELLATION VISIBILITY FIX (2026-08-06): shavings_items
-- was driven by an INNER JOIN against product_charge_summary, which is built
-- from payer_charges (chargestatus IN ('Open','Paid') only). Once a
-- standalone shavings cancellation is Approved (usp_admincancelshavingsorder
-- / usp_secretarycancelshavingsorder / payer-request then
-- usp_answerproductchangerequestsecured), the order's billcharge flips to
-- 'Cancelled' and the order vanished from shavings_items entirely -- before
-- its own isCancelled flag could ever be emitted. Fixed the same way
-- class_items already solves this for classes: a new shavings_charge_existence
-- CTE reads billcharge directly (not via payer_charges) with a wider status
-- set (Open/Paid/PendingApproval/Cancelled -- the full
-- ck_billcharge_chargestatus domain minus 'Replaced', which is
-- architecturally impossible for a shavings charge), and shavings_items is
-- now driven by that existence CTE, LEFT JOINing the unchanged
-- product_charge_summary for the money. A cancelled order's
-- amountToPay/paidAmount/unpaidAmount/isPaid default to 0/false via COALESCE
-- instead of the row disappearing, so it is excluded from every financial
-- total (shavingsTotal, shavingsPaidAmount, grandTotal, etc. -- all of which
-- sum from shavings_items) exactly as if it did not exist financially, while
-- still being visible with isCancelled=true. payer_charges,
-- product_charge_summary, stall_items, class_items, paidtime_items and
-- fine_items are byte-for-byte unchanged -- this touches only the shavings
-- read path. No JSON key added, removed or renamed on shavings[] or
-- stalls[].shavingsOrders[].
-- ============================================================================
--
-- ENTRY-CREATION FINES (added on fix/entry-creation-fine-billing, 2026-08-07):
-- 185_usp_InsertEntry.sql / 231_usp_AdminCreateEntry.sql now bill a second,
-- disjoint kind of Fine billcharge: (sourcetype='Fine', categorykey='fine',
-- sourceid=entryid), separate by design from the change-request convention
-- this proc's fine_items CTE already recognized
-- (sourcetype='Fine', categorykey='classes', sourceid=changeentryrequestid).
-- The two conventions are DELIBERATELY not merged into one lookup: entryid
-- and changeentryrequestid are independent, uncoordinated sequences already
-- proven to collide live (entryid 1,2,3,4,5,93,118,120 each also exist as a
-- real changeentryrequestid) -- joining an entry-creation fine through
-- changeentryrequest the way the existing branch does would risk matching
-- the wrong, unrelated request and misattributing the fine's entry/class/
-- amount. fine_items is now a UNION ALL of the two, kept disjoint by
-- categorykey ('classes' vs 'fine') on the SAME underlying billcharge rows
-- -- a real column, not a heuristic on sourceid's numeric range -- each
-- producing the identical column shape so every consumer below (finetotal,
-- finepaidamount, grandtotal, organizertotal, paidamount, remainingamount,
-- paymentstatus, and the fines[] JSON block) needed NO changes at all.
-- Traced every consumer of the resulting fines[] JSON (server: PayerDAL.cs
-- passes the jsonb result through as a raw string, no typed C# DTO exists
-- for it anywhere; mobile: PayerCompetitionAccountScreen.jsx and
-- AdminCompetitionPayerAccountScreen.jsx render only billChargeId (key),
-- className (falls back to "קנס" if null), amountToPay, chargeStatus, and
-- notes) -- the existing shape already carries everything needed, so no
-- field was added and no DTO/DAL/mobile/test file needed changing.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer, p_adminsystemuserid integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_is_managed boolean;
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

    if p_adminsystemuserid is null or p_adminsystemuserid <= 0 then
        raise exception 'Invalid admin system user id';
    end if;

    select exists (
        select 1
        from public.personmanagedbysystemuser m
        inner join public.personranchrole prr
            on prr.personid = m.personid
        inner join public.role r
            on r.roleid = prr.roleid
        where m.systemuserid = p_adminsystemuserid
          and m.personid = p_payerpersonid
          and m.approvalstatus = 'Approved'
          and prr.ranchid = p_ranchid
          and r.rolename = 'משלם'
    )
    into v_is_managed;

    if v_is_managed = false then
        raise exception 'Payer is not managed by this admin in this ranch';
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

        from payer_charges bc
        where bc.sourcetype = 'Entry'
          and bc.categorykey = 'classes'
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
        -- A. Change/cancellation fines -- unchanged. sourceid is a
        -- changeentryrequestid; resolve the original entry through it.
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

        union all

        -- B. Entry-creation fines -- new. sourceid IS the entryid directly;
        -- never joined through changeentryrequest (that id space is
        -- unrelated and already proven to collide numerically with entryid).
        select
            bc.billchargeid,
            bc.billid,
            bc.sourceid,
            bc.sourceid as originalentryid,
            e.classincompid,
            ct.classname::text as classname,
            bc.amounttopay,
            bc.chargestatus,
            bc.notes
        from payer_charges bc
        inner join public.entry e
            on e.entryid = bc.sourceid
        inner join public.classincompetition cic
            on cic.classincompid = e.classincompid
        inner join public.classtype ct
            on ct.classtypeid = cic.classtypeid
        where bc.categorykey = 'fine'
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
                        'isPaid', ci.ispaid
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
