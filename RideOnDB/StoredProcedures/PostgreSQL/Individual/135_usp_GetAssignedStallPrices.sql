-- מחזיר את המחיר הנוכחי בפועל של תאים משובצים בתחרות לחווה נתונה.
-- שולף את מחיר ה-pricecatalog האחרון הפעיל של productid של סוג התא בפועל
-- (stall.stalltype), לפי החווה של התא. משמש את המובייל להציג מחיר אמיתי
-- לאחר ששובץ סוג תא שונה ממה שהוזמן.
-- המפתח להתאמה במובייל: (CompoundId, StallId, HorseId).
DROP FUNCTION IF EXISTS usp_getassignedstallprices(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_GetAssignedStallPrices(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER
)
RETURNS TABLE(
    "AssignmentId"     INTEGER,
    "CompoundId"       SMALLINT,
    "StallId"          SMALLINT,
    "HorseId"          INTEGER,
    "AssignedPrice"    NUMERIC,
    "ProductName"      VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.assignmentid,
        sa.compoundid,
        sa.stallid,
        sa.horseid,
        COALESCE(
            (SELECT pc.itemprice
               FROM pricecatalog pc
              WHERE pc.productid = s.stalltype
                AND pc.ranchid   = sa.ranchid
                AND pc.isactive  = TRUE
              ORDER BY pc.creationdate DESC
              LIMIT 1),
            0
        )::NUMERIC AS assigned_price,
        p.productname
    FROM stallassignment sa
    INNER JOIN stall s
        ON s.ranchid    = sa.ranchid
       AND s.compoundid = sa.compoundid
       AND s.stallid    = sa.stallid
    INNER JOIN product p
        ON p.productid = s.stalltype
    WHERE sa.competitionid = p_CompetitionId
      AND sa.ranchid       = p_RanchId;
END;
$$;
