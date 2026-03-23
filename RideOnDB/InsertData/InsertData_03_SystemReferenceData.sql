USE RideOn;
GO

/* =========================================================
   InsertData_03_SystemReferenceData.sql
   כולל:
   - ProductCategory
   - Product
   - PaidTimeProduct
   - Field
   - Maneuver
   - Pattern
   - PatternManeuver
   - Judge
   - PrizeType
   - PaymentMethod
   - Fine
   - PaidTimeSlot
   - JudgeField
   - ClassType
   ========================================================= */

INSERT INTO ProductCategory (CategoryName)
VALUES
(N'פייד טיים'),
(N'תאים'),
(N'נסורת');
GO

INSERT INTO Product (CategoryId, ProductName)
SELECT pc.CategoryId, v.ProductName
FROM (VALUES
    (N'פייד טיים', N'פייד טיים קצר'),
    (N'פייד טיים', N'פייד טיים ארוך'),
    (N'תאים',      N'תא רגיל'),
    (N'תאים',      N'תא משודרג'),
    (N'נסורת',     N'שק נסורת רגיל')
) AS v(CategoryName, ProductName)
JOIN ProductCategory pc
    ON pc.CategoryName = v.CategoryName
WHERE NOT EXISTS (
    SELECT 1
    FROM Product p
    WHERE p.ProductName = v.ProductName
);
GO

INSERT INTO PaidTimeProduct (ProductId, DurationMinutes)
SELECT p.ProductId, v.DurationMinutes
FROM (VALUES
    (N'פייד טיים קצר', 7),
    (N'פייד טיים ארוך', 10)
) AS v(ProductName, DurationMinutes)
JOIN Product p
    ON p.ProductName = v.ProductName
WHERE NOT EXISTS (
    SELECT 1
    FROM PaidTimeProduct ptp
    WHERE ptp.ProductId = p.ProductId
);
GO


INSERT INTO Field (FieldName)
VALUES
(N'ריינינג'),
(N'קאטינג'),
(N'אולארונד'),
(N'אקסטרים'),
(N'קפיצות'),
(N'דרסז');
GO


INSERT INTO Pattern (PatternNumber)
VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18);
GO


INSERT INTO Maneuver (ManeuverName, ManeuverDescription)
VALUES
(N'RS', N'ספין ימין'),
(N'LS', N'ספין שמאל'),
(N'SB', N'עצירה והליכה אחורה'),
(N'8', N'סט החלפות לשני הצדדים'),
(N'RC', N'מעגלים ימינה'),
(N'LC', N'מעגלים שמאלה'),
(N'RRB', N'עצירה ורולבק ימינה'),
(N'LRB', N'עצירה ורולבק שמאלה'),
(N'S', N'עצירה');
GO



INSERT INTO PatternManeuver
(
    PatternNumber,
    ManeuverId,
    [Order]
)
SELECT
    v.PatternNumber,
    m.ManeuverId,
    v.[Order]
FROM
(
    VALUES
    /* Pattern 1 */
    (1, N'LRB', 1),
    (1, N'RRB', 2),
    (1, N'SB',  3),
    (1, N'RS',  4),
    (1, N'LS',  5),
    (1, N'LC',  6),
    (1, N'RC',  7),
    (1, N'S',   8),

    /* Pattern 2 */
    (2, N'RC',  1),
    (2, N'LC',  2),
    (2, N'RRB', 3),
    (2, N'LRB', 4),
    (2, N'SB',  5),
    (2, N'RS',  6),
    (2, N'LS',  7),

    /* Pattern 3 */
    (3, N'LRB', 1),
    (3, N'RRB', 2),
    (3, N'RC',  3),
    (3, N'LC',  4),
    (3, N'SB',  5),
    (3, N'RS',  6),
    (3, N'LS',  7),

    /* Pattern 4 */
    (4, N'RC',  1),
    (4, N'RS',  2),
    (4, N'LC',  3),
    (4, N'LS',  4),
    (4, N'8',   5),
    (4, N'RRB', 6),
    (4, N'LRB', 7),
    (4, N'SB',  8),

    /* Pattern 5 */
    (5, N'LC',  1),
    (5, N'LS',  2),
    (5, N'RC',  3),
    (5, N'RS',  4),
    (5, N'8',   5),
    (5, N'RRB', 6),
    (5, N'LRB', 7),
    (5, N'SB',  8),

    /* Pattern 6 */
    (6, N'RS',  1),
    (6, N'LS',  2),
    (6, N'LC',  3),
    (6, N'RC',  4),
    (6, N'RRB', 5),
    (6, N'LRB', 6),
    (6, N'SB',  7),

    /* Pattern 7 */
    (7, N'LRB', 1),
    (7, N'RRB', 2),
    (7, N'SB',  3),
    (7, N'RS',  4),
    (7, N'LS',  5),
    (7, N'RC',  6),
    (7, N'LC',  7),
    (7, N'S',   8),

    /* Pattern 8 */
    (8, N'LS',  1),
    (8, N'RS',  2),
    (8, N'RC',  3),
    (8, N'LC',  4),
    (8, N'LRB', 5),
    (8, N'RRB', 6),
    (8, N'SB',  7),

    /* Pattern 9 */
    (9, N'SB',  1),
    (9, N'RS',  2),
    (9, N'LS',  3),
    (9, N'LC',  4),
    (9, N'RC',  5),
    (9, N'RRB', 6),
    (9, N'LRB', 7),
    (9, N'S',   8),

    /* Pattern 10 */
    (10, N'SB',  1),
    (10, N'RS',  2),
    (10, N'LS',  3),
    (10, N'RC',  4),
    (10, N'LC',  5),
    (10, N'LRB', 6),
    (10, N'RRB', 7),
    (10, N'S',   8),

    /* Pattern 11 */
    (11, N'LS',  1),
    (11, N'RS',  2),
    (11, N'RC',  3),
    (11, N'LC',  4),
    (11, N'RRB', 5),
    (11, N'LRB', 6),
    (11, N'SB',  7),

    /* Pattern 12 */
    (12, N'SB',  1),
    (12, N'RS',  2),
    (12, N'LS',  3),
    (12, N'LC',  4),
    (12, N'RC',  5),
    (12, N'RRB', 6),
    (12, N'LRB', 7),
    (12, N'S',   8),

    /* Pattern 13 */
    (13, N'LC',  1),
    (13, N'LS',  2),
    (13, N'RC',  3),
    (13, N'RS',  4),
    (13, N'8',   5),
    (13, N'RRB', 6),
    (13, N'LRB', 7),
    (13, N'SB',  8),

    /* Pattern 14 */
    (14, N'LS',  1),
    (14, N'RS',  2),
    (14, N'RC',  3),
    (14, N'LC',  4),
    (14, N'LRB', 5),
    (14, N'RRB', 6),
    (14, N'SB',  7),

    /* Pattern 15 */
    (15, N'RS',  1),
    (15, N'LS',  2),
    (15, N'LC',  3),
    (15, N'RC',  4),
    (15, N'RRB', 5),
    (15, N'LRB', 6),
    (15, N'SB',  7),

    /* Pattern 16 */
    (16, N'SB',  1),
    (16, N'LS',  2),
    (16, N'RS',  3),
    (16, N'RC',  4),
    (16, N'LC',  5),
    (16, N'LRB', 6),
    (16, N'RRB', 7),
    (16, N'S',   8),

    /* Pattern 17 */
    (17, N'LC',  1),
    (17, N'LS',  2),
    (17, N'RC',  3),
    (17, N'RS',  4),
    (17, N'8',   5),
    (17, N'RRB', 6),
    (17, N'LRB', 7),
    (17, N'SB',  8),

    /* Pattern 18 */
    (18, N'LC',  1),
    (18, N'LS',  2),
    (18, N'RC',  3),
    (18, N'RS',  4),
    (18, N'8',   5),
    (18, N'RRB', 6),
    (18, N'LRB', 7),
    (18, N'SB',  8)
) AS v(PatternNumber, ManeuverName, [Order])
JOIN Maneuver m
    ON m.ManeuverName = v.ManeuverName
ORDER BY v.PatternNumber, v.[Order];
GO


INSERT INTO Judge
(FirstNameHebrew, LastNameHebrew, FirstNameEnglish, LastNameEnglish, Country)
VALUES
(N'תרזה', N'סאליבן', N'Teresa', N'Sullivan', NULL),
(N'סילביה', N'קצ''קר', N'Sylvia', N'Katschker', NULL),
(N'שחר', N'חשוב', N'Shchar', N'Hashuv', N'ישראל'),
(N'שרון', N'שכטמן', N'Sharon', N'Shechtman', N'ישראל'),
(N'שי', N'קנטי', N'Shai', N'Kaneti', N'ישראל'),
(N'ניצן', N'פלג', N'Nitzan', N'Peleg', N'ישראל'),
(N'ריקי', N'בורדיניון', N'Ricky', N'Bordignon', NULL),
(N'לינדה', N'לונג', N'Linda', N'Long', NULL),
(N'פרנסואה', N'גוטייה', N'Francois', N'Gauthier', NULL);
GO


INSERT INTO PrizeType (PrizeTypeName, PrizeDescription)
VALUES
(N'שובר', N'שובר קניה באחת מחנויות ציוד סוסים'),
(N'ג''קפוט', N'כסף אשר נאסף מתוך התשלום על המקצה והולך לטובת פרס שנאסף בכיתה'),
(N'כסף מוסף', N'סכום כסף שמוגדר מראש שהולך כולו לטובת הפרס בכיתה');
GO


INSERT INTO PaymentMethod (PaymentMethodType)
VALUES
(N'אשראי'),
(N'מזומן'),
(N'העברה בנקאית'),
(N'צ''ק');
GO


INSERT INTO PaidTimeSlot (DayOfWeek, TimeOfDay)
VALUES
(N'ראשון', N'בוקר'),
(N'ראשון', N'צהריים'),
(N'ראשון', N'ערב'),

(N'שני', N'בוקר'),
(N'שני', N'צהריים'),
(N'שני', N'ערב'),

(N'שלישי', N'בוקר'),
(N'שלישי', N'צהריים'),
(N'שלישי', N'ערב'),

(N'רביעי', N'בוקר'),
(N'רביעי', N'צהריים'),
(N'רביעי', N'ערב'),

(N'חמישי', N'בוקר'),
(N'חמישי', N'צהריים'),
(N'חמישי', N'ערב'),

(N'שישי', N'בוקר'),
(N'שישי', N'צהריים'),
(N'שישי', N'ערב'),

(N'שבת', N'בוקר'),
(N'שבת', N'צהריים'),
(N'שבת', N'ערב');
GO


INSERT INTO JudgeField (JudgeId, FieldId)
SELECT
    j.JudgeId,
    f.FieldId
FROM (VALUES
    (N'תרזה',    N'סאליבן',    N'אולארונד'),
    (N'סילביה',  N'קצ''קר',    N'אולארונד'),
    (N'שחר',     N'חשוב',      N'אקסטרים'),
    (N'שחר',     N'חשוב',      N'קאטינג'),
    (N'שרון',    N'שכטמן',     N'אקסטרים'),
    (N'שי',      N'קנטי',      N'אקסטרים'),
    (N'שי',      N'קנטי',      N'קאטינג'),
    (N'ניצן',    N'פלג',       N'קאטינג'),
    (N'ריקי',    N'בורדיניון', N'ריינינג'),
    (N'לינדה',   N'לונג',      N'ריינינג'),
    (N'פרנסואה', N'גוטייה',    N'ריינינג')
) AS v(FirstNameHebrew, LastNameHebrew, FieldName)
JOIN Judge j
    ON j.FirstNameHebrew = v.FirstNameHebrew
   AND j.LastNameHebrew  = v.LastNameHebrew
JOIN Field f
    ON f.FieldName = v.FieldName
WHERE NOT EXISTS (
    SELECT 1
    FROM JudgeField jf
    WHERE jf.JudgeId = j.JudgeId
      AND jf.FieldId = f.FieldId
);
GO


INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
SELECT
    f.FieldId,
    v.ClassName,
    v.JudgingSheetFormat,
    v.QualificationDescription
FROM (VALUES
    (N'ריינינג', N'פתוח לא מוגבל', NULL, NULL),
    (N'ריינינג', N'ירוקי התאחדות', NULL, NULL),
    (N'ריינינג', N'ירוקי רוכב חדש התאחדות', NULL, NULL),
    (N'ריינינג', N'נוער ירוקי התאחדות', NULL, NULL),
    (N'ריינינג', N'Unrestricted Youth NRHA', NULL, NULL),
    (N'ריינינג', N'נונ פרו 50+', NULL, NULL),
    (N'ריינינג', N'Open NRHA', NULL, NULL),
    (N'ריינינג', N'Limited Open NRHA', NULL, NULL),
    (N'ריינינג', N'Novice Horse Open Level 1 NRHA', NULL, NULL),
    (N'ריינינג', N'נוביס התאחדות', NULL, NULL),
    (N'ריינינג', N'נוביס נונ פרו התאחדות', NULL, NULL),
    (N'ריינינג', N'Non Pro NRHA', NULL, NULL),
    (N'ריינינג', N'Limited Non Pro NRHA', NULL, NULL),
    (N'ריינינג', N'Prime Time Non Pro NRHA', NULL, NULL),
    (N'ריינינג', N'Youth 14-18 NRHA', NULL, NULL),
    (N'ריינינג', N'Youth 13 & Under NRHA', NULL, NULL)
) AS v(FieldName, ClassName, JudgingSheetFormat, QualificationDescription)
JOIN Field f
    ON f.FieldName = v.FieldName
WHERE NOT EXISTS (
    SELECT 1
    FROM ClassType ct
    WHERE ct.FieldId = f.FieldId
      AND ct.ClassName = v.ClassName
);
GO


INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
SELECT
    f.FieldId,
    v.ClassName,
    v.JudgingSheetFormat,
    v.QualificationDescription
FROM (VALUES
    (N'קאטינג', N'קאו הורס נונ פרו', NULL, NULL),
    (N'קאטינג', N'קאטינג פתוח', NULL, NULL),
    (N'קאטינג', N'קאטינג פתוח NCHA', NULL, NULL),
    (N'קאטינג', N'קאטינג נונ פרו', NULL, NULL),
    (N'קאטינג', N'קאטינג נונ פרו NCHA', NULL, NULL),
    (N'קאטינג', N'קאטינג נוביס', NULL, NULL),
    (N'קאטינג', N'קאטינג נוביס נונ פרו', NULL, NULL),
    (N'קאטינג', N'קאטינג נוביס פרימיום', NULL, NULL),
    (N'קאטינג', N'קאטינג נוביס פרימיום נונ פרו', NULL, NULL),
    (N'קאטינג', N'קאו הורס פתוח', NULL, NULL),
    (N'קאטינג', N'קאטינג נונ פרו פלאטינום', NULL, NULL),
    (N'קאטינג', N'NCHA 2000 Limit Rider', NULL, NULL),
    (N'קאטינג', N'קאטינג נונ פרו מוגבל', NULL, NULL),
    (N'קאטינג', N'קאטינג נוער', NULL, NULL),
    (N'קאטינג', N'קאטינג נוער NCHA', NULL, NULL),
    (N'קאטינג', N'קאטינג נוער ירוקי עד 18', NULL, NULL),
    (N'קאטינג', N'קאטינג נוער ירוקי עד 15', NULL, NULL),
    (N'קאטינג', N'קאטינג ירוקי בוגרים', NULL, NULL),
    (N'קאטינג', N'קאטינג ירוקי 40+', NULL, NULL)
) AS v(FieldName, ClassName, JudgingSheetFormat, QualificationDescription)
JOIN Field f
    ON f.FieldName = v.FieldName
WHERE NOT EXISTS (
    SELECT 1
    FROM ClassType ct
    WHERE ct.FieldId = f.FieldId
      AND ct.ClassName = v.ClassName
);
GO


INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
SELECT
    f.FieldId,
    v.ClassName,
    v.JudgingSheetFormat,
    v.QualificationDescription
FROM (VALUES
    (N'אקסטרים', N'אקסטרים קאובוי פתוח מוגבל - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי פתוח  - IEF', NULL, NULL),
    (N'אקסטרים', N'Youth EXCA', NULL, NULL),
    (N'אקסטרים', N'Intermediate EXCA', NULL, NULL),
    (N'אקסטרים', N'אקס'' קאובוי - ראנג'' סורטינג נונפרו', NULL, NULL),
    (N'אקסטרים', N'אקס'' קאובוי - ראנג'' סורטינג פתוח', NULL, NULL),
    (N'אקסטרים', N'אקס'' קאובוי עד 18 ירוקי רוכב חדש - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי עד 18 ירוקי - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נוער עד גיל 12 IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי רוכב ירוקי - IEF', NULL, NULL),
    (N'אקסטרים', N'אקס'' קאובוי רוכב ירוקי רוכב חדש - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נונ פרו מוגבל IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נוער עד 18 מוגבל IEF', NULL, NULL),
    (N'אקסטרים', N'NONPRO EXCA', NULL, NULL),
    (N'אקסטרים', N'PRO EXCA', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נוביס  - IEF', NULL, NULL),
    (N'אקסטרים', N'Young Gun EXCA', NULL, NULL),
    (N'אקסטרים', N'אקס'' קאובוי עד15 ירוקי רוכב חדש - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי עד 15 ירוקי - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נוער עד גיל 18 - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נוער עד גיל 15 - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נונ פרו 40+ - IEF', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי נונ פרו  - IEF', NULL, NULL),
    (N'אקסטרים', N'OPEN EXCA', NULL, NULL),
    (N'אקסטרים', N'Novice EXCA', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי - נוביס נונ פרו', NULL, NULL),
    (N'אקסטרים', N'אקסטרים קאובוי עד 12 ירוקי - IEF', NULL, NULL)
) AS v(FieldName, ClassName, JudgingSheetFormat, QualificationDescription)
JOIN Field f
    ON f.FieldName = v.FieldName
WHERE NOT EXISTS (
    SELECT 1
    FROM ClassType ct
    WHERE ct.FieldId = f.FieldId
      AND ct.ClassName = v.ClassName
);
GO


INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
SELECT
    f.FieldId,
    v.ClassName,
    v.JudgingSheetFormat,
    v.QualificationDescription
FROM (VALUES
    (N'אולארונד', N'מקצה אימון טרייל', NULL, NULL),
    (N'אולארונד', N'טרייל פתוח', NULL, NULL),
    (N'אולארונד', N'טרייל  עד 18', NULL, NULL),
    (N'אולארונד', N'טרייל ירוקי עד 15', NULL, NULL),
    (N'אולארונד', N'מקצה אימון הורסמנשיפ', NULL, NULL),
    (N'אולארונד', N'מקצה אימון פלז''ר', NULL, NULL),
    (N'אולארונד', N'הליכה ג''וג עד גיל 18', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ הליכה ג''וג עד גיל 18', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ ירוקי עד 18', NULL, NULL),
    (N'אולארונד', N'האנט סיט אקוויטיישן פתוח', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל פתוח', NULL, NULL),
    (N'אולארונד', N'האנט סיט אקוויטיישן עד גיל 18', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל עד גיל 18', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל ירוקי עד 18', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל עד גיל 15', NULL, NULL),
    (N'אולארונד', N'האנט סיט אקוויטיישן ירוקי עד 15', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל ירוקי עד 15', NULL, NULL),
    (N'אולארונד', N'האנט סיט אקוויטיישן עד גיל 13', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל עד גיל 13', NULL, NULL),
    (N'אולארונד', N'האנטר אנדר סאדל 13 ירוקי', NULL, NULL),
    (N'אולארונד', N'טרייל נונ פרו', NULL, NULL),
    (N'אולארונד', N'טרייל פתוח לסוסי נוביס', NULL, NULL),
    (N'אולארונד', N'טרייל ירוקי עד 18', NULL, NULL),
    (N'אולארונד', N'טרייל הליכה ג''וג עד גיל 18', NULL, NULL),
    (N'אולארונד', N'טרייל עד גיל 13', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ פתוח', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ ירוקי בוגרים', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ ירוקי עד 13', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ עד 15', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ נוביס נוער', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ עד גיל 10', NULL, NULL),
    (N'אולארונד', N'פלז''ר נונ פרו', NULL, NULL),
    (N'אולארונד', N'פלזר נונפרו 40+ הליכה גוג', NULL, NULL),
    (N'אולארונד', N'הליכה ג''וג עד גיל 10', NULL, NULL),
    (N'אולארונד', N'פלז''ר ירוקי בוגרים', NULL, NULL),
    (N'אולארונד', N'פלז''ר פתוח לסוסי נוביס', NULL, NULL),
    (N'אולארונד', N'פלז''ר עד 18', NULL, NULL),
    (N'אולארונד', N'פלז''ר ירוקי עד 15', NULL, NULL),
    (N'אולארונד', N'הליכה ג''וג סירקט עד 13', NULL, NULL),
    (N'אולארונד', N'פלז''ר עד גיל 13', NULL, NULL),
    (N'אולארונד', N'שואומנשיפ', NULL, NULL),
    (N'אולארונד', N'שואומנשיפ  ירוקי', NULL, NULL),
    (N'אולארונד', N'טרייל נוביס נוער', NULL, NULL),
    (N'אולארונד', N'טרייל עד  15', NULL, NULL),
    (N'אולארונד', N'טרייל ירוקי בוגרים', NULL, NULL),
    (N'אולארונד', N'טרייל ירוקי עד 13', NULL, NULL),
    (N'אולארונד', N'טרייל עד גיל 10', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ נונ פרו', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ פתוח לסוסי נוביס', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ ונפרו 40+ הליכה גוג', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ עד 18', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ ירוקי עד 15', NULL, NULL),
    (N'אולארונד', N'הורסמנשיפ עד גיל 13', NULL, NULL),
    (N'אולארונד', N'פלז''ר פתוח', NULL, NULL),
    (N'אולארונד', N'פלזר נוביס נוער', NULL, NULL),
    (N'אולארונד', N'פלז''ר  ירוקי עד  18', NULL, NULL),
    (N'אולארונד', N'פלז''ר עד  15', NULL, NULL),
    (N'אולארונד', N'הליכה ג''וג עד גיל 13', NULL, NULL)
) AS v(FieldName, ClassName, JudgingSheetFormat, QualificationDescription)
JOIN Field f
    ON f.FieldName = v.FieldName
WHERE NOT EXISTS (
    SELECT 1
    FROM ClassType ct
    WHERE ct.FieldId = f.FieldId
      AND ct.ClassName = v.ClassName
);
GO

INSERT INTO Fine (FineName, FineDescription, FineAmount)
VALUES
(N'ביטול מקצה לאחר סיום ההרשמה', N'קנס על ביטול מקצה לאחר מועד סיום ההרשמה לתחרות ולפני תחילת התחרות', 50.00),
(N'רישום באיחור לאחר סיום ההרשמה', N'קנס על רישום שבוצע לאחר מועד סיום ההרשמה ולפני תחילת התחרות', 50.00),
(N'רישום באיחור לאחר תחילת התחרות', N'קנס על רישום שבוצע לאחר תחילת התחרות', 100.00),
(N'איבוד מספר', N'קנס על איבוד מספר סוס ויצירת מספר חדש', 50.00);
GO

