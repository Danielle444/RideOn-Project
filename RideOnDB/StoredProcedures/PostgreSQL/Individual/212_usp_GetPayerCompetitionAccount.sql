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
--
-- SELF-SERVICE SPLIT (fix/payer-proc212-self-service-hardening, 2026-08-07):
-- this proc's own signature, parameter validation, and the
-- personmanagedbysystemuser/personranchrole managed-payer authorization
-- check below are PRESERVED EXACTLY, byte-for-byte, unchanged from before
-- this commit -- this remains the Admin "view a managed payer" path only,
-- with its existing authorization behavior. The only change is that, once
-- authorized, this function now DELEGATES the actual JSON assembly to
-- usp_getpayercompetitionaccount_body (250_usp_GetPayerCompetitionAccountBody.sql)
-- instead of inlining it, so the ~1000-line body exists in exactly one
-- place and is shared with the new self-service proc,
-- usp_getmypayercompetitionaccount (251_usp_GetMyPayerCompetitionAccount.sql)
-- -- see that file for why a separate proc exists instead of adding a
-- parameter here (a same-name overload with a defaulted trailing parameter
-- was proven, via a rollback-only live test, to make every existing 4-arg
-- call ambiguous -- error 42725 -- so it was rejected).
--
-- RPC EXPOSURE HARDENING (same commit): the same audit found this function
-- had EXECUTE granted to PUBLIC/anon/authenticated/service_role -- reachable
-- directly via Supabase PostgREST RPC using the public anon key embedded in
-- both client apps, entirely bypassing this proc's own managed-payer check's
-- only real protection (ASP.NET never being in the loop at all does not
-- weaken the check below, but the check alone was never meant to be the sole
-- line of defense against a direct, unauthenticated caller). EXECUTE is now
-- revoked from PUBLIC/anon/authenticated/service_role in the same migration
-- that applies this change (see the migration SQL). RideOnServer's Npgsql
-- connection authenticates directly as the owning DB role and never goes
-- through PostgREST/anon/authenticated, so this revoke does not affect it.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getpayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer, p_adminsystemuserid integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    v_is_managed boolean;
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

    return public.usp_getpayercompetitionaccount_body(p_competitionid, p_ranchid, p_payerpersonid);
end;
$function$
