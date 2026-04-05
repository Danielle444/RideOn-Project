-- ============================================================
-- FILE 4: FACILITIES, CATALOG & PAID TIME MODULE (PostgreSQL / Supabase)
-- Covers: Arena, Stalls, Product Catalog, Paid Time Slots
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ARENA
-- ============================================================

-- Get arenas by ranch ID
CREATE OR REPLACE FUNCTION usp_GetArenasByRanchId(
    "RanchId" INTEGER
)
RETURNS TABLE(
    "ArenaId"     SMALLINT,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT,
    "ArenaWidth"  SMALLINT,
    "IsCovered"   BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT a.arenaid, a.arenaname, a.arenalength, a.arenawidth, a.iscovered
    FROM arena a
    WHERE a.ranchid = "RanchId"
    ORDER BY a.arenaname;
END;
$$;


-- Insert arena (auto-calculates the next ArenaId for the ranch)
CREATE OR REPLACE FUNCTION usp_InsertArena(
    "RanchId"     INTEGER,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT DEFAULT NULL,
    "ArenaWidth"  SMALLINT DEFAULT NULL,
    "IsCovered"   BOOLEAN  DEFAULT NULL
)
RETURNS TABLE("NewArenaId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_new_arena_id SMALLINT;
BEGIN
    SELECT COALESCE(MAX(a.arenaid), 0) + 1 INTO v_new_arena_id
    FROM arena a WHERE a.ranchid = "RanchId";

    INSERT INTO arena (ranchid, arenaid, arenaname, arenalength, arenawidth, iscovered)
    VALUES ("RanchId", v_new_arena_id, "ArenaName", "ArenaLength", "ArenaWidth", "IsCovered");

    RETURN QUERY SELECT v_new_arena_id AS "NewArenaId";
END;
$$;


-- Update arena
CREATE OR REPLACE FUNCTION usp_UpdateArena(
    "RanchId"     INTEGER,
    "ArenaId"     SMALLINT,
    "ArenaName"   TEXT,
    "ArenaLength" SMALLINT DEFAULT NULL,
    "ArenaWidth"  SMALLINT DEFAULT NULL,
    "IsCovered"   BOOLEAN  DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE arena SET
        arenaname   = "ArenaName",
        arenalength = "ArenaLength",
        arenawidth  = "ArenaWidth",
        iscovered   = "IsCovered"
    WHERE ranchid = "RanchId" AND arenaid = "ArenaId";
END;
$$;


-- ============================================================
-- STALL COMPOUNDS
-- ============================================================

-- Create a compound with stalls (bulk)
CREATE OR REPLACE FUNCTION usp_CreateCompoundWithStalls(
    "RanchId"       INTEGER,
    "CompoundName"  TEXT,
    "NumberOfStalls" SMALLINT,
    "StallType"     SMALLINT
)
RETURNS TABLE("NewCompoundId" SMALLINT)
LANGUAGE plpgsql AS $$
DECLARE
    v_compound_id SMALLINT;
    i             SMALLINT;
BEGIN
    SELECT COALESCE(MAX(sc.compoundid), 0) + 1 INTO v_compound_id
    FROM stallcompound sc WHERE sc.ranchid = "RanchId";

    INSERT INTO stallcompound (ranchid, compoundid, compoundname)
    VALUES ("RanchId", v_compound_id, "CompoundName");

    FOR i IN 1.."NumberOfStalls" LOOP
        INSERT INTO stall (ranchid, compoundid, stallid, stallnumber, stalltype)
        VALUES ("RanchId", v_compound_id, i, CAST(i AS TEXT), "StallType");
    END LOOP;

    RETURN QUERY SELECT v_compound_id AS "NewCompoundId";
END;
$$;


-- Get compounds by ranch ID
CREATE OR REPLACE FUNCTION usp_GetCompoundsByRanchId(
    "RanchId" INTEGER
)
RETURNS TABLE("CompoundId" SMALLINT, "CompoundName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT sc.compoundid, sc.compoundname
    FROM stallcompound sc
    WHERE sc.ranchid = "RanchId";
END;
$$;


-- Get stalls by compound ID
CREATE OR REPLACE FUNCTION usp_GetStallsByCompoundId(
    "RanchId"    INTEGER,
    "CompoundId" SMALLINT
)
RETURNS TABLE(
    "StallId"     SMALLINT,
    "StallNumber" TEXT,
    "StallType"   SMALLINT,
    "StallNotes"  TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.stallid, s.stallnumber, s.stalltype, s.stallnotes
    FROM stall s
    WHERE s.ranchid    = "RanchId"
      AND s.compoundid = "CompoundId";
END;
$$;


-- Get total stall count for a ranch
CREATE OR REPLACE FUNCTION usp_GetTotalStallsCountByRanchId(
    "RanchId" INTEGER
)
RETURNS TABLE("TotalStalls" BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*) FROM stall s WHERE s.ranchid = "RanchId";
END;
$$;


-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

-- Get all product categories
CREATE OR REPLACE FUNCTION usp_GetAllProductCategories()
RETURNS TABLE("CategoryId" SMALLINT, "CategoryName" TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pc.categoryid, pc.categoryname FROM productcategory pc;
END;
$$;


-- Get products by category (or all if no category given)
CREATE OR REPLACE FUNCTION usp_GetProductsByCategory(
    "CategoryId" SMALLINT DEFAULT NULL
)
RETURNS TABLE(
    "ProductId"   SMALLINT,
    "CategoryId"  SMALLINT,
    "ProductName" TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.categoryid, p.productname
    FROM product p
    WHERE ("CategoryId" IS NULL OR p.categoryid = "CategoryId");
END;
$$;


-- Set product price for ranch (deactivates old price, inserts new one)
CREATE OR REPLACE FUNCTION usp_SetProductPriceForRanch(
    "ProductId" SMALLINT,
    "RanchId"   INTEGER,
    "NewPrice"  NUMERIC(10,2)
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE pricecatalog SET isactive = FALSE
    WHERE productid = "ProductId" AND ranchid = "RanchId" AND isactive = TRUE;

    INSERT INTO pricecatalog (productid, ranchid, creationdate, itemprice, isactive)
    VALUES ("ProductId", "RanchId", NOW(), "NewPrice", TRUE);
END;
$$;


-- Get price history for a product at a ranch
CREATE OR REPLACE FUNCTION usp_GetPriceHistoryForProduct(
    "ProductId" SMALLINT,
    "RanchId"   INTEGER
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
    WHERE pc.productid = "ProductId" AND pc.ranchid = "RanchId"
    ORDER BY pc.creationdate DESC;
END;
$$;


-- Get active prices by category for a ranch
CREATE OR REPLACE FUNCTION usp_GetActivePricesByCategory(
    "CategoryId" SMALLINT,
    "RanchId"    INTEGER
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   TEXT,
    "CatalogItemId" INTEGER,
    "ItemPrice"     NUMERIC(10,2)
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.productid, p.productname, pc.catalogitemid, pc.itemprice
    FROM product p
    INNER JOIN pricecatalog pc ON p.productid = pc.productid
    WHERE p.categoryid  = "CategoryId"
      AND pc.ranchid    = "RanchId"
      AND pc.isactive   = TRUE;
END;
$$;


-- Get product pricing grid (including products with no price set)
CREATE OR REPLACE FUNCTION usp_GetProductPricingGrid(
    "RanchId"    INTEGER,
    "CategoryId" SMALLINT
)
RETURNS TABLE(
    "ProductId"     SMALLINT,
    "ProductName"   TEXT,
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
        AND pc.ranchid  = "RanchId"
        AND pc.isactive = TRUE
    WHERE p.categoryid = "CategoryId"
    ORDER BY p.productname;
END;
$$;


-- ============================================================
-- PAID TIME SLOTS
-- ============================================================

-- Get all base paid time slot definitions
CREATE OR REPLACE FUNCTION usp_GetAllPaidTimeBaseSlots()
RETURNS TABLE(
    "PaidTimeSlotId" INTEGER,
    "DayOfWeek"      TEXT,
    "TimeOfDay"      TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT pts.paidtimeslotid, pts.dayofweek, pts.timeofday FROM paidtimeslot pts;
END;
$$;


-- Insert paid time slot in competition
CREATE OR REPLACE FUNCTION usp_InsertPaidTimeSlotInComp(
    "CompetitionId"   INTEGER,
    "PaidTimeSlotId"  INTEGER,
    "ArenaRanchId"    INTEGER,
    "ArenaId"         SMALLINT,
    "SlotDate"        DATE,
    "StartTime"       TIME,
    "EndTime"         TIME,
    "SlotStatus"      TEXT DEFAULT NULL,
    "SlotNotes"       TEXT DEFAULT NULL
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
        "CompetitionId", "PaidTimeSlotId", "ArenaRanchId", "ArenaId",
        "SlotDate", "StartTime", "EndTime", "SlotStatus", "SlotNotes"
    )
    RETURNING compslotid INTO v_new_id;

    RETURN QUERY SELECT v_new_id AS "NewCompSlotId";
END;
$$;


-- Update paid time slot in competition
CREATE OR REPLACE FUNCTION usp_UpdatePaidTimeSlotInComp(
    "CompSlotId"     INTEGER,
    "PaidTimeSlotId" INTEGER,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "SlotDate"       DATE,
    "StartTime"      TIME,
    "EndTime"        TIME,
    "SlotStatus"     TEXT DEFAULT NULL,
    "SlotNotes"      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE paidtimeslotincompetition SET
        paidtimeslotid = "PaidTimeSlotId",
        arenaranchid   = "ArenaRanchId",
        arenaid        = "ArenaId",
        slotdate       = "SlotDate",
        starttime      = "StartTime",
        endtime        = "EndTime",
        slotstatus     = "SlotStatus",
        slotnotes      = "SlotNotes"
    WHERE compslotid = "CompSlotId";
END;
$$;


-- Get paid time slots by competition ID
CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsByCompId(
    "CompetitionId" INTEGER
)
RETURNS TABLE(
    "CompSlotId"   INTEGER,
    "SlotDate"     DATE,
    "TimeOfDay"    TEXT,
    "StartTime"    TIME,
    "EndTime"      TIME,
    "ArenaRanchId" INTEGER,
    "ArenaId"      SMALLINT,
    "ArenaName"    TEXT
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
    WHERE ptc.competitionid = "CompetitionId"
    ORDER BY ptc.slotdate ASC, ptc.starttime ASC;
END;
$$;


-- Delete paid time slot in competition (with validation)
CREATE OR REPLACE FUNCTION usp_DeletePaidTimeSlotInComp(
    "CompSlotId"  INTEGER,
    "ForceDelete" BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    -- Hard block: active assignments exist
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.assignedcompslotid = "CompSlotId"
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        RAISE EXCEPTION 'Cannot delete: Participants are actively ASSIGNED to this slot.';
    END IF;

    -- Warning: active requests exist (user must confirm)
    IF EXISTS (
        SELECT 1 FROM paidtimerequest ptr
        WHERE ptr.requestedcompslotid = "CompSlotId"
          AND COALESCE(ptr.status, '') <> 'Cancelled'
    ) THEN
        IF "ForceDelete" = FALSE THEN
            RAISE EXCEPTION 'Warning: There are active REQUESTS for this slot. User confirmation required.';
        END IF;
    END IF;

    DELETE FROM paidtimeslotincompetition WHERE compslotid = "CompSlotId";
END;
$$;


-- Get competitions with paid time in the last two years
CREATE OR REPLACE FUNCTION usp_GetCompetitionsWithPaidTimeLastTwoYears()
RETURNS TABLE(
    "CompetitionId"         INTEGER,
    "CompetitionName"       TEXT,
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
CREATE OR REPLACE FUNCTION usp_GetPaidTimeSlotsFromLatestCompetition()
RETURNS TABLE(
    "CompSlotId"     INTEGER,
    "PaidTimeSlotId" INTEGER,
    "TimeOfDay"      TEXT,
    "ArenaRanchId"   INTEGER,
    "ArenaId"        SMALLINT,
    "StartTime"      TIME,
    "EndTime"        TIME,
    "SlotNotes"      TEXT
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
