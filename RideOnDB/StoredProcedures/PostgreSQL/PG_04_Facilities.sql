-- ============================================================
-- FILE 4: FACILITIES, CATALOG & PAID TIME MODULE (PostgreSQL / Supabase)
-- Covers: Arena, Stalls, Product Catalog, Paid Time Slots
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ARENA
-- ============================================================

-- Get arenas by ranch ID
DROP FUNCTION IF EXISTS usp_GetArenasByRanchId(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetArenasByRanchId(
    ranchid_param INTEGER
)
RETURNS TABLE(
    "ArenaId"     SMALLINT,
    "ArenaName"   VARCHAR,
    "ArenaLength" SMALLINT,
    "ArenaWidth"  SMALLINT,
    "IsCovered"   BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT a.arenaid, a.arenaname, a.arenalength, a.arenawidth, a.iscovered
    FROM arena a
    WHERE a.ranchid = ranchid_param
    ORDER BY a.arenaname;
END;
$$;


-- Insert arena (auto-calculates the next ArenaId for the ranch)
DROP FUNCTION IF EXISTS usp_InsertArena(INTEGER, TEXT, SMALLINT, SMALLINT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertArena(
    ranchid_param     INTEGER,
    arenaname_param   TEXT,
    arenalength_param SMALLINT DEFAULT NULL,
    arenawidth_param  SMALLINT DEFAULT NULL,
    iscovered_param   BOOLEAN  DEFAULT NULL
)
RETURNS TABLE("NewArenaId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_arena_id SMALLINT;
BEGIN
    SELECT COALESCE(MAX(a.arenaid), 0) + 1 INTO v_new_arena_id
    FROM arena a WHERE a.ranchid = ranchid_param;

    INSERT INTO arena (ranchid, arenaid, arenaname, arenalength, arenawidth, iscovered)
    VALUES (ranchid_param, v_new_arena_id, arenaname_param, arenalength_param, arenawidth_param, iscovered_param);

    RETURN QUERY SELECT v_new_arena_id AS "NewArenaId";
END;
$$;


-- Update arena
DROP FUNCTION IF EXISTS usp_UpdateArena(INTEGER, SMALLINT, TEXT, SMALLINT, SMALLINT, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdateArena(
    ranchid_param     INTEGER,
    arenaid_param     SMALLINT,
    arenaname_param   TEXT,
    arenalength_param SMALLINT DEFAULT NULL,
    arenawidth_param  SMALLINT DEFAULT NULL,
    iscovered_param   BOOLEAN  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE arena SET
        arenaname   = arenaname_param,
        arenalength = arenalength_param,
        arenawidth  = arenawidth_param,
        iscovered   = iscovered_param
    WHERE ranchid = ranchid_param AND arenaid = arenaid_param;
END;
$$;


-- ============================================================
-- STALL COMPOUNDS
-- ============================================================

-- Create a compound with stalls (bulk)
DROP FUNCTION IF EXISTS usp_CreateCompoundWithStalls(INTEGER, TEXT, SMALLINT, SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_CreateCompoundWithStalls(
    ranchid_param       INTEGER,
    compoundname_param  TEXT,
    numberofstalls_param SMALLINT,
    stalltype_param     SMALLINT
)
RETURNS TABLE("NewCompoundId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_compound_id SMALLINT;
    i             SMALLINT;
BEGIN
    SELECT COALESCE(MAX(sc.compoundid), 0) + 1 INTO v_compound_id
    FROM stallcompound sc WHERE sc.ranchid = ranchid_param;

    INSERT INTO stallcompound (ranchid, compoundid, compoundname)
    VALUES (ranchid_param, v_compound_id, compoundname_param);

    FOR i IN 1..numberofstalls_param LOOP
        INSERT INTO stall (ranchid, compoundid, stallid, stallnumber, stalltype)
        VALUES (ranchid_param, v_compound_id, i, CAST(i AS TEXT), stalltype_param);
    END LOOP;

    RETURN QUERY SELECT v_compound_id AS "NewCompoundId";
END;
$$;


-- Get compounds by ranch ID
DROP FUNCTION IF EXISTS usp_GetCompoundsByRanchId(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetCompoundsByRanchId(
    ranchid_param INTEGER
)
RETURNS TABLE("CompoundId" SMALLINT, "CompoundName" VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sc.compoundid, sc.compoundname
    FROM stallcompound sc
    WHERE sc.ranchid = ranchid_param;
END;
$$;


-- Get stalls by compound ID
DROP FUNCTION IF EXISTS usp_GetStallsByCompoundId(INTEGER, SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetStallsByCompoundId(
    ranchid_param    INTEGER,
    compoundid_param SMALLINT
)
RETURNS TABLE(
    "StallId"     SMALLINT,
    "StallNumber" VARCHAR,
    "StallType"   SMALLINT,
    "StallNotes"  VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.stallid, s.stallnumber, s.stalltype, s.stallnotes
    FROM stall s
    WHERE s.ranchid    = ranchid_param
      AND s.compoundid = compoundid_param;
END;
$$;


-- Get total stall count for a ranch
DROP FUNCTION IF EXISTS usp_GetTotalStallsCountByRanchId(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetTotalStallsCountByRanchId(
    ranchid_param INTEGER
)
RETURNS TABLE("TotalStalls" BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*) FROM stall s WHERE s.ranchid = ranchid_param;
END;
$$;


-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

-- Get all product categories
DROP FUNCTION IF EXISTS usp_GetAllProductCategories() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllProductCategories()
RETURNS TABLE("CategoryId" SMALLINT, "CategoryName" VARCHAR)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.categoryid, pc.categoryname FROM productcategory pc;
END;
$$;


-- Get products by category (or all if no category given)
DROP FUNCTION IF EXISTS usp_GetProductsByCategory(SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetProductsByCategory(
    categoryid_param SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ProductId"   SMALLINT,
    "CategoryId"  SMALLINT,
    "ProductName" VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.categoryid, p.productname
    FROM product p
    WHERE (categoryid_param IS NULL OR p.categoryid = categoryid_param);
END;
$$;


-- Set product price for ranch (deactivates old price, inserts new one)
DROP FUNCTION IF EXISTS usp_SetProductPriceForRanch(SMALLINT, INTEGER, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION usp_SetProductPriceForRanch(
    productid_param SMALLINT,
    ranchid_param   INTEGER,
    newprice_param  NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pricecatalog SET isactive = FALSE
    WHERE productid = productid_param AND ranchid = ranchid_param AND isactive = TRUE;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES (productid_param, ranchid_param, NOW(), newprice_param, TRUE);
END;
$$;


-- Get price history for a product at a ranch
DROP FUNCTION IF EXISTS usp_GetPriceHistoryForProduct(SMALLINT, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPriceHistoryForProduct(
    productid_param SMALLINT,
    ranchid_param   INTEGER
)
RETURNS TABLE(
    "CatalogItemId" INTEGER,
    "CreationDate"  TIMESTAMP,
    "ItemPrice"     NUMERIC(10,2),
    "IsActive"      BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.catalogitemid, pc.creationdate, pc.itemprice, pc.isactive
    FROM pricecatalog pc
    WHERE pc.productid = productid_param AND pc.ranchid = ranchid_param
    ORDER BY pc.creationdate DESC;
END;
$$;


-- Get active prices by category for a ranch
DROP FUNCTION IF EXISTS usp_GetActivePricesByCategory(SMALLINT, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetActivePricesByCategory(
    categoryid_param SMALLINT,
    ranchid_param    INTEGER
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   VARCHAR,
    "CatalogItemId" INTEGER,
    "ItemPrice"     NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.productname, pc.catalogitemid, pc.itemprice
    FROM product p
    INNER JOIN pricecatalog pc ON p.productid = pc.productid
    WHERE p.categoryid  = categoryid_param
      AND pc.ranchid    = ranchid_param
      AND pc.isactive   = TRUE;
END;
$$;


-- Get product pricing grid (including products with no price set)
DROP FUNCTION IF EXISTS usp_GetProductPricingGrid(INTEGER, SMALLINT) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetProductPricingGrid(
    ranchid_param    INTEGER,
    categoryid_param SMALLINT
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   VARCHAR,
    "CatalogItemId" INTEGER,
    "ItemPrice"     NUMERIC(10,2),
    "CreationDate"  TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.productid,
        p.productname,
        pc.catalogitemid,
        pc.itemprice,
        pc.creationdate
    FROM product p
    LEFT JOIN pricecatalog pc
        ON p.productid  = pc.productid
        AND pc.ranchid  = ranchid_param
        AND pc.isactive = TRUE
    WHERE p.categoryid = categoryid_param
    ORDER BY p.productname;
END;
$$;


-- ============================================================
-- PAID TIME SLOTS
-- ============================================================

-- Get all base paid time slot definitions
DROP FUNCTION IF EXISTS usp_GetAllPaidTimeBaseSlots() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetAllPaidTimeBaseSlots()
RETURNS TABLE(
    "PaidTimeSlotId" INTEGER,
    "DayOfWeek"      VARCHAR,
    "TimeOfDay"      VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pts.paidtimeslotid, pts.dayofweek, pts.timeofday FROM paidtimeslot pts;
END;
$$;


-- Insert paid time slot in competition
DROP FUNCTION IF EXISTS usp_InsertPaidTimeSlotInComp(INTEGER, INTEGER, INTEGER, SMALLINT, DATE, TIME, TIME, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_InsertPaidTimeSlotInComp(
    competitionid_param   INTEGER,
    paidtimeslotid_param  INTEGER,
    arenaranchid_param    INTEGER,
    arenaid_param         SMALLINT,
    slotdate_param        DATE,
    starttime_param       TIME,
    endtime_param         TIME,
    slotstatus_param      TEXT DEFAULT NULL,
    slotnotes_param       TEXT DEFAULT NULL
)
RETURNS TABLE("NewCompSlotId" INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_id INTEGER;
BEGIN
    INSERT INTO paidtimeslotincompetition (
        competitionid, paidtimeslotid, arenaranchid, arenaid,
        slotdate, starttime, endtime, slotstatus, slotnotes
    )
    VALUES (
        competitionid_param, paidtimeslotid_param, arenaranchid_param, arenaid_param,
        slotdate_param, starttime_param, endtime_param, slotstatus_param, slotnotes_param
    )
    RETURNING compslotid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompSlotId";
END;
$$;


-- Update paid time slot in competition
DROP FUNCTION IF EXISTS usp_UpdatePaidTimeSlotInComp(INTEGER, INTEGER, INTEGER, SMALLINT, DATE, TIME, TIME, TEXT, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeSlotInComp(
    compslotid_param     INTEGER,
    paidtimeslotid_param INTEGER,
    arenaranchid_param   INTEGER,
    arenaid_param        SMALLINT,
    slotdate_param       DATE,
    starttime_param      TIME,
    endtime_param        TIME,
    slotstatus_param     TEXT DEFAULT NULL,
    slotnotes_param      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE paidtimeslotincompetition SET
        paidtimeslotid = paidtimeslotid_param,
        arenaranchid   = arenaranchid_param,
        arenaid        = arenaid_param,
        slotdate       = slotdate_param,
        starttime      = starttime_param,
        endtime        = endtime_param,
        slotstatus     = slotstatus_param,
        slotnotes      = slotnotes_param
    WHERE compslotid = compslotid_param;
END;
$$;


-- Get paid time slots by competition ID
DROP FUNCTION IF EXISTS usp_GetPaidTimeSlotsByCompId(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsByCompId(
    competitionid_param INTEGER
)
RETURNS TABLE(
    "CompSlotId"   INTEGER,
    "SlotDate"     DATE,
    "TimeOfDay"    VARCHAR,
    "StartTime"    TIME,
    "EndTime"      TIME,
    "ArenaRanchId" INTEGER,
    "ArenaId"      SMALLINT,
    "ArenaName"    VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        ptc.compslotid,
        ptc.slotdate,
        pt.timeofday,
        ptc.starttime,
        ptc.endtime,
        ptc.arenaranchid,
        ptc.arenaid,
        a.arenaname
    FROM paidtimeslotincompetition ptc
    INNER JOIN paidtimeslot pt ON ptc.paidtimeslotid = pt.paidtimeslotid
    INNER JOIN arena        a  ON ptc.arenaranchid   = a.ranchid AND ptc.arenaid = a.arenaid
    WHERE ptc.competitionid = competitionid_param
    ORDER BY ptc.slotdate ASC, ptc.starttime ASC;
END;
$$;


-- Delete paid time slot in competition (with validation)
DROP FUNCTION IF EXISTS usp_DeletePaidTimeSlotInComp(INTEGER, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION usp_DeletePaidTimeSlotInComp(
    compslotid_param  INTEGER,
    forcedelete_param BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- Hard block: active assignments exist
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.assignedcompslotid = compslotid_param
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        RAISE EXCEPTION 'Cannot delete: Participants are actively ASSIGNED to this slot.';
    END IF;

    -- Warning: active requests exist (user must confirm)
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.requestedcompslotid = compslotid_param
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        IF forcedelete_param = FALSE THEN
            RAISE EXCEPTION 'Warning: There are active REQUESTS for this slot. User confirmation required.';
        END IF;
    END IF;

    DELETE FROM paidtimeslotincompetition WHERE compslotid = compslotid_param;
END;
$$;


-- Get competitions with paid time in the last two years
DROP FUNCTION IF EXISTS usp_GetCompetitionsWithPaidTimeLastTwoYears() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetCompetitionsWithPaidTimeLastTwoYears()
RETURNS TABLE(
    "CompetitionId"         INTEGER,
    "CompetitionName"       VARCHAR,
    "CompetitionStartDate"  DATE
)
LANGUAGE plpgsql AS $$
DECLARE
    v_two_years_ago DATE := CURRENT_DATE - INTERVAL '2 years';
BEGIN
    RETURN QUERY
    SELECT c.competitionid, c.competitionname, c.competitionstartdate
    FROM competition c
    WHERE c.competitionstartdate >= v_two_years_ago
      AND EXISTS (
          SELECT 1 FROM paidtimeslotincompetition ptc
          WHERE ptc.competitionid = c.competitionid
      )
    ORDER BY c.competitionstartdate DESC;
END;
$$;


-- Get paid time slots from the latest competition that had paid time
DROP FUNCTION IF EXISTS usp_GetPaidTimeSlotsFromLatestCompetition() CASCADE;
CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsFromLatestCompetition()
RETURNS TABLE(
    "CompSlotId"     INTEGER,
    "PaidTimeSlotId" INTEGER,
    "TimeOfDay"      VARCHAR,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "StartTime"      TIME,
    "EndTime"        TIME,
    "SlotNotes"      VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_latest_comp_id INTEGER;
BEGIN
    SELECT c.competitionid INTO v_latest_comp_id
    FROM competition c
    WHERE EXISTS (
        SELECT 1 FROM paidtimeslotincompetition ptc WHERE ptc.competitionid = c.competitionid
    )
    ORDER BY c.competitionstartdate DESC
    LIMIT 1;

    IF v_latest_comp_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            ptc.compslotid,
            ptc.paidtimeslotid,
            pt.timeofday,
            ptc.arenaranchid,
            ptc.arenaid,
            ptc.starttime,
            ptc.endtime,
            ptc.slotnotes
        FROM paidtimeslotincompetition ptc
        INNER JOIN paidtimeslot pt ON ptc.paidtimeslotid = pt.paidtimeslotid
        WHERE ptc.competitionid = v_latest_comp_id
        ORDER BY ptc.slotdate ASC, ptc.starttime ASC;
    END IF;
END;
$$;
