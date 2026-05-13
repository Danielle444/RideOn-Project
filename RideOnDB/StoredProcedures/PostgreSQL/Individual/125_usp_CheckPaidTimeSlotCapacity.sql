-- בודק האם תוספת אצוות בקשות חדשה תחרוג מהקיבולת של הסלוטים.
-- p_Items: מערך JSONB של {"requestedCompSlotId": int, "priceCatalogId": int}
-- מחזיר שורה לכל סלוט שמופיע באצווה: קיבולת כוללת, ניצול נוכחי
-- (לפי בקשות שכבר Assigned), דקות נוספות מהבקשה החדשה, ודגל חריגה.
CREATE OR REPLACE FUNCTION usp_CheckPaidTimeSlotCapacity(
    p_Items JSONB
)
RETURNS TABLE(
    "RequestedCompSlotId"   INTEGER,
    "TotalCapacityMinutes"  INTEGER,
    "UsedCapacityMinutes"   INTEGER,
    "NewRequestMinutes"     INTEGER,
    "WouldOverflow"         BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH new_requests AS (
        SELECT
            (item->>'requestedCompSlotId')::INTEGER AS slot_id,
            (item->>'priceCatalogId')::INTEGER      AS catalog_id
        FROM jsonb_array_elements(p_Items) AS item
    ),
    new_minutes AS (
        SELECT
            nr.slot_id,
            SUM(ptp.durationminutes + 1)::INTEGER AS minutes_added
        FROM new_requests nr
        INNER JOIN pricecatalog pc    ON pc.pricecatalogid = nr.catalog_id
        INNER JOIN paidtimeproduct ptp ON ptp.productid     = pc.productid
        GROUP BY nr.slot_id
    ),
    used AS (
        SELECT
            ptr.assignedcompslotid AS slot_id,
            COALESCE(SUM(ptp.durationminutes + 1), 0)::INTEGER AS used_min
        FROM paidtimerequest ptr
        INNER JOIN pricecatalog pc    ON pc.pricecatalogid = ptr.pricecatalogid
        INNER JOIN paidtimeproduct ptp ON ptp.productid     = pc.productid
        WHERE ptr.assignedcompslotid IN (SELECT slot_id FROM new_requests)
          AND ptr.status = 'Assigned'
        GROUP BY ptr.assignedcompslotid
    )
    SELECT
        nm.slot_id,
        (EXTRACT(EPOCH FROM (s.endtime - s.starttime))::INTEGER / 60) AS total_capacity,
        COALESCE(u.used_min, 0) AS used_min,
        nm.minutes_added,
        -- חריגה אמיתית: האצווה החדשה לבדה (בלי שיבוצים קיימים) לא נכנסת
        -- בקיבולת הסלוט. שאר המצבים (התנגשות עם משובץ קיים) יטופלו
        -- בשלב השיבוץ האוטומטי - הבקשה תישאר Pending.
        nm.minutes_added
            > (EXTRACT(EPOCH FROM (s.endtime - s.starttime))::INTEGER / 60) AS would_overflow
    FROM new_minutes nm
    INNER JOIN paidtimeslotincompetition s ON s.paidtimeslotincompid = nm.slot_id
    LEFT JOIN used u ON u.slot_id = nm.slot_id;
END;
$$;
