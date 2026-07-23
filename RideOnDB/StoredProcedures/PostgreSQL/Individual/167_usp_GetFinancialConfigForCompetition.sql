-- Smart Element Phase 8 - financial layer. Returns exactly one row of per-competition
-- config the read-time income projection needs: the host ranch, competition length in days,
-- the field's horse cap, active stall/shavings prices, real stall supply, and the
-- shavings-bags / tack-uplift ratios from smartconfig. NOTHING here is a derived result --
-- every band (entry / stall / shavings income, bag-order quantity, tack) is computed on the
-- client in financialProjection.utils.js from these inputs plus the entry-prediction band.
--
-- Two pricing worlds, kept separate (do not conflate):
--   * Entry income sources costs from classincompetition (organizercost + federationcost),
--     read via usp_GetClassesByCompetitionId -- NOT here.
--   * Stall / shavings income sources prices from pricecatalog, per product, per ranch -- here.
--
-- ABSENCE vs ZERO: a missing active price row comes back NULL (aggregate over an empty set),
-- and the frontend renders a "set your prices" prompt for it -- NEVER a zero. A row that is
-- present but priced 0 comes back 0, a real value. Ranch 49 (Green Fields) is the live
-- precedent: zero pricecatalog rows and zero stalls, so its stall/shavings prices and
-- supplies all come back NULL/0 and the projection degrades to its entry band alone.
--
-- isactive = true is LOAD-BEARING on every pricing read: several products carry duplicate
-- active/inactive rows (e.g. stall regular at DK has both), and an unfiltered read
-- double-counts or picks the wrong price.
--
-- stall.stalltype maps 1:1 to the stall productid: 3 = regular, 4 = upgraded. The same
-- convention links the price rows (productid) to the supply counts (stalltype) below.
--
-- Follows the p_* param / lowercase unquoted return-column convention established by the
-- Smart Element proc family (160-165), and the correlated-subquery-by-configkey pattern for
-- smartconfig (never read by row position; tolerant of unrecognized keys).
--
-- Tack ratio keys (tackstallhorsesperunitmin/max) default to 3/5 when the smartconfig seed
-- is absent, so the feature works before that row lands -- the same tolerant-of-missing-key
-- posture the schedule proc takes.
--
-- Read-only STABLE function; deploys independently of the backend and stays backward
-- compatible (a brand-new proc no deployed code calls yet).
DROP FUNCTION IF EXISTS public.usp_getfinancialconfigforcompetition(integer);

CREATE FUNCTION public.usp_getfinancialconfigforcompetition(p_competitionid integer)
RETURNS TABLE(
    ranchid integer,
    competitiondays integer,
    fieldid smallint,
    maxhorseclassesperday integer,
    stallregularprice numeric,
    stallupgradedprice numeric,
    stallregularsupply integer,
    stallupgradedsupply integer,
    shavingspricemin numeric,
    shavingspricemax numeric,
    shavingsactivecount integer,
    shavingsbagsmin numeric,
    shavingsbagsmax numeric,
    tackhorsesperunitmin numeric,
    tackhorsesperunitmax numeric
)
LANGUAGE sql
STABLE
AS $function$
    SELECT
        c.hostranchid AS ranchid,
        -- Inclusive day span: a same-day competition is 1 day, not 0.
        (c.competitionenddate - c.competitionstartdate + 1)::integer AS competitiondays,
        c.fieldid,
        -- Present for all four live fields (reining 1, cutting 3, all-around 5, extreme 5);
        -- NULL only for a field with no fieldconfig row (jumping/dressage today). The financial
        -- read keys off THIS column, never the schedule minute columns, so all-around -- which is
        -- schedule-exempt via NULL minutes -- still gets a horse cap and a full projection.
        fc.maxhorseclassesperday,
        -- Stall prices: MAX over ACTIVE category-2 rows for the host ranch, one tier each.
        -- MAX collapses any duplicate active rows deterministically; NULL when no active row
        -- exists (-> prompt, never zero).
        (SELECT MAX(pc.itemprice)
           FROM pricecatalog pc
           JOIN product p ON p.productid = pc.productid
          WHERE pc.ranchid = c.hostranchid AND pc.isactive
            AND p.categoryid = 2 AND pc.productid = 3) AS stallregularprice,
        (SELECT MAX(pc.itemprice)
           FROM pricecatalog pc
           JOIN product p ON p.productid = pc.productid
          WHERE pc.ranchid = c.hostranchid AND pc.isactive
            AND p.categoryid = 2 AND pc.productid = 4) AS stallupgradedprice,
        -- Real stall supply for the host ranch, by tier. Caps the derived horse-stalls band.
        (SELECT COUNT(*)::integer FROM stall s
          WHERE s.ranchid = c.hostranchid AND s.stalltype = 3) AS stallregularsupply,
        (SELECT COUNT(*)::integer FROM stall s
          WHERE s.ranchid = c.hostranchid AND s.stalltype = 4) AS stallupgradedsupply,
        -- Shavings: MIN/MAX price over ACTIVE category-3 rows, plus the count of DISTINCT active
        -- products -- the ambiguity signal. Exactly one active product => min = max, band comes
        -- from the bag count alone. More than one (the live bug: bags 5 @40 and 10 @50 both
        -- active at DK) => [40, 50] widens it and the client shows a "pricing ambiguous" note.
        (SELECT MIN(pc.itemprice)
           FROM pricecatalog pc
           JOIN product p ON p.productid = pc.productid
          WHERE pc.ranchid = c.hostranchid AND pc.isactive AND p.categoryid = 3) AS shavingspricemin,
        (SELECT MAX(pc.itemprice)
           FROM pricecatalog pc
           JOIN product p ON p.productid = pc.productid
          WHERE pc.ranchid = c.hostranchid AND pc.isactive AND p.categoryid = 3) AS shavingspricemax,
        (SELECT COUNT(DISTINCT pc.productid)::integer
           FROM pricecatalog pc
           JOIN product p ON p.productid = pc.productid
          WHERE pc.ranchid = c.hostranchid AND pc.isactive AND p.categoryid = 3) AS shavingsactivecount,
        -- Bags-per-stall and tack-uplift ratios from smartconfig, read by key (never position).
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'shavingsperstallmin') AS shavingsbagsmin,
        (SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'shavingsperstallmax') AS shavingsbagsmax,
        COALESCE((SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'tackstallhorsesperunitmin'), 3) AS tackhorsesperunitmin,
        COALESCE((SELECT sc.configvalue FROM smartconfig sc WHERE sc.configkey = 'tackstallhorsesperunitmax'), 5) AS tackhorsesperunitmax
    FROM competition c
    LEFT JOIN fieldconfig fc ON fc.fieldid = c.fieldid
    WHERE c.competitionid = p_competitionid;
$function$;
