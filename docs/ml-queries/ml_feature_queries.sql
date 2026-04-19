-- ============================================================
-- RideOn Smart Prediction — ML Feature Queries
-- הרץ כל שאילתה בנפרד ב-Supabase SQL Editor
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- שאילתה 1: סיכום מבנה הפיצ'רים — כמה פיצ'רים יש בכל קטגוריה
-- ════════════════════════════════════════════════════════════
SELECT
    'זמן'         AS "קטגוריה",
    4             AS "מספר פיצ'רים",
    'שנה, חודש, עונה, יום בשבוע'       AS "פיצ'רים",
    'competition'                         AS "טבלת מקור"

UNION ALL SELECT
    'תחרות', 4,
    'ענף, חווה מארחת, משך (ימים), סך מקצים בתחרות',
    'competition + field + ranch'

UNION ALL SELECT
    'מקצה', 5,
    'שם מקצה, אוקלוסיה, יש פרס כספי, עלות ארגון, מיקום בלו"ז',
    'classincompetition + classtype + classprize'

UNION ALL SELECT
    'היסטוריה', 4,
    'כניסות שנה שעברה, ממוצע 3 שנים, חציון היסטורי, מגמה עלייה/ירידה',
    'entry (aggregated)'

UNION ALL SELECT
    '─────────', NULL, '─────────────────────────────', '──────────'

UNION ALL SELECT
    'סה"כ', 17, 'פיצ''רים ל-Training', 'TARGET: COUNT(entry)';


-- ════════════════════════════════════════════════════════════
-- שאילתה 2: TOP 5 שורות של ה-Dataset המלא
-- כל שורה = תחרות-מקצה אחד עם כל הפיצ'רים + מטרה
-- ════════════════════════════════════════════════════════════
WITH entry_counts AS (
    -- Target variable: כמה כניסות הגיעו לכל מקצה
    SELECT
        classincompid,
        COUNT(*) AS actual_entries_count
    FROM entry
    GROUP BY classincompid
),
class_prizes AS (
    -- האם יש פרס כספי למקצה
    SELECT
        cp.classincompid,
        MAX(cp.prizeamount)          AS top_prize_amount,
        COUNT(cp.prizetypeid)        AS prize_type_count,
        CASE WHEN MAX(cp.prizeamount) > 0 THEN true ELSE false END AS has_cash_prize
    FROM classprize cp
    GROUP BY cp.classincompid
),
comp_class_count AS (
    -- כמה מקצים יש בסך הכל בתחרות
    SELECT
        competitionid,
        COUNT(*) AS total_classes_in_competition
    FROM classincompetition
    GROUP BY competitionid
)
SELECT
    -- ─── פיצ'רים: זמן ─────────────────────────
    EXTRACT(YEAR  FROM c.competitionstartdate)::int      AS "שנה",
    EXTRACT(MONTH FROM c.competitionstartdate)::int      AS "חודש",
    CASE
        WHEN EXTRACT(MONTH FROM c.competitionstartdate) IN (12,1,2) THEN 'חורף'
        WHEN EXTRACT(MONTH FROM c.competitionstartdate) IN (3,4,5)  THEN 'אביב'
        WHEN EXTRACT(MONTH FROM c.competitionstartdate) IN (6,7,8)  THEN 'קיץ'
        ELSE 'סתיו'
    END                                                  AS "עונה",
    TRIM(TO_CHAR(cic.classdatetime, 'Day'))              AS "יום בשבוע",

    -- ─── פיצ'רים: תחרות ───────────────────────
    f.fieldname                                          AS "ענף",
    r.ranchname                                          AS "חווה מארחת",
    (c.competitionenddate - c.competitionstartdate)      AS "משך תחרות (ימים)",
    cc.total_classes_in_competition                      AS "סך מקצים בתחרות",

    -- ─── פיצ'רים: מקצה ────────────────────────
    ct.classname                                         AS "שם מקצה",
    COALESCE(ct.qualificationdescription, 'כללי')       AS "אוקלוסיה",
    COALESCE(cp.has_cash_prize, false)                   AS "פרס כספי",
    COALESCE(cic.organizercost, 0)                       AS "עלות ארגון (₪)",
    cic.orderinday                                       AS "מיקום בלו''ז",

    -- ─── TARGET VARIABLE ──────────────────────
    COALESCE(ec.actual_entries_count, 0)                 AS "🎯 כניסות בפועל (TARGET)"

FROM classincompetition      cic
JOIN competition             c   ON c.competitionid  = cic.competitionid
JOIN classtype               ct  ON ct.classtypeid   = cic.classtypeid
JOIN field                   f   ON f.fieldid        = ct.fieldid
JOIN ranch                   r   ON r.ranchid        = c.hostranchid
JOIN comp_class_count        cc  ON cc.competitionid = c.competitionid
LEFT JOIN entry_counts       ec  ON ec.classincompid = cic.classincompid
LEFT JOIN class_prizes       cp  ON cp.classincompid = cic.classincompid

WHERE ec.actual_entries_count IS NOT NULL   -- רק מקצים עם נתונים היסטוריים

ORDER BY c.competitionstartdate DESC, cic.orderinday

LIMIT 5;


-- ════════════════════════════════════════════════════════════
-- שאילתה 3: פיצ'רים היסטוריים — ממוצע, חציון, מגמה לכל סוג מקצה
-- אלה הפיצ'רים החזקים ביותר לפי המודל
-- ════════════════════════════════════════════════════════════
WITH class_history AS (
    SELECT
        ct.classtypeid,
        ct.classname                                          AS "שם מקצה",
        f.fieldname                                          AS "ענף",
        EXTRACT(YEAR FROM c.competitionstartdate)::int       AS competition_year,
        COUNT(e.entryid)                                     AS entries_that_year
    FROM classincompetition  cic
    JOIN competition         c   ON c.competitionid  = cic.competitionid
    JOIN classtype           ct  ON ct.classtypeid   = cic.classtypeid
    JOIN field               f   ON f.fieldid        = ct.fieldid
    LEFT JOIN entry          e   ON e.classincompid  = cic.classincompid
    GROUP BY ct.classtypeid, ct.classname, f.fieldname,
             EXTRACT(YEAR FROM c.competitionstartdate)
)
SELECT
    "שם מקצה",
    "ענף",
    COUNT(*)                                        AS "מס' שנים בהיסטוריה",
    ROUND(AVG(entries_that_year), 1)               AS "ממוצע כניסות (כל שנים)",
    ROUND(PERCENTILE_CONT(0.5)
          WITHIN GROUP (ORDER BY entries_that_year)
    , 1)                                            AS "חציון כניסות",
    MAX(entries_that_year)                          AS "מקסימום",
    MIN(entries_that_year)                          AS "מינימום",
    -- מגמה: השוואה בין ממוצע שנתיים אחרונות לממוצע כולל
    CASE
        WHEN AVG(entries_that_year) = 0 THEN 'ללא נתונים'
        WHEN (
            SELECT AVG(h2.entries_that_year)
            FROM class_history h2
            WHERE h2.classtypeid = class_history.classtypeid
              AND h2.competition_year >= (SELECT MAX(competition_year) - 1
                                         FROM class_history h3
                                         WHERE h3.classtypeid = class_history.classtypeid)
        ) > AVG(entries_that_year) THEN '↑ עלייה'
        WHEN (
            SELECT AVG(h2.entries_that_year)
            FROM class_history h2
            WHERE h2.classtypeid = class_history.classtypeid
              AND h2.competition_year >= (SELECT MAX(competition_year) - 1
                                         FROM class_history h3
                                         WHERE h3.classtypeid = class_history.classtypeid)
        ) < AVG(entries_that_year) THEN '↓ ירידה'
        ELSE '→ יציב'
    END                                             AS "מגמה"

FROM class_history
GROUP BY classtypeid, "שם מקצה", "ענף"
HAVING COUNT(*) >= 1
ORDER BY "ממוצע כניסות (כל שנים)" DESC
LIMIT 5;


-- ════════════════════════════════════════════════════════════
-- שאילתה 4: הוכחת קיום דאטא — כמה רשומות יש לכל תחרות
-- מראה שהמאגר מכיל היסטוריה אמיתית לאימון המודל
-- ════════════════════════════════════════════════════════════
SELECT
    c.competitionname                                      AS "שם תחרות",
    TO_CHAR(c.competitionstartdate, 'DD/MM/YYYY')         AS "תאריך",
    f.fieldname                                            AS "ענף",
    r.ranchname                                            AS "חווה מארחת",
    COUNT(DISTINCT cic.classincompid)                      AS "מקצים",
    COUNT(e.entryid)                                       AS "סה''כ כניסות",
    ROUND(COUNT(e.entryid)::numeric /
          NULLIF(COUNT(DISTINCT cic.classincompid), 0), 1) AS "ממוצע כניסות למקצה"

FROM competition         c
JOIN field               f   ON f.fieldid   = c.fieldid
JOIN ranch               r   ON r.ranchid   = c.hostranchid
JOIN classincompetition  cic ON cic.competitionid = c.competitionid
LEFT JOIN entry          e   ON e.classincompid   = cic.classincompid

GROUP BY c.competitionid, c.competitionname, c.competitionstartdate,
         f.fieldname, r.ranchname

HAVING COUNT(e.entryid) > 0    -- רק תחרויות עם נתוני כניסות

ORDER BY c.competitionstartdate DESC

LIMIT 5;
