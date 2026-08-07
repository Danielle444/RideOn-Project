-- Adds public.stallbooking.requestingranchid: the guest/requesting ranch for
-- a stall booking, distinct from stallbooking.ranchid, which after this
-- change means the competition's host/service ranch -- see
-- 188_usp_CreateStallBooking.sql, 225_usp_CreateTackStallBookings.sql,
-- 169_usp_CreateShavingsOrder.sql and 149_usp_SecretaryCreateStallBookingForPayer.sql
-- for the corrected write-path semantics. Approved data model, ranch-
-- conflation architecture fix, 2026-08-05.
--
-- Previously stallbooking.ranchid was required to simultaneously equal the
-- horse's home ranch, the PriceCatalog-owning ranch, and (via the API
-- authorization layer) the actor's own ranch -- three independent business
-- concepts that only ever coincided because every stall/tack booking ever
-- created in production so far was for the host ranch's own horses. This
-- column lets stallbooking.ranchid mean host ranch consistently while still
-- persisting which guest ranch requested the booking, which several
-- existing reporting procedures (usp_getcompetitionsummarystalldetails,
-- usp_getcompetitionsummaryshavingsdetails and their *entries siblings)
-- already assume exists as a distinct grouping dimension.
--
-- For non-tack rows: requestingranchid = the booked horse's home ranch
-- (horse.ranchid). For tack rows (horseid IS NULL): requestingranchid is
-- caller-supplied at creation time going forward, since there is no horse
-- to derive it from -- backfilled here from the row's own (pre-fix)
-- ranchid value, which for every existing row equals the only ranch (11)
-- that has ever created a booking of either kind.
--
-- Live state confirmed immediately before this migration was authored
-- (read-only, 2026-08-05): 30 total stallbooking rows (19 non-tack, 11
-- tack), every non-tack row has a horseid that resolves to a horse with a
-- non-null ranchid, zero orphaned rows, every row currently has
-- ranchid = 11 (the only ranch that has ever used this feature). Expected
-- backfill: 19 rows via the horse join, 11 rows via the tack fallback, 0
-- rows left unresolved.
--
-- No index is added on requestingranchid: the only existing index on this
-- table is the primary key (stallbookingid) -- there is no secondary index
-- on ranchid, horseid, or any other column to match, so adding one here
-- would be a speculative deviation from this table's established
-- indexing convention, not a like-for-like addition.
--
-- Does not touch stallbooking.ranchid or its existing constraints, and does
-- not rewrite bill/billcharge/productrequest/stallassignment/shavings data.
-- Atomic (single transaction; ALTER TABLE/UPDATE are transactional DDL in
-- PostgreSQL). Fails loudly and rolls back entirely if any validation step
-- below does not hold. Idempotent: safe to re-run after a successful run
-- (the column-add is IF NOT EXISTS, both UPDATEs only touch rows still
-- NULL, SET NOT NULL on an already-NOT-NULL column is a no-op in Postgres,
-- and the FK constraint is only added if not already present).

BEGIN;

CREATE TEMP TABLE tmp_premigration_stallbooking_count (row_count integer) ON COMMIT DROP;
INSERT INTO tmp_premigration_stallbooking_count SELECT count(*) FROM public.stallbooking;

ALTER TABLE public.stallbooking
    ADD COLUMN IF NOT EXISTS requestingranchid integer;

-- Non-tack rows: derive from the booked horse's own home ranch.
UPDATE public.stallbooking sb
SET requestingranchid = h.ranchid
FROM public.horse h
WHERE sb.horseid = h.horseid
  AND sb.isfortack = false
  AND sb.requestingranchid IS NULL;

-- Tack rows: no horse to derive from -- backfill from the row's own
-- pre-fix ranchid value (see header: every existing tack row was created
-- by the host ranch's own admin/secretary for the host ranch itself).
UPDATE public.stallbooking sb
SET requestingranchid = sb.ranchid
WHERE sb.isfortack = true
  AND sb.requestingranchid IS NULL;

DO $$
DECLARE
    v_before_count     integer;
    v_after_count      integer;
    v_unresolved       integer;
    v_bad_fk           integer;
    v_nontack_no_horse integer;
BEGIN
    SELECT row_count INTO v_before_count FROM tmp_premigration_stallbooking_count;
    SELECT count(*) INTO v_after_count FROM public.stallbooking;

    IF v_after_count <> v_before_count THEN
        RAISE EXCEPTION 'Row count changed during migration (before=%, after=%)', v_before_count, v_after_count;
    END IF;

    SELECT count(*) INTO v_unresolved
    FROM public.stallbooking
    WHERE requestingranchid IS NULL;
    IF v_unresolved <> 0 THEN
        RAISE EXCEPTION 'Backfill validation failed: % stallbooking rows have no resolvable requestingranchid', v_unresolved;
    END IF;

    SELECT count(*) INTO v_nontack_no_horse
    FROM public.stallbooking
    WHERE isfortack = false AND horseid IS NULL;
    IF v_nontack_no_horse <> 0 THEN
        RAISE EXCEPTION 'Backfill validation failed: % non-tack stallbooking rows have no HorseId', v_nontack_no_horse;
    END IF;

    SELECT count(*) INTO v_bad_fk
    FROM public.stallbooking sb
    WHERE NOT EXISTS (SELECT 1 FROM public.ranch r WHERE r.ranchid = sb.requestingranchid);
    IF v_bad_fk <> 0 THEN
        RAISE EXCEPTION 'Backfill validation failed: % stallbooking rows have a requestingranchid with no matching ranch', v_bad_fk;
    END IF;

    RAISE NOTICE 'Backfill validation passed for % rows (before=%, after=%).', v_after_count, v_before_count, v_after_count;
END $$;

ALTER TABLE public.stallbooking
    ALTER COLUMN requestingranchid SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stallbooking_requestingranchid_fkey'
    ) THEN
        ALTER TABLE public.stallbooking
            ADD CONSTRAINT stallbooking_requestingranchid_fkey
            FOREIGN KEY (requestingranchid) REFERENCES public.ranch(ranchid);
    END IF;
END $$;

COMMIT;
