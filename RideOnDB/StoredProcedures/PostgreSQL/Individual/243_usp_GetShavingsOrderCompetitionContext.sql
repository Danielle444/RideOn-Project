-- ============================================================================
-- usp_GetShavingsOrderCompetitionContext
-- ============================================================================
-- Worker shavings-mutation authorization fix (P0). Read-only context lookup
-- reused by ShavingsOrdersController's claim / save-delivery-photo /
-- mark-delivered endpoints to resolve a shavings order's REAL host ranch
-- server-side, before calling UserAccessValidator -- the mobile client sends
-- no ranchId at all on these three calls, and even if it did, a client value
-- must never be the source of truth (see CreateShavingsOrder's own
-- EnsureCanAccessCompetitionRanchShavings for the established precedent of
-- deriving the ranch server-side before authorizing).
--
-- No existing proc already returned this join for a single order id --
-- usp_AdminCancelShavingsOrder (241) and usp_SecretaryCancelShavingsOrder
-- (242) each resolve it inline for their own single use. This is the
-- read-only extraction of that same productrequest -> competition join,
-- kept intentionally minimal (CompetitionId + HostRanchId only): ownership
-- (WorkerSystemUserId), delivery state, and cancellation state are all
-- re-checked atomically INSIDE the mutating procs themselves (115/168/178)
-- to avoid a check-then-act race between this read and the write.
--
-- Returns zero rows when the order does not exist -- the controller
-- deliberately does not turn that into its own 404/403; the mutating proc's
-- own RN001 "Shavings order not found" guard stays the single source of
-- truth for that message.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.usp_getshavingsordercompetitioncontext(p_shavingsorderid integer)
 RETURNS TABLE("CompetitionId" integer, "HostRanchId" integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.hostranchid
    FROM public.productrequest pr
    INNER JOIN public.competition c ON c.competitionid = pr.competitionid
    WHERE pr.prequestid = p_shavingsorderid;
END;
$function$;
