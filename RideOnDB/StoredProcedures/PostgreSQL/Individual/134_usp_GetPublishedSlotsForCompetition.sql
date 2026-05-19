-- מחזיר רשימת סלוטי פייד-טיים שפורסמו בתחרות נתונה.
-- האדמין משתמש בזה כדי לראות את כל הלוז שפורסם, גם אם אין לו בקשות באותו סלוט.
-- שדה MyAssignedCount = כמה בקשות של הראנץ' של האדמין נמצאות בסלוט הזה.
DROP FUNCTION IF EXISTS usp_getpublishedslotsforcompetition(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_GetPublishedSlotsForCompetition(
    p_CompetitionId INTEGER,
    p_RanchId       INTEGER
)
RETURNS TABLE(
    "PaidTimeSlotInCompId" INTEGER,
    "SlotDate"             DATE,
    "StartTime"            TIME,
    "EndTime"              TIME,
    "ArenaName"            TEXT,
    "SlotStatus"           TEXT,
    "AssignedCount"        INTEGER,
    "MyAssignedCount"      INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        slot.paidtimeslotincompid,
        slot.slotdate,
        slot.starttime,
        slot.endtime,
        arena.arenaname::TEXT,
        slot.slotstatus::TEXT,
        COALESCE(
            (SELECT COUNT(*)::INTEGER
             FROM paidtimerequest ptr
             WHERE ptr.assignedcompslotid = slot.paidtimeslotincompid
               AND ptr.status = 'Assigned'),
            0
        ) AS assigned_count,
        COALESCE(
            (SELECT COUNT(*)::INTEGER
             FROM paidtimerequest ptr
             INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
             INNER JOIN horse h ON h.horseid = sr.horseid
             WHERE ptr.assignedcompslotid = slot.paidtimeslotincompid
               AND ptr.status = 'Assigned'
               AND h.ranchid  = p_RanchId),
            0
        ) AS my_assigned_count
    FROM paidtimeslotincompetition slot
    INNER JOIN arena arena
        ON arena.ranchid = slot.arenaranchid
       AND arena.arenaid = slot.arenaid
    WHERE slot.competitionid = p_CompetitionId
      AND COALESCE(slot.ispublished, FALSE) = TRUE
    ORDER BY slot.slotdate, slot.starttime;
END;
$$;
