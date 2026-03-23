USE RideOn;
GO

   /* =========================================================
   InsertData_06_CompetitionSetup.sql
   כולל:
   - Competition
   - ClassInCompetition
   - ReiningType
   - ClassJudge
   - ClassPrize
   - PaidTimeSlotInCompetition
   ========================================================= */


/* =========================================================
	תחרות קאטינג		
   ========================================================= */
DECLARE @CompetitionId INT;

SELECT @CompetitionId = CompetitionId
FROM Competition
WHERE CompetitionName = N'תחרות קאטינג מס'' 4';

IF @CompetitionId IS NOT NULL
BEGIN
    DELETE cp
    FROM ClassPrize cp
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cp.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE cj
    FROM ClassJudge cj
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cj.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE FROM ClassInCompetition
    WHERE CompetitionId = @CompetitionId;

    DELETE FROM Competition
    WHERE CompetitionId = @CompetitionId;
END
GO

DECLARE @CompetitionId INT;

INSERT INTO Competition
(
    HostRanchId,
    FieldId,
    CreatedBySystemUserId,
    CompetitionName,
    CompetitionStartDate,
    CompetitionEndDate,
    RegistrationOpenDate,
    RegistrationEndDate,
    PaidTimeRegistrationDate,
    PaidTimePublicationDate,
    CompetitionStatus,
    Notes,
    StallMapUrl
)
VALUES
(
    11,                 -- דאבל קיי
    2,                  -- קאטינג
    622,                -- דניאל קנטי
    N'תחרות קאטינג מס'' 4',
    '2025-09-18',
    '2025-09-20',
    '2025-08-24',
    '2025-09-04',
    NULL,
    NULL,
    N'הסתיימה',
    N'תחרות קאטינג מס'' 4 בחוות דאבל קיי',
    NULL
);

SET @CompetitionId = SCOPE_IDENTITY();

INSERT INTO ClassInCompetition
(
    CompetitionId,
    ClassTypeId,
    ArenaRanchId,
    ArenaId,
    ClassDateTime,
    OrganizerCost,
    FederationCost,
    ClassNotes,
    StartTime,
    OrderInDay
)
VALUES
-- יום חמישי 18.09.2025
(@CompetitionId, 17, 11, 1, '2025-09-18 18:00:00', 170.00, 30.00, N'מסלול 2', '18:00', 1),

-- יום שישי 19.09.2025
(@CompetitionId, 18, 11, 5, '2025-09-19 17:30:00', 250.00, 30.00, NULL, '17:30', 2),
(@CompetitionId, 19, 11, 5, '2025-09-19 17:30:00', 300.00, 30.00, N'150 ¤ ג''קפוט נצבר לטובת קופת הפרס באליפות', '17:30', 3),

(@CompetitionId, 20, 11, 5, '2025-09-19 18:45:00', 250.00, 30.00, NULL, '18:45', 4),
(@CompetitionId, 21, 11, 5, '2025-09-19 18:45:00', 300.00, 30.00, NULL, '18:45', 5),

(@CompetitionId, 22, 11, 5, '2025-09-19 19:45:00', 220.00, 30.00, NULL, '19:45', 6),
(@CompetitionId, 23, 11, 5, '2025-09-19 20:45:00', 220.00, 30.00, NULL, '20:45', 7),
(@CompetitionId, 26, 11, 1, '2025-09-19 21:15:00', 170.00, 30.00, N'מסלול 2', '21:15', 8),

-- יום שבת 20.09.2025
(@CompetitionId, 27, 11, 5, '2025-09-20 08:00:00', 250.00, 30.00, NULL, '08:00', 9),
(@CompetitionId, 28, 11, 5, '2025-09-20 08:00:00', 300.00, 30.00, NULL, '08:00', 10),

(@CompetitionId, 30, 11, 5, '2025-09-20 08:15:00', 200.00, 30.00, NULL, '08:15', 11),
(@CompetitionId, 31, 11, 5, '2025-09-20 08:15:00', 250.00, 30.00, NULL, '08:15', 12),

(@CompetitionId, 32, 11, 5, '2025-09-20 09:00:00', 120.00, 30.00, NULL, '09:00', 13),
(@CompetitionId, 33, 11, 5, '2025-09-20 09:15:00', 120.00, 30.00, NULL, '09:15', 14),
(@CompetitionId, 34, 11, 5, '2025-09-20 10:00:00', 120.00, 30.00, NULL, '10:00', 15);

INSERT INTO ClassJudge (ClassInCompId, JudgeId)
SELECT
    cic.ClassInCompId,
    CASE
        WHEN cic.ClassTypeId IN (17, 26) THEN 5
        ELSE 6
    END
FROM ClassInCompetition cic
WHERE cic.CompetitionId = @CompetitionId;

INSERT INTO ClassPrize
(
    ClassInCompId,
    PrizeTypeId,
    PrizeAmount
)
SELECT
    cic.ClassInCompId,
    v.PrizeTypeId,
    v.PrizeAmount
FROM
(
    VALUES
    (17, 2, 100.00),   -- קאו הורס נונ פרו
    (19, 1, 2000.00),  -- קאטינג פתוח NCHA
    (21, 1, 2000.00),  -- קאטינג נונ פרו NCHA
    (26, 2, 100.00),   -- קאו הורס פתוח
    (28, 1, 1200.00),  -- NCHA 2000 Limit Rider
    (31, 1, 1200.00)   -- קאטינג נוער NCHA
) AS v(ClassTypeId, PrizeTypeId, PrizeAmount)
JOIN ClassInCompetition cic
    ON cic.ClassTypeId = v.ClassTypeId
   AND cic.CompetitionId = @CompetitionId;
GO


/* =========================================================
	תחרות אקסטרים		
   ========================================================= */


DECLARE @CompetitionId INT;

SELECT @CompetitionId = CompetitionId
FROM Competition
WHERE CompetitionName = N'תחרות אקסטרים קאובוי מס'' 4';

IF @CompetitionId IS NOT NULL
BEGIN

    DELETE cp
    FROM ClassPrize cp
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cp.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE cj
    FROM ClassJudge cj
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cj.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE FROM ClassInCompetition
    WHERE CompetitionId = @CompetitionId;

    DELETE FROM Competition
    WHERE CompetitionId = @CompetitionId;

END
GO

DECLARE @CompetitionId INT;

INSERT INTO Competition
(
HostRanchId,
FieldId,
CreatedBySystemUserId,
CompetitionName,
CompetitionStartDate,
CompetitionEndDate,
RegistrationOpenDate,
RegistrationEndDate,
PaidTimeRegistrationDate,
PaidTimePublicationDate,
CompetitionStatus,
Notes,
StallMapUrl
)
VALUES
(
11,
4,
622,
N'תחרות אקסטרים קאובוי מס'' 4',
'2025-06-12',
'2025-06-14',
'2025-05-15',
'2025-05-29',
NULL,
NULL,
N'עתידית',
N'ליגת אקסטרים 2025',
NULL
);

SET @CompetitionId = SCOPE_IDENTITY();

INSERT INTO ClassInCompetition
(
CompetitionId,
ClassTypeId,
ArenaRanchId,
ArenaId,
ClassDateTime,
OrganizerCost,
FederationCost,
ClassNotes,
StartTime,
OrderInDay
)
VALUES

-- חמישי

(@CompetitionId,36,11,1,'2025-06-12 07:45',250,50,NULL,'07:45',1),
(@CompetitionId,37,11,1,'2025-06-12 09:45',250,50,NULL,'09:45',2),
(@CompetitionId,38,11,1,'2025-06-12 11:45',200,50,NULL,'11:45',3),
(@CompetitionId,39,11,1,'2025-06-12 13:45',250,50,NULL,'13:45',4),

(@CompetitionId,43,11,4,'2025-06-12 07:45',200,50,N'רץ במגרש הלבן','07:45',5),
(@CompetitionId,44,11,4,'2025-06-12 10:30',200,50,N'רץ במגרש הלבן','10:30',6),

(@CompetitionId,40,11,1,'2025-06-12 17:45',115,50,NULL,'17:45',7),
(@CompetitionId,41,11,1,'2025-06-12 19:00',115,50,NULL,'19:00',8),

-- שישי

(@CompetitionId,59,11,4,'2025-06-13 07:30',250,50,NULL,'07:30',9),
(@CompetitionId,45,11,1,'2025-06-13 07:30',250,50,NULL,'07:30',10),

(@CompetitionId,61,11,4,'2025-06-13 11:55',250,50,NULL,'11:55',11),

(@CompetitionId,56,11,4,'2025-06-13 12:15',200,50,NULL,'12:15',12),

(@CompetitionId,54,11,4,'2025-06-13 10:15',200,50,NULL,'10:15',13),
(@CompetitionId,53,11,4,'2025-06-13 10:15',30,0,N'רוכב חדש','10:15',14),

(@CompetitionId,48,11,1,'2025-06-13 13:15',200,50,NULL,'13:15',15),

(@CompetitionId,49,11,1,'2025-06-13 14:45',250,50,NULL,'14:45',16),
(@CompetitionId,50,11,1,'2025-06-13 15:45',250,50,NULL,'15:45',17),

-- שבת

(@CompetitionId,60,11,4,'2025-06-14 07:45',250,50,NULL,'07:45',18),
(@CompetitionId,61,11,4,'2025-06-14 09:15',250,50,NULL,'09:15',19),

(@CompetitionId,62,11,4,'2025-06-14 12:00',200,50,NULL,'12:00',20),

(@CompetitionId,55,11,1,'2025-06-14 07:45',200,50,NULL,'07:45',21),
(@CompetitionId,56,11,1,'2025-06-14 09:30',200,50,NULL,'09:30',22),

(@CompetitionId,58,11,1,'2025-06-14 12:30',250,50,NULL,'12:30',23),
(@CompetitionId,57,11,1,'2025-06-14 12:30',50,50,N'רץ יחד עם נונ פרו','12:30',24),

(@CompetitionId,59,11,1,'2025-06-14 14:00',250,50,NULL,'14:00',25);

INSERT INTO ClassJudge (ClassInCompId,JudgeId)
SELECT
ClassInCompId,
4
FROM ClassInCompetition
WHERE CompetitionId = @CompetitionId;
GO

/* =========================================================
	תחרות אולארונד		
   ========================================================= */

   DECLARE @CompetitionId INT;

SELECT @CompetitionId = CompetitionId
FROM Competition
WHERE CompetitionName = N'תחרות אולאראונד 5';

IF @CompetitionId IS NOT NULL
BEGIN
    DELETE cp
    FROM ClassPrize cp
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cp.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE cj
    FROM ClassJudge cj
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cj.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE FROM ClassInCompetition
    WHERE CompetitionId = @CompetitionId;

    DELETE FROM Competition
    WHERE CompetitionId = @CompetitionId;
END
GO

DECLARE @CompetitionId INT;

INSERT INTO Competition
(
    HostRanchId,
    FieldId,
    CreatedBySystemUserId,
    CompetitionName,
    CompetitionStartDate,
    CompetitionEndDate,
    RegistrationOpenDate,
    RegistrationEndDate,
    PaidTimeRegistrationDate,
    PaidTimePublicationDate,
    CompetitionStatus,
    Notes,
    StallMapUrl
)
VALUES
(
    11,                 -- דאבל קיי
    3,                  -- אולאראונד
    79,                 -- אילאיל קנטי
    N'תחרות אולאראונד 5',
    '2025-09-18',
    '2025-09-20',
    '2025-08-25',
    '2025-09-05',
    NULL,
    NULL,
    N'פעילה',
    N'תחרות אולאראונד 5 בדאבל קיי',
    NULL
);

SET @CompetitionId = SCOPE_IDENTITY();

INSERT INTO ClassInCompetition
(
    CompetitionId,
    ClassTypeId,
    ArenaRanchId,
    ArenaId,
    ClassDateTime,
    OrganizerCost,
    FederationCost,
    ClassNotes,
    StartTime,
    OrderInDay
)
VALUES
-- חמישי 18.09.2025 - טרייל
(@CompetitionId, 63, 11, 2, '2025-09-18 10:00:00', 100.00, 0.00,  NULL, '10:00', 1),   -- מקצה אימון טרייל
(@CompetitionId, 64, 11, 2, '2025-09-18 10:20:00', 150.00, 30.00, NULL, '10:20', 2),   -- טרייל פתוח
(@CompetitionId, 65, 11, 2, '2025-09-18 11:10:00', 150.00, 30.00, NULL, '11:10', 3),   -- טרייל עד 18
(@CompetitionId, 66, 11, 2, '2025-09-18 12:00:00', 150.00, 30.00, NULL, '12:00', 4),   -- טרייל ירוקי עד 15

-- חמישי - הורסמנשיפ / פלז'ר / האנטר
(@CompetitionId, 67, 11, 2, '2025-09-18 13:00:00', 100.00, 0.00,  NULL, '13:00', 5),   -- מקצה אימון הורסמנשיפ
(@CompetitionId, 68, 11, 2, '2025-09-18 13:15:00', 100.00, 0.00,  NULL, '13:15', 6),   -- מקצה אימון פלז'ר
(@CompetitionId, 69, 11, 2, '2025-09-18 13:30:00', 120.00, 30.00, NULL, '13:30', 7),   -- הליכה ג'וג עד גיל 18
(@CompetitionId, 70, 11, 2, '2025-09-18 13:50:00', 120.00, 30.00, NULL, '13:50', 8),   -- הורסמנשיפ הליכה ג'וג עד גיל 18
(@CompetitionId, 71, 11, 2, '2025-09-18 14:20:00', 120.00, 30.00, NULL, '14:20', 9),   -- הורסמנשיפ ירוקי עד 18

(@CompetitionId, 73, 11, 2, '2025-09-18 16:15:00', 150.00, 30.00, NULL, '16:15', 10),  -- האנטר אנדר סאדל פתוח
(@CompetitionId, 74, 11, 2, '2025-09-18 16:35:00', 120.00, 30.00, NULL, '16:35', 11),  -- האנט סיט אקוויטיישן עד גיל 18
(@CompetitionId, 75, 11, 2, '2025-09-18 16:55:00', 120.00, 30.00, NULL, '16:55', 12),  -- האנטר אנדר סאדל עד גיל 18
(@CompetitionId, 76, 11, 2, '2025-09-18 17:15:00', 120.00, 30.00, NULL, '17:15', 13),  -- האנטר אנדר סאדל ירוקי עד 18
(@CompetitionId, 77, 11, 2, '2025-09-18 17:35:00', 120.00, 30.00, NULL, '17:35', 14),  -- האנטר אנדר סאדל עד גיל 15
(@CompetitionId, 78, 11, 2, '2025-09-18 17:55:00', 120.00, 30.00, NULL, '17:55', 15),  -- האנט סיט אקוויטיישן ירוקי עד 15
(@CompetitionId, 79, 11, 2, '2025-09-18 18:05:00', 120.00, 30.00, NULL, '18:05', 16),  -- האנטר אנדר סאדל ירוקי עד 15
(@CompetitionId, 80, 11, 2, '2025-09-18 18:25:00', 120.00, 30.00, NULL, '18:25', 17),  -- האנט סיט אקוויטיישן עד גיל 13
(@CompetitionId, 81, 11, 2, '2025-09-18 18:45:00', 120.00, 30.00, NULL, '18:45', 18),  -- האנטר אנדר סאדל עד גיל 13
(@CompetitionId, 82, 11, 2, '2025-09-18 19:00:00', 120.00, 30.00, NULL, '19:00', 19),  -- האנטר אנדר סאדל 13 ירוקי

-- שישי 19.09.2025 - טרייל
(@CompetitionId, 83, 11, 2, '2025-09-19 08:00:00', 150.00, 30.00, NULL, '08:00', 20),  -- טרייל נונ פרו
(@CompetitionId, 84, 11, 2, '2025-09-19 08:20:00', 150.00, 30.00, NULL, '08:20', 21),  -- טרייל פתוח לסוסי נוביס
(@CompetitionId, 85, 11, 2, '2025-09-19 08:50:00', 120.00, 30.00, NULL, '08:50', 22),  -- טרייל ירוקי עד 18
(@CompetitionId, 86, 11, 2, '2025-09-19 09:30:00', 120.00, 30.00, NULL, '09:30', 23),  -- טרייל הליכה ג'וג עד גיל 18
(@CompetitionId, 87, 11, 2, '2025-09-19 09:50:00', 120.00, 30.00, NULL, '09:50', 24),  -- טרייל עד גיל 13

-- שישי - הורסמנשיפ / פלז'ר
(@CompetitionId, 88, 11, 2, '2025-09-19 11:40:00', 150.00, 30.00, NULL, '11:40', 25),  -- הורסמנשיפ פתוח
(@CompetitionId, 89, 11, 2, '2025-09-19 12:10:00', 120.00, 30.00, NULL, '12:10', 26),  -- הורסמנשיפ ירוקי בוגרים
(@CompetitionId, 90, 11, 2, '2025-09-19 12:20:00', 120.00, 30.00, NULL, '12:20', 27),  -- הורסמנשיפ ירוקי עד 13
(@CompetitionId, 91, 11, 2, '2025-09-19 13:10:00', 120.00, 30.00, NULL, '13:10', 28),  -- הורסמנשיפ עד 15

(@CompetitionId, 92, 11, 2, '2025-09-19 16:30:00', 120.00, 30.00, NULL, '16:30', 29),  -- הורסמנשיפ נוביס נוער
(@CompetitionId, 93, 11, 2, '2025-09-19 17:00:00', 120.00, 30.00, NULL, '17:00', 30),  -- הורסמנשיפ עד גיל 10
(@CompetitionId, 94, 11, 2, '2025-09-19 17:20:00', 150.00, 30.00, NULL, '17:20', 31),  -- פלז'ר נונ פרו
(@CompetitionId, 95, 11, 2, '2025-09-19 17:35:00',  50.00, 50.00, NULL, '17:35', 32),  -- פלזר נונפרו 40+ הליכה גוג
(@CompetitionId, 96, 11, 2, '2025-09-19 17:50:00', 120.00, 30.00, NULL, '17:50', 33),  -- הליכה ג'וג עד גיל 10
(@CompetitionId, 97, 11, 2, '2025-09-19 18:10:00', 120.00, 30.00, NULL, '18:10', 34),  -- פלז'ר ירוקי בוגרים
(@CompetitionId, 98, 11, 2, '2025-09-19 18:20:00', 150.00, 30.00, NULL, '18:20', 35),  -- פלז'ר פתוח לסוסי נוביס
(@CompetitionId, 99, 11, 2, '2025-09-19 18:40:00', 120.00, 30.00, NULL, '18:40', 36),  -- פלז'ר עד 18
(@CompetitionId,100, 11, 2, '2025-09-19 19:00:00', 120.00, 30.00, NULL, '19:00', 37),  -- פלז'ר ירוקי עד 15
(@CompetitionId,101, 11, 2, '2025-09-19 19:20:00', 120.00, 30.00, NULL, '19:20', 38),  -- הליכה ג'וג סירקט עד 13
(@CompetitionId,102, 11, 2, '2025-09-19 19:40:00', 120.00, 30.00, NULL, '19:40', 39),  -- פלז'ר עד גיל 13

-- שבת 20.09.2025
(@CompetitionId,103, 11, 3, '2025-09-20 08:00:00', 100.00, 0.00,  NULL, '08:00', 40),  -- שואומנשיפ
(@CompetitionId,104, 11, 3, '2025-09-20 08:30:00', 100.00, 0.00,  NULL, '08:30', 41),  -- שואומנשיפ ירוקי

(@CompetitionId,105, 11, 2, '2025-09-20 09:00:00', 120.00, 30.00, NULL, '09:00', 42),  -- טרייל נוביס נוער
(@CompetitionId,106, 11, 2, '2025-09-20 09:20:00', 120.00, 30.00, NULL, '09:20', 43),  -- טרייל עד 15
(@CompetitionId,107, 11, 2, '2025-09-20 10:00:00', 120.00, 30.00, NULL, '10:00', 44),  -- טרייל ירוקי בוגרים
(@CompetitionId,108, 11, 2, '2025-09-20 10:15:00', 120.00, 30.00, NULL, '10:15', 45),  -- טרייל ירוקי עד 13
(@CompetitionId,109, 11, 2, '2025-09-20 11:10:00', 120.00, 30.00, NULL, '11:10', 46),  -- טרייל עד גיל 10

(@CompetitionId,110, 11, 2, '2025-09-20 13:45:00', 150.00, 30.00, NULL, '13:45', 47),  -- הורסמנשיפ נונ פרו
(@CompetitionId,111, 11, 2, '2025-09-20 14:15:00', 150.00, 30.00, NULL, '14:15', 48),  -- הורסמנשיפ פתוח לסוסי נוביס
(@CompetitionId,112, 11, 2, '2025-09-20 14:35:00',  50.00, 50.00, NULL, '14:35', 49),  -- הורסמנשיפ ונפרו 40+ הליכה גוג
(@CompetitionId,113, 11, 2, '2025-09-20 14:45:00', 120.00, 30.00, NULL, '14:45', 50),  -- הורסמנשיפ עד 18
(@CompetitionId,114, 11, 2, '2025-09-20 15:45:00', 120.00, 30.00, NULL, '15:45', 51),  -- הורסמנשיפ ירוקי עד 15
(@CompetitionId,115, 11, 2, '2025-09-20 16:45:00', 120.00, 30.00, NULL, '16:45', 52),  -- הורסמנשיפ עד גיל 13
(@CompetitionId,116, 11, 2, '2025-09-20 17:15:00', 150.00, 30.00, NULL, '17:15', 53),  -- פלז'ר פתוח
(@CompetitionId,117, 11, 2, '2025-09-20 17:35:00', 120.00, 30.00, NULL, '17:35', 54),  -- פלזר נוביס נוער
(@CompetitionId,118, 11, 2, '2025-09-20 17:55:00', 120.00, 30.00, NULL, '17:55', 55),  -- פלז'ר ירוקי עד 18
(@CompetitionId,119, 11, 2, '2025-09-20 18:15:00', 120.00, 30.00, NULL, '18:15', 56),  -- פלז'ר עד 15
(@CompetitionId,120, 11, 2, '2025-09-20 18:35:00', 120.00, 30.00, NULL, '18:35', 57);  -- הליכה ג'וג עד גיל 13

INSERT INTO ClassJudge (ClassInCompId, JudgeId)
SELECT
    ClassInCompId,
    2
FROM ClassInCompetition
WHERE CompetitionId = @CompetitionId;

INSERT INTO ClassPrize (ClassInCompId, PrizeTypeId, PrizeAmount)
SELECT cic.ClassInCompId, v.PrizeTypeId, v.PrizeAmount
FROM (
    VALUES
    (64, 2, 100.00),   -- טרייל פתוח ג'קפוט
    (73, 2, 100.00),   -- האנטר אנדר סאדל פתוח ג'קפוט
    (83, 2, 100.00),   -- טרייל נונ פרו ג'קפוט
    (88, 2, 100.00),   -- הורסמנשיפ פתוח ג'קפוט
    (92, 2, 100.00),   -- הורסמנשיפ נוביס נוער ג'קפוט
    (110,2, 100.00),   -- הורסמנשיפ נונ פרו ג'קפוט
    (116,2, 100.00)    -- פלז'ר פתוח ג'קפוט
) AS v(ClassTypeId, PrizeTypeId, PrizeAmount)
JOIN ClassInCompetition cic
    ON cic.ClassTypeId = v.ClassTypeId
   AND cic.CompetitionId = @CompetitionId;

INSERT INTO ClassPrize (ClassInCompId, PrizeTypeId, PrizeAmount)
SELECT cic.ClassInCompId, v.PrizeTypeId, v.PrizeAmount
FROM (
    VALUES
    (110, 3, 2000.00)  -- הורסמנשיפ נונ פרו כסף מוסף
) AS v(ClassTypeId, PrizeTypeId, PrizeAmount)
JOIN ClassInCompetition cic
    ON cic.ClassTypeId = v.ClassTypeId
   AND cic.CompetitionId = @CompetitionId;
GO



   /* =========================================================
	תחרות ריינינג		
   ========================================================= */


USE RideOn;
GO

DECLARE @CompetitionId INT;

SELECT @CompetitionId = CompetitionId
FROM Competition
WHERE CompetitionName = N'תחרות ריינינג 9+10';

IF @CompetitionId IS NOT NULL
BEGIN
    DELETE FROM PaidTimeSlotInCompetition
    WHERE CompetitionId = @CompetitionId;

    DELETE cp
    FROM ClassPrize cp
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cp.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE cj
    FROM ClassJudge cj
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = cj.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE rt
    FROM ReiningType rt
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = rt.ReiningClassInCompId
    WHERE cic.CompetitionId = @CompetitionId;

    DELETE FROM ClassInCompetition
    WHERE CompetitionId = @CompetitionId;

    DELETE FROM Competition
    WHERE CompetitionId = @CompetitionId;
END
GO

DECLARE @CompetitionId INT;

INSERT INTO Competition
(
    HostRanchId,
    FieldId,
    CreatedBySystemUserId,
    CompetitionName,
    CompetitionStartDate,
    CompetitionEndDate,
    RegistrationOpenDate,
    RegistrationEndDate,
    PaidTimeRegistrationDate,
    PaidTimePublicationDate,
    CompetitionStatus,
    Notes,
    StallMapUrl
)
VALUES
(
    11,                 -- דאבל קיי
    1,                  -- ריינינג
    79,                 -- אילאיל קנטי
    N'תחרות ריינינג 9+10',
    '2025-10-15',
    '2025-10-18',
    '2025-09-14',
    '2025-09-25',
    NULL,
    NULL,
    N'כעת',
    N'תחרות ריינינג 9+10 בדאבל קיי',
    NULL
);

SET @CompetitionId = SCOPE_IDENTITY();

INSERT INTO ClassInCompetition
(
    CompetitionId,
    ClassTypeId,
    ArenaRanchId,
    ArenaId,
    ClassDateTime,
    OrganizerCost,
    FederationCost,
    ClassNotes,
    StartTime,
    OrderInDay
)
VALUES
-- יום רביעי 15.10.2025
(@CompetitionId, 1,  11, 1, '2025-10-15 10:00:00', 200.00, 100.00, NULL,              '10:00', 1),  -- פתוח לא מוגבל
(@CompetitionId, 2,  11, 1, '2025-10-15 11:20:00', 200.00, 200.00, N'תחרות לדרוג 9', '11:20', 2),  -- ירוקי התאחדות
(@CompetitionId, 3,  11, 1, '2025-10-15 11:20:00', 150.00, 150.00, N'תחרות לדרוג 9', '11:20', 3),  -- ירוקי רוכב חדש התאחדות
(@CompetitionId, 4,  11, 1, '2025-10-15 14:15:00', 170.00,  30.00, N'תחרות לדרוג 9', '14:15', 4),  -- נוער ירוקי התאחדות
(@CompetitionId, 5,  11, 1, '2025-10-15 16:35:00', 170.00,  30.00, N'תחרות לדרוג 9', '16:35', 5),  -- Unrestricted Youth NRHA
(@CompetitionId, 6,  11, 1, '2025-10-15 17:05:00', 200.00, 200.00, N'תחרות לדרוג 9', '17:05', 6),  -- נונ פרו 50+
(@CompetitionId, 7,  11, 1, '2025-10-15 17:50:00', 200.00, 300.00, N'תחרות לדרוג 9', '17:50', 7),  -- Open NRHA
(@CompetitionId, 8,  11, 1, '2025-10-15 17:50:00', 200.00, 250.00, N'תחרות לדרוג 9', '17:50', 8),  -- Limited Open NRHA
(@CompetitionId, 9,  11, 1, '2025-10-15 17:50:00', 200.00, 300.00, N'תחרות לדרוג 9', '17:50', 9),  -- Novice Horse Open Level 1 NRHA

-- יום חמישי 16.10.2025
(@CompetitionId, 1,  11, 1, '2025-10-16 09:00:00', 200.00, 100.00, NULL,              '09:00', 10), -- פתוח לא מוגבל
(@CompetitionId,10,  11, 1, '2025-10-16 10:10:00', 200.00, 200.00, N'תחרות לדרוג 9', '10:10', 11), -- נוביס התאחדות
(@CompetitionId,11,  11, 1, '2025-10-16 12:00:00', 200.00, 200.00, N'תחרות לדרוג 9', '12:00', 12), -- נוביס נונ פרו התאחדות
(@CompetitionId,12,  11, 1, '2025-10-16 13:50:00', 200.00, 300.00, N'תחרות לדרוג 9', '13:50', 13), -- Non Pro NRHA
(@CompetitionId,13,  11, 1, '2025-10-16 13:50:00', 200.00, 250.00, N'תחרות לדרוג 9', '13:50', 14), -- Limited Non Pro NRHA
(@CompetitionId,14,  11, 1, '2025-10-16 13:50:00', 200.00, 250.00, N'תחרות לדרוג 9', '13:50', 15), -- Prime Time Non Pro NRHA
(@CompetitionId,15,  11, 1, '2025-10-16 13:50:00', 170.00,  30.00, N'תחרות לדרוג 9', '13:50', 16), -- Youth 14-18 NRHA
(@CompetitionId,16,  11, 1, '2025-10-16 13:50:00', 170.00,  30.00, N'תחרות לדרוג 9', '13:50', 17), -- Youth 13 & Under NRHA

-- יום שישי 17.10.2025
(@CompetitionId, 1,  11, 1, '2025-10-17 09:00:00', 200.00, 100.00, NULL,               '09:00', 18), -- פתוח לא מוגבל
(@CompetitionId, 2,  11, 1, '2025-10-17 09:50:00', 200.00, 200.00, N'תחרות לדרוג 10', '09:50', 19), -- ירוקי התאחדות
(@CompetitionId, 3,  11, 1, '2025-10-17 09:50:00', 150.00, 150.00, N'תחרות לדרוג 10', '09:50', 20), -- ירוקי רוכב חדש התאחדות
(@CompetitionId, 4,  11, 1, '2025-10-17 12:10:00', 170.00,  30.00, N'תחרות לדרוג 10', '12:10', 21), -- נוער ירוקי התאחדות
(@CompetitionId, 5,  11, 1, '2025-10-17 13:45:00', 170.00,  30.00, N'תחרות לדרוג 10', '13:45', 22), -- Unrestricted Youth NRHA
(@CompetitionId, 6,  11, 1, '2025-10-17 15:45:00', 200.00, 200.00, N'תחרות לדרוג 10', '15:45', 23), -- נונ פרו 50+
(@CompetitionId, 7,  11, 1, '2025-10-17 16:20:00', 200.00, 600.00, N'תחרות לדרוג 10', '16:20', 24), -- Open NRHA
(@CompetitionId, 8,  11, 1, '2025-10-17 16:20:00', 200.00, 300.00, N'תחרות לדרוג 10', '16:20', 25), -- Limited Open NRHA
(@CompetitionId, 9,  11, 1, '2025-10-17 16:20:00', 200.00, 400.00, N'תחרות לדרוג 10', '16:20', 26), -- Novice Horse Open Level 1 NRHA

-- יום שבת 18.10.2025
(@CompetitionId,10,  11, 1, '2025-10-18 08:00:00', 200.00, 200.00, N'תחרות לדרוג 10', '08:00', 27), -- נוביס התאחדות
(@CompetitionId,11,  11, 1, '2025-10-18 08:45:00', 200.00, 200.00, N'תחרות לדרוג 10', '08:45', 28), -- נוביס נונ פרו התאחדות
(@CompetitionId,16,  11, 1, '2025-10-18 10:00:00', 170.00,  30.00, N'תחרות לדרוג 10', '10:00', 29), -- Youth 13 & Under NRHA
(@CompetitionId,15,  11, 1, '2025-10-18 10:00:00', 170.00,  30.00, N'תחרות לדרוג 10', '10:00', 30), -- Youth 14-18 NRHA
(@CompetitionId,12,  11, 1, '2025-10-18 10:00:00', 200.00, 500.00, N'תחרות לדרוג 10', '10:00', 31), -- Non Pro NRHA
(@CompetitionId,13,  11, 1, '2025-10-18 10:00:00', 200.00, 300.00, N'תחרות לדרוג 10', '10:00', 32), -- Limited Non Pro NRHA
(@CompetitionId,14,  11, 1, '2025-10-18 10:00:00', 200.00, 400.00, N'תחרות לדרוג 10', '10:00', 33); -- Prime Time Non Pro NRHA

INSERT INTO ReiningType
(
    ReiningClassInCompId,
    PatternNumber
)
SELECT
    cic.ClassInCompId,
    v.PatternNumber
FROM
(
    VALUES
    (1, 13),
    (2, 8),
    (3, 8),
    (4, 4),
    (5, 6),
    (6, 8),
    (7, 13),
    (8, 13),
    (9, 13),
    (10, 8),
    (11, 5),
    (12, 2),
    (13, 18),
    (14, 18),
    (15, 18),
    (16, 18),
    (17, 18),
    (18, 7),
    (19, 17),
    (20, 17),
    (21, 8),
    (22, 11),
    (23, 2),
    (24, 2),
    (25, 2),
    (26, 2),
    (27, 8),
    (28, 15),
    (29, 2),
    (30, 2),
    (31, 2),
    (32, 2),
    (33, 2)
) AS v(OrderInDay, PatternNumber)
JOIN ClassInCompetition cic
    ON cic.OrderInDay = v.OrderInDay
   AND cic.CompetitionId = @CompetitionId;

INSERT INTO ClassJudge (ClassInCompId, JudgeId)
SELECT
    ClassInCompId,
    7   -- ריקי בורדיניון
FROM ClassInCompetition
WHERE CompetitionId = @CompetitionId;

INSERT INTO ClassPrize (ClassInCompId, PrizeTypeId, PrizeAmount)
SELECT cic.ClassInCompId, v.PrizeTypeId, v.PrizeAmount
FROM
(
    VALUES
    (2,  2,  100.00),  -- ירוקי התאחדות
    (3,  2,   50.00),  -- ירוקי רוכב חדש התאחדות
    (6,  2,  100.00),  -- נונ פרו 50+
    (7,  3, 2400.00),  -- Open NRHA 600$
    (8,  3, 1200.00),  -- Limited Open NRHA 300$
    (9,  3, 2000.00),  -- Novice L1 500$

    (11, 2,  100.00),  -- נוביס התאחדות
    (12, 2,  100.00),  -- נוביס נונ פרו התאחדות
    (13, 3, 2000.00),  -- Non Pro NRHA 500$
    (14, 3, 1200.00),  -- Limited Non Pro 300$
    (15, 3, 1600.00),  -- Prime Time 400$

    (19, 2,  100.00),  -- ירוקי התאחדות
    (20, 2,   50.00),  -- ירוקי רוכב חדש התאחדות
    (23, 2,  100.00),  -- נונ פרו 50+
    (24, 3, 7600.00),  -- Open NRHA 1900$
    (25, 3, 2000.00),  -- Limited Open 500$
    (26, 3, 3400.00),  -- Novice L1 850$

    (27, 2,  100.00),  -- נוביס התאחדות
    (28, 2,  100.00),  -- נוביס נונ פרו התאחדות
    (31, 3, 7200.00),  -- Non Pro 1800$
    (32, 3, 2000.00),  -- Limited Non Pro 500$
    (33, 3, 3400.00)   -- Prime Time 850$
) AS v(OrderInDay, PrizeTypeId, PrizeAmount)
JOIN ClassInCompetition cic
    ON cic.OrderInDay = v.OrderInDay
   AND cic.CompetitionId = @CompetitionId;

INSERT INTO PaidTimeSlotInCompetition
(
    CompetitionId,
    PaidTimeSlotId,
    ArenaRanchId,
    ArenaId,
    SlotDate,
    StartTime,
    EndTime,
    SlotStatus,
    SlotNotes
)
SELECT
    @CompetitionId,
    v.PaidTimeSlotId,
    11,
    1,
    v.SlotDate,
    v.StartTime,
    v.EndTime,
    v.SlotStatus,
    NULL
FROM
(
    VALUES
    -- שלישי 14.10.2025
    (7,  CAST('2025-10-14' AS DATE), CAST('07:00' AS TIME), CAST('09:00' AS TIME), N'לא מלא'),
    (7,  CAST('2025-10-14' AS DATE), CAST('09:00' AS TIME), CAST('11:00' AS TIME), N'לא מלא'),
    (7,  CAST('2025-10-14' AS DATE), CAST('11:00' AS TIME), CAST('13:00' AS TIME), N'מלא'),
    (8,  CAST('2025-10-14' AS DATE), CAST('13:00' AS TIME), CAST('15:00' AS TIME), N'לא מלא'),
    (8,  CAST('2025-10-14' AS DATE), CAST('15:00' AS TIME), CAST('17:00' AS TIME), N'מלא'),
    (8,  CAST('2025-10-14' AS DATE), CAST('17:00' AS TIME), CAST('19:00' AS TIME), N'לא מלא'),
    (9,  CAST('2025-10-14' AS DATE), CAST('19:00' AS TIME), CAST('21:00' AS TIME), N'מלא'),
    (9,  CAST('2025-10-14' AS DATE), CAST('21:00' AS TIME), CAST('23:00' AS TIME), N'לא מלא'),

    -- רביעי 15.10.2025
    (10, CAST('2025-10-15' AS DATE), CAST('07:45' AS TIME), CAST('09:45' AS TIME), N'מלא'),
    (12, CAST('2025-10-15' AS DATE), CAST('19:30' AS TIME), CAST('21:30' AS TIME), N'לא מלא'),
    (12, CAST('2025-10-15' AS DATE), CAST('21:30' AS TIME), CAST('22:30' AS TIME), N'מלא'),

    -- חמישי 16.10.2025
    (13, CAST('2025-10-16' AS DATE), CAST('07:30' AS TIME), CAST('08:30' AS TIME), N'לא מלא'),
    (15, CAST('2025-10-16' AS DATE), CAST('18:00' AS TIME), CAST('20:00' AS TIME), N'מלא'),
    (15, CAST('2025-10-16' AS DATE), CAST('20:00' AS TIME), CAST('22:00' AS TIME), N'לא מלא'),

    -- שישי 17.10.2025
    (16, CAST('2025-10-17' AS DATE), CAST('06:30' AS TIME), CAST('08:30' AS TIME), N'מלא'),
    (18, CAST('2025-10-17' AS DATE), CAST('18:30' AS TIME), CAST('21:00' AS TIME), N'לא מלא'),

    -- שבת 18.10.2025
    (19, CAST('2025-10-18' AS DATE), CAST('07:00' AS TIME), CAST('08:00' AS TIME), N'מלא')
) AS v(PaidTimeSlotId, SlotDate, StartTime, EndTime, SlotStatus);
GO