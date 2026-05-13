-- מחזיר לאדמין חווה את בקשות הפייד-טיים שהוא יצר בתחרות (כלל סוסים/מאמנים/רוכבים שלו).
-- מסונן לפי p_OrderedBySystemUserId (האדמין שיצר את הבקשה).
-- שדות display מציגים את ה"שיבוץ הנוכחי" - אם משובץ, נתוני השיבוץ; אחרת, נתוני הבקשה.
-- שדות עזר: IsPaid (האם שולם), CanModify (האם מותר לערוך/לבטל - לא שולם וגם
-- נותרו יותר מ-24 שעות עד תחילת הפייד-טיים).
DROP FUNCTION IF EXISTS usp_getmypaidtimerequestsforcompetition(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION usp_GetMyPaidTimeRequestsForCompetition(
    p_CompetitionId         INTEGER,
    p_OrderedBySystemUserId INTEGER
)
RETURNS TABLE(
    "paidtimerequestid"      INTEGER,
    "horsename"              TEXT,
    "barnname"               TEXT,
    "coachname"              TEXT,
    "payername"              TEXT,
    "productname"            TEXT,
    "amounttopay"            NUMERIC,
    "ispaid"                 BOOLEAN,
    "isassigned"             BOOLEAN,
    "displaystatus"          TEXT,
    "displayslotdate"        DATE,
    "displaystarttime"       TIME,
    "displayendtime"         TIME,
    "displayarenaname"       TEXT,
    "requestedslotdate"      DATE,
    "requestedstarttime"     TIME,
    "requestedendtime"       TIME,
    "requestedarenaname"     TEXT,
    "assignedslotdate"       DATE,
    "assignedslotstarttime"  TIME,
    "assignedslotendtime"    TIME,
    "assignedarenaname"      TEXT,
    "notes"                  TEXT,
    "status"                 TEXT,
    "createdat"              TIMESTAMP WITH TIME ZONE,
    "ispaidtimerequestid"    INTEGER,
    "hoursuntilstart"        NUMERIC,
    "canmodify"              BOOLEAN,
    "cancancel"              BOOLEAN,
    "batchid"                INTEGER,
    "horseid"                INTEGER,
    "coachfederationmemberid" INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    RETURN QUERY
    WITH base AS (
        SELECT
            ptr.paidtimerequestid,
            h.horseid,
            h.horsename::TEXT          AS horsename,
            h.barnname::TEXT           AS barnname,
            CASE
                WHEN coach_p.personid IS NULL THEN NULL
                ELSE (coach_p.firstname || ' ' || coach_p.lastname)::TEXT
            END                        AS coachname,
            sr.coachfederationmemberid,
            (payer_p.firstname || ' ' || payer_p.lastname)::TEXT AS payername,
            p.productname::TEXT        AS productname,
            pc.itemprice               AS amounttopay,
            (sr.paymentid IS NOT NULL) AS ispaid,
            (ptr.assignedcompslotid IS NOT NULL) AS isassigned,
            ptr.status::TEXT           AS status,
            ptr.notes::TEXT            AS notes,
            sr.srequestdatetime        AS createdat,
            ptr.batchid                AS batchid,

            req_slot.slotdate          AS req_date,
            req_slot.starttime         AS req_start,
            req_slot.endtime           AS req_end,
            req_arena.arenaname::TEXT  AS req_arena,

            ass_slot.slotdate          AS ass_date,
            ass_slot.starttime         AS ass_start,
            ass_slot.endtime           AS ass_end,
            ass_arena.arenaname::TEXT  AS ass_arena,
            ptr.assignedstarttime      AS assigned_ts

        FROM paidtimerequest ptr
        INNER JOIN servicerequest sr ON sr.srequestid = ptr.paidtimerequestid
        INNER JOIN horse h ON h.horseid = sr.horseid
        LEFT JOIN federationmember coach_fm ON coach_fm.federationmemberid = sr.coachfederationmemberid
        LEFT JOIN person coach_p ON coach_p.personid = coach_fm.federationmemberid
        INNER JOIN bill b ON b.billid = sr.billid
        INNER JOIN person payer_p ON payer_p.personid = b.paidbypersonid
        INNER JOIN pricecatalog pc ON pc.pricecatalogid = ptr.pricecatalogid
        INNER JOIN product p ON p.productid = pc.productid
        INNER JOIN paidtimeslotincompetition req_slot ON req_slot.paidtimeslotincompid = ptr.requestedcompslotid
        INNER JOIN arena req_arena
            ON req_arena.ranchid = req_slot.arenaranchid
           AND req_arena.arenaid = req_slot.arenaid
        LEFT JOIN paidtimeslotincompetition ass_slot ON ass_slot.paidtimeslotincompid = ptr.assignedcompslotid
        LEFT JOIN arena ass_arena
            ON ass_arena.ranchid = ass_slot.arenaranchid
           AND ass_arena.arenaid = ass_slot.arenaid
        WHERE req_slot.competitionid = p_CompetitionId
          AND sr.orderedbysystemuserid = p_OrderedBySystemUserId
    )
    SELECT
        b.paidtimerequestid,
        b.horsename,
        b.barnname,
        b.coachname,
        b.payername,
        b.productname,
        b.amounttopay,
        b.ispaid,
        b.isassigned,
        CASE
            WHEN b.status = 'Cancelled' THEN 'בוטל'
            WHEN b.isassigned             THEN 'משובץ'
            WHEN b.status = 'Pending'     THEN 'ממתין לשיבוץ'
            ELSE b.status
        END AS displaystatus,
        COALESCE(b.ass_date,  b.req_date)   AS displayslotdate,
        COALESCE(b.ass_start, b.req_start)  AS displaystarttime,
        COALESCE(b.ass_end,   b.req_end)    AS displayendtime,
        COALESCE(b.ass_arena, b.req_arena)  AS displayarenaname,
        b.req_date,
        b.req_start,
        b.req_end,
        b.req_arena,
        b.ass_date,
        b.ass_start,
        b.ass_end,
        b.ass_arena,
        b.notes,
        b.status,
        b.createdat,
        b.paidtimerequestid AS ispaidtimerequestid,
        ROUND(
            EXTRACT(EPOCH FROM (
                COALESCE(
                    b.assigned_ts,
                    (b.req_date + b.req_start)::TIMESTAMP WITH TIME ZONE
                ) - v_now
            )) / 3600.0,
            2
        ) AS hoursuntilstart,
        (
            NOT b.ispaid
            AND b.status <> 'Cancelled'
            AND EXTRACT(EPOCH FROM (
                COALESCE(
                    b.assigned_ts,
                    (b.req_date + b.req_start)::TIMESTAMP WITH TIME ZONE
                ) - v_now
            )) / 3600.0 > 24
        ) AS canmodify,
        (
            NOT b.ispaid
            AND b.status <> 'Cancelled'
        ) AS cancancel,
        b.batchid,
        b.horseid,
        b.coachfederationmemberid
    FROM base b
    ORDER BY
        COALESCE(b.ass_date,  b.req_date),
        COALESCE(b.ass_start, b.req_start),
        b.createdat;
END;
$$;
