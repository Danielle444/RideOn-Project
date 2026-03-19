USE RideOn;
GO

/* =========================================================
   InsertData_07_CompetitionRequestsAndBilling.sql
   כולל:
   - Bill
   - ServiceRequest
   - Entry
   - PaidTimeRequest
   - ProductRequest
   - StallBooking
   - ShavingsOrder
   - ShavingsOrderForStallBooking
   - BillProductRequest
   ========================================================= */

SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('tempdb..#StageEntry') IS NOT NULL DROP TABLE #StageEntry;
CREATE TABLE #StageEntry
(
    StageRowId INT IDENTITY(1,1) PRIMARY KEY,
    SourceRow INT NOT NULL,
    RegRow INT NOT NULL,
    ClassInCompId INT NOT NULL,
    DrawOrder TINYINT NOT NULL,
    RiderPersonId INT NOT NULL,
    CoachFederationMemberId INT NOT NULL,
    HorseId INT NOT NULL,
    OrderedBySystemUserId INT NOT NULL,
    PayerRaw NVARCHAR(100) NOT NULL,
    RegDate DATETIME2(0) NOT NULL,
    MatchType NVARCHAR(30) NOT NULL
);

INSERT INTO #StageEntry (SourceRow, RegRow, ClassInCompId, DrawOrder, RiderPersonId, CoachFederationMemberId, HorseId, OrderedBySystemUserId, PayerRaw, RegDate, MatchType)
VALUES
(9, 287, 98, 2, 366, 366, 459, 2674, N'לדר אורי', '2025-09-27 00:00:00', N'exact'),
(12, 262, 98, 3, 348, 348, 465, 649, N'כרמון אייל', '2025-09-27 00:00:00', N'exact'),
(15, 117, 98, 4, 173, 372, 360, 519, N'ג''רבי מירב', '2025-09-27 00:00:00', N'exact'),
(18, 457, 98, 5, 2348, 2348, 377, 649, N'רקח גל', '2025-09-27 00:00:00', N'exact'),
(21, 156, 98, 6, 374, 374, 456, 2372, N'הרלב עמית', '2025-09-27 00:00:00', N'exact'),
(24, 34, 98, 7, 2408, 374, 298, 2372, N'אפריים עידן', '2025-09-27 00:00:00', N'exact'),
(27, 123, 98, 8, 206, 206, 378, 491, N'גרושקה עפרי', '2025-09-27 00:00:00', N'exact'),
(30, 182, 98, 9, 68, 368, 289, 398, N'חמילבסקי ארז', '2025-09-27 00:00:00', N'exact'),
(33, 172, 98, 10, 2551, 328, 15, 2551, N'זמור אילן', '2025-09-29 00:00:00', N'exact'),
(36, 73, 98, 11, 366, 366, 455, 2674, N'בן ברוך עינב', '2025-09-27 00:00:00', N'exact'),
(39, 270, 98, 12, 348, 348, 464, 348, N'כרמון אייל', '2025-09-27 00:00:00', N'exact'),
(46, 106, 99, 1, 2659, 2414, 311, 88, N'ג''נאח אופיר', '2025-10-14 00:00:00', N'exact'),
(55, 403, 99, 4, 2756, 328, 417, 2551, N'פיינמסר שירה', '2025-10-13 00:00:00', N'rider_horse_unique'),
(58, 53, 100, 5, 1717, 368, 387, 398, N'ארצי רביב', '2025-10-13 00:00:00', N'rider_horse_unique'),
(64, 326, 100, 7, 2366, 2414, 359, 491, N'מזרחי רחלי', '2025-10-08 00:00:00', N'rider_horse_unique'),
(70, 126, 100, 9, 1082, 2348, 260, 649, N'דמתי דביר', '2025-09-27 00:00:00', N'exact'),
(79, 472, 100, 12, 2726, 328, 15, 2551, N'שלום לירז', '2025-09-29 00:00:00', N'rider_horse_unique'),
(82, 131, 99, 13, 1484, 2414, 323, 88, N'דניאל עוז', '2025-09-27 00:00:00', N'exact'),
(85, 394, 99, 14, 2338, 2336, 440, 624, N'עפיפי מלאכ', '2025-09-27 00:00:00', N'exact'),
(94, 147, 99, 17, 722, 140, 396, 722, N'דרי בתאל', '2025-09-27 00:00:00', N'exact'),
(103, 45, 99, 20, 598, 2414, 380, 491, N'ארנון אלה', '2025-09-27 00:00:00', N'exact'),
(112, 192, 99, 23, 2650, 140, 427, 722, N'טילבור אור', '2025-09-27 00:00:00', N'exact'),
(163, 42, 101, 14, 3630, 2372, 269, 2372, N'ארז אור', '2025-09-27 00:00:00', N'rider_horse_unique'),
(170, 346, 102, 1, 3266, 201, 293, 2634, N'סייג משה', '2025-09-27 00:00:00', N'exact'),
(174, 351, 102, 2, 1763, 201, 385, 649, N'סייג משה', '2025-09-27 00:00:00', N'exact'),
(178, 196, 102, 3, 3575, 2372, 419, 2372, N'יהב בן', '2025-09-27 00:00:00', N'exact'),
(182, 348, 102, 4, 3266, 201, 413, 2634, N'סייג משה', '2025-09-27 00:00:00', N'exact'),
(189, 462, 103, 1, 333, 206, 421, 491, N'שגב זהר', '2025-09-27 00:00:00', N'exact'),
(192, 183, 103, 2, 68, 368, 289, 398, N'חמילבסקי ארז', '2025-09-27 00:00:00', N'exact'),
(195, 274, 103, 3, 300, 372, 373, 519, N'כרמון גד', '2025-09-27 00:00:00', N'exact'),
(198, 424, 103, 4, 315, 133, 292, 649, N'קולטין אפי', '2025-09-27 00:00:00', N'exact'),
(201, 444, 103, 5, 2429, 2400, 372, 491, N'רוזנברג ניקולט', '2025-09-27 00:00:00', N'exact'),
(204, 38, 103, 6, 62, 366, 454, 2674, N'ארג''ואן אלי', '2025-09-27 00:00:00', N'exact'),
(207, 264, 103, 7, 316, 348, 330, 348, N'כרמון אייל', '2025-09-27 00:00:00', N'exact'),
(218, 206, 104, 1, 2336, 2336, 463, 624, N'כהן דור', '2025-10-14 00:00:00', N'exact'),
(222, 120, 104, 2, 206, 206, 378, 491, N'גרושקה עפרי', '2025-10-16 00:00:00', N'exact'),
(226, 244, 104, 3, 2348, 2348, 448, 649, N'כנעני צביקה', '2025-09-27 00:00:00', N'rider_horse_unique'),
(234, 23, 105, 5, 285, 374, 327, 2372, N'איתי זהר', '2025-09-27 00:00:00', N'rider_horse_unique'),
(238, 27, 104, 6, 368, 368, 472, 398, N'אלימרה אחזקות בע"מ', '2025-09-27 00:00:00', N'rider_horse_unique'),
(242, 10, 106, 7, 155, 155, 338, 155, N'אביטל פיני', '2025-09-27 00:00:00', N'exact'),
(248, 438, 105, 8, 851, 348, 259, 2431, N'ראובני אורן', '2025-10-17 00:00:00', N'exact'),
(252, 157, 105, 9, 374, 374, 430, 2372, N'הרלב עמית', '2025-09-27 00:00:00', N'rider_horse_unique'),
(260, 449, 104, 11, 206, 206, 317, 491, N'רז חת ליאור', '2025-09-27 00:00:00', N'exact'),
(266, 248, 104, 12, 2348, 2348, 449, 649, N'כנעני צביקה', '2025-09-27 00:00:00', N'exact'),
(273, 276, 107, 1, 519, 372, 256, 519, N'כרמון גד', '2025-09-27 00:00:00', N'exact'),
(276, 400, 107, 2, 2327, 2327, 412, 2327, N'פיין דריה', '2025-09-27 00:00:00', N'exact'),
(279, 155, 107, 3, 2646, 374, 456, 2372, N'הרלב עמית', '2025-09-27 00:00:00', N'exact'),
(282, 60, 107, 4, 1671, 372, 447, 519, N'בלה מיה', '2025-09-27 00:00:00', N'exact'),
(285, 432, 107, 5, 515, 120, 391, 515, N'קרא מאיה', '2025-09-27 00:00:00', N'exact'),
(288, 220, 107, 6, 1048, 133, 174, 2357, N'כוכבא ליאור', '2025-09-27 00:00:00', N'exact'),
(291, 103, 107, 7, 471, 2327, 405, 2327, N'גל דניאל', '2025-09-27 00:00:00', N'exact'),
(294, 466, 107, 8, 368, 368, 354, 398, N'שוגר יואב', '2025-09-27 00:00:00', N'exact'),
(303, 469, 108, 1, 206, 206, 416, 491, N'שוורץ קסנדרין', '2025-09-27 00:00:00', N'rider_horse_unique'),
(309, 414, 108, 3, 2327, 2327, 411, 2327, N'פסקא רון', '2025-09-27 00:00:00', N'rider_horse_unique'),
(312, 260, 108, 4, 348, 348, 464, 348, N'כרמון אייל', '2025-09-27 00:00:00', N'rider_horse_unique'),
(321, 97, 108, 8, 285, 374, 458, 2372, N'גייגו אוריין', '2025-09-27 00:00:00', N'rider_horse_unique'),
(327, 101, 108, 11, 2327, 2327, 407, 2327, N'גל דניאל', '2025-09-27 00:00:00', N'rider_horse_unique'),
(339, 263, 108, 15, 348, 348, 465, 649, N'כרמון אייל', '2025-09-27 00:00:00', N'rider_horse_unique'),
(398, 291, 112, 4, 43, 133, 283, 649, N'לוגסי נדב', '2025-09-27 00:00:00', N'exact'),
(414, 226, 111, 8, 2567, 133, 263, 649, N'כמכאג''י רות', '2025-09-27 00:00:00', N'exact'),
(436, 49, 112, 13, 249, 368, 387, 398, N'ארצי רביב', '2025-09-27 00:00:00', N'exact'),
(440, 369, 112, 14, 704, 133, 335, 649, N'סלמן יסמין', '2025-09-27 00:00:00', N'rider_horse_unique'),
(454, 30, 111, 17, 2408, 374, 298, 2372, N'אפריים עידן', '2025-09-27 00:00:00', N'exact'),
(468, 6, 113, 20, 1420, 2336, 355, 624, N'אבוטבול איה', '2025-09-27 00:00:00', N'exact'),
(482, 129, 113, 23, 2484, 2414, 394, 88, N'דניאל עוז', '2025-09-27 00:00:00', N'rider_horse_unique'),
(521, 374, 115, 1, 285, 374, 410, 2372, N'עזריה הדסה', '2025-10-17 00:00:00', N'exact'),
(524, 39, 115, 2, 62, 366, 454, 2674, N'ארג''ואן אלי', '2025-10-16 00:00:00', N'exact'),
(527, 56, 115, 3, 2327, 2327, 415, 2327, N'בוגוד הילי', '2025-09-27 00:00:00', N'exact'),
(530, 365, 115, 4, 3266, 201, 451, 2634, N'סייג עילי', '2025-10-16 00:00:00', N'exact'),
(533, 299, 115, 5, 254, 254, 390, 254, N'לוי אלונה', '2025-09-27 00:00:00', N'exact'),
(536, 168, 115, 6, 1660, 2327, 503, 2327, N'זולטק יולי', '2025-09-27 00:00:00', N'exact'),
(539, 185, 115, 7, 68, 368, 289, 398, N'חמילבסקי ארז', '2025-09-27 00:00:00', N'exact'),
(542, 110, 115, 8, 2384, 2327, 418, 2327, N'גפני ירדן', '2025-09-27 00:00:00', N'exact'),
(549, 107, 116, 1, 2659, 2414, 311, 88, N'ג''נאח אופיר', '2025-10-14 00:00:00', N'exact'),
(558, 298, 116, 4, 1049, 254, 390, 254, N'לוי אלונה', '2025-09-27 00:00:00', N'exact'),
(567, 19, 117, 7, 2773, 2414, 348, 88, N'אייל שהם', '2025-09-27 00:00:00', N'exact'),
(570, 390, 117, 8, 682, 366, 310, 2674, N'עמר אפיק', '2025-09-27 00:00:00', N'exact'),
(573, 59, 117, 9, 1671, 372, 447, 519, N'בלה מיה', '2025-09-27 00:00:00', N'exact'),
(579, 193, 116, 11, 2650, 140, 427, 722, N'טילבור אור', '2025-09-27 00:00:00', N'exact'),
(582, 254, 116, 12, 872, 2327, 414, 2327, N'כץ נעה', '2025-09-27 00:00:00', N'exact'),
(585, 211, 116, 13, 2530, 2414, 290, 491, N'כהן נעמה', '2025-09-27 00:00:00', N'exact'),
(588, 100, 116, 14, 471, 2327, 405, 2327, N'גל דניאל', '2025-09-27 00:00:00', N'exact'),
(597, 343, 116, 17, 2335, 372, 307, 519, N'סיאני מור', '2025-09-27 00:00:00', N'rider_horse_unique'),
(600, 46, 117, 18, 598, 2414, 380, 491, N'ארנון אלה', '2025-09-27 00:00:00', N'rider_horse_unique'),
(606, 136, 117, 20, 1484, 2414, 323, 88, N'דניאל עוז', '2025-09-27 00:00:00', N'rider_horse_unique'),
(642, 197, 118, 11, 3575, 2372, 419, 2372, N'יהב בן', '2025-09-27 00:00:00', N'rider_horse_unique'),
(661, 349, 119, 1, 3266, 201, 413, 2634, N'סייג משה', '2025-09-27 00:00:00', N'exact'),
(669, 15, 119, 3, 2785, 133, 260, 649, N'אטיה פלג', '2025-09-27 00:00:00', N'exact'),
(673, 347, 119, 4, 3266, 201, 293, 2634, N'סייג משה', '2025-09-27 00:00:00', N'exact'),
(680, 463, 120, 1, 333, 206, 421, 491, N'שגב זהר', '2025-09-27 00:00:00', N'exact'),
(683, 275, 120, 2, 300, 372, 373, 519, N'כרמון גד', '2025-09-27 00:00:00', N'exact'),
(686, 445, 120, 3, 2429, 2400, 372, 491, N'רוזנברג ניקולט', '2025-09-27 00:00:00', N'exact'),
(689, 425, 120, 4, 315, 133, 292, 649, N'קולטין אפי', '2025-09-27 00:00:00', N'exact'),
(692, 184, 120, 5, 68, 368, 289, 398, N'חמילבסקי ארז', '2025-09-27 00:00:00', N'exact'),
(706, 122, 121, 1, 206, 206, 378, 491, N'גרושקה עפרי', '2025-09-27 00:00:00', N'exact'),
(772, 90, 123, 13, 2414, 2414, 359, 491, N'ברבר דור', '2025-09-27 00:00:00', N'exact'),
(778, 433, 123, 14, 515, 120, 391, 515, N'קרא מאיה', '2025-09-27 00:00:00', N'exact'),
(782, 267, 123, 15, 348, 348, 329, 348, N'כרמון אייל', '2025-09-27 00:00:00', N'exact'),
(804, 237, 122, 18, 2348, 2348, 488, 649, N'כנעני צביקה', '2025-09-27 00:00:00', N'rider_horse_unique'),
(823, 88, 124, 2, 2414, 2414, 359, 491, N'ברבר דור', '2025-09-27 00:00:00', N'rider_horse_unique'),
(859, 219, 125, 5, 1048, 133, 174, 2357, N'כוכבא ליאור', '2025-09-27 00:00:00', N'rider_horse_unique'),
(916, 76, 129, 1, 3512, 2363, 346, 530, N'בן זאב אמה', '2025-09-27 00:00:00', N'exact'),
(929, 378, 127, 3, 1517, 2372, 409, 2372, N'עזריה הדסה', '2025-09-27 00:00:00', N'exact'),
(973, 292, 130, 10, 43, 133, 283, 649, N'לוגסי נדב', '2025-09-27 00:00:00', N'exact'),
(1011, 233, 129, 15, 3207, 2348, 382, 649, N'כנעני צביקה', '2025-09-27 00:00:00', N'rider_horse_unique'),
(1049, 111, 129, 21, 2384, 2327, 418, 2327, N'גפני ירדן', '2025-09-27 00:00:00', N'exact'),
(1057, 175, 129, 22, 263, 87, 408, 2372, N'חדד דגנית', '2025-09-27 00:00:00', N'rider_horse_unique'),
(1087, 273, 128, 27, 519, 372, 256, 519, N'כרמון גד', '2025-09-27 00:00:00', N'rider_horse_unique');

-- Missing payers that will be created as Person rows only if they do not already exist
IF OBJECT_ID('tempdb..#MissingPayer') IS NOT NULL DROP TABLE #MissingPayer;
CREATE TABLE #MissingPayer
(
    PayerRaw NVARCHAR(100) PRIMARY KEY,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL
);

INSERT INTO #MissingPayer (PayerRaw, FirstName, LastName)
VALUES
(N'אלימרה אחזקות בע"מ', N'אלימרה', N'אחזקות בע"מ');

IF OBJECT_ID('tempdb..#PayerMap') IS NOT NULL DROP TABLE #PayerMap;
CREATE TABLE #PayerMap
(
    PayerRaw NVARCHAR(100) PRIMARY KEY,
    PayerPersonId INT NOT NULL
);

INSERT INTO #PayerMap (PayerRaw, PayerPersonId)
SELECT DISTINCT
    s.PayerRaw,
    p.PersonId
FROM #StageEntry s
JOIN Person p
    ON CONCAT(p.LastName, N' ', p.FirstName) = s.PayerRaw
    OR CONCAT(p.FirstName, N' ', p.LastName) = s.PayerRaw;

INSERT INTO Person (NationalId, FirstName, LastName, Gender, DateOfBirth, CellPhone, Email)
SELECT
    NULL,
    mp.FirstName,
    mp.LastName,
    N'לא ידוע',
    NULL,
    NULL,
    NULL
FROM #MissingPayer mp
LEFT JOIN #PayerMap pm
    ON pm.PayerRaw = mp.PayerRaw
WHERE pm.PayerRaw IS NULL;

INSERT INTO #PayerMap (PayerRaw, PayerPersonId)
SELECT
    mp.PayerRaw,
    p.PersonId
FROM #MissingPayer mp
JOIN Person p
    ON p.FirstName = mp.FirstName
   AND p.LastName = mp.LastName
LEFT JOIN #PayerMap pm
    ON pm.PayerRaw = mp.PayerRaw
WHERE pm.PayerRaw IS NULL;

INSERT INTO #PayerMap (PayerRaw, PayerPersonId)
SELECT N'כרמון אייל', 316
WHERE NOT EXISTS (
    SELECT 1 FROM #PayerMap WHERE PayerRaw = N'כרמון אייל'
);

INSERT INTO #PayerMap (PayerRaw, PayerPersonId)
SELECT N'קרא מאיה', 4168
WHERE NOT EXISTS (
    SELECT 1 FROM #PayerMap WHERE PayerRaw = N'קרא מאיה'
);

INSERT INTO #PayerMap (PayerRaw, PayerPersonId)
SELECT N'איתי זהר', 2619
WHERE NOT EXISTS (
    SELECT 1 FROM #PayerMap WHERE PayerRaw = N'איתי זהר'
);

IF EXISTS (
    SELECT 1
    FROM #StageEntry s
    LEFT JOIN #PayerMap pm ON pm.PayerRaw = s.PayerRaw
    WHERE pm.PayerPersonId IS NULL
)
BEGIN
    RAISERROR(N'יש שורות ב-#StageEntry בלי PayerPersonId. בודקים לפני INSERT.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;

IF OBJECT_ID('tempdb..#StageToInsert') IS NOT NULL DROP TABLE #StageToInsert;
CREATE TABLE #StageToInsert
(
    StageRowId INT PRIMARY KEY,
    PayerRaw NVARCHAR(100) NOT NULL,
    PayerPersonId INT NOT NULL,
    RegDate DATETIME2(0) NOT NULL,
    AmountToPay DECIMAL(10,2) NOT NULL
);

INSERT INTO #StageToInsert (StageRowId, PayerRaw, PayerPersonId, RegDate, AmountToPay)
SELECT
    s.StageRowId,
    s.PayerRaw,
    pm.PayerPersonId,
    s.RegDate,
    COALESCE(cic.OrganizerCost, 0) + COALESCE(cic.FederationCost, 0) AS AmountToPay
FROM #StageEntry s
JOIN #PayerMap pm
    ON pm.PayerRaw = s.PayerRaw
JOIN ClassInCompetition cic
    ON cic.ClassInCompId = s.ClassInCompId
WHERE NOT EXISTS
(
    SELECT 1
    FROM Entry e
    JOIN ServiceRequest sr
        ON sr.SRequestId = e.EntryId
    WHERE e.ClassInCompId = s.ClassInCompId
      AND e.DrawOrder = s.DrawOrder
      AND sr.HorseId = s.HorseId
      AND sr.RiderFederationMemberId = s.RiderPersonId
      AND sr.CoachFederationMemberId = s.CoachFederationMemberId
);

IF OBJECT_ID('tempdb..#InsertedBillByPayer') IS NOT NULL DROP TABLE #InsertedBillByPayer;
CREATE TABLE #InsertedBillByPayer
(
    PayerRaw NVARCHAR(100) PRIMARY KEY,
    BillId INT NOT NULL
);

IF OBJECT_ID('tempdb..#PayerTotals') IS NOT NULL DROP TABLE #PayerTotals;
CREATE TABLE #PayerTotals
(
    PayerRaw NVARCHAR(100) PRIMARY KEY,
    PayerPersonId INT NOT NULL,
    DateOpened DATETIME2(0) NOT NULL,
    AmountToPay DECIMAL(10,2) NOT NULL
);

INSERT INTO #PayerTotals (PayerRaw, PayerPersonId, DateOpened, AmountToPay)
SELECT
    sti.PayerRaw,
    sti.PayerPersonId,
    MIN(sti.RegDate) AS DateOpened,
    SUM(sti.AmountToPay) AS AmountToPay
FROM #StageToInsert sti
GROUP BY
    sti.PayerRaw,
    sti.PayerPersonId;

MERGE Bill AS target
USING #PayerTotals AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (PaidByPersonId, AmountToPay, DateOpened, DateClosed)
    VALUES (src.PayerPersonId, src.AmountToPay, src.DateOpened, NULL)
OUTPUT
    src.PayerRaw,
    inserted.BillId
INTO #InsertedBillByPayer (PayerRaw, BillId);
IF OBJECT_ID('tempdb..#InsertedBill') IS NOT NULL DROP TABLE #InsertedBill;
CREATE TABLE #InsertedBill
(
    StageRowId INT PRIMARY KEY,
    BillId INT NOT NULL
);

INSERT INTO #InsertedBill (StageRowId, BillId)
SELECT
    sti.StageRowId,
    ibp.BillId
FROM #StageToInsert sti
JOIN #InsertedBillByPayer ibp
    ON ibp.PayerRaw = sti.PayerRaw;

IF OBJECT_ID('tempdb..#InsertedServiceRequest') IS NOT NULL DROP TABLE #InsertedServiceRequest;
CREATE TABLE #InsertedServiceRequest
(
    StageRowId INT PRIMARY KEY,
    SRequestId INT NOT NULL
);

IF OBJECT_ID('tempdb..#ServiceRequestSource') IS NOT NULL DROP TABLE #ServiceRequestSource;
CREATE TABLE #ServiceRequestSource
(
    StageRowId INT PRIMARY KEY,
    OrderedBySystemUserId INT NOT NULL,
    HorseId INT NOT NULL,
    RiderFederationMemberId INT NOT NULL,
    CoachFederationMemberId INT NOT NULL,
    BillId INT NOT NULL,
    SRequestDateTime DATETIME2(0) NOT NULL
);

INSERT INTO #ServiceRequestSource
(
    StageRowId,
    OrderedBySystemUserId,
    HorseId,
    RiderFederationMemberId,
    CoachFederationMemberId,
    BillId,
    SRequestDateTime
)
SELECT
    s.StageRowId,
    s.OrderedBySystemUserId,
    s.HorseId,
    s.RiderPersonId,
    s.CoachFederationMemberId,
    b.BillId,
    s.RegDate
FROM #StageEntry s
JOIN #InsertedBill b
    ON b.StageRowId = s.StageRowId;

MERGE ServiceRequest AS target
USING #ServiceRequestSource AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT
    (
        OrderedBySystemUserId,
        HorseId,
        RiderFederationMemberId,
        CoachFederationMemberId,
        BillId,
        PaymentId,
        SRequestDateTime
    )
    VALUES
    (
        src.OrderedBySystemUserId,
        src.HorseId,
        src.RiderFederationMemberId,
        src.CoachFederationMemberId,
        src.BillId,
        NULL,
        src.SRequestDateTime
    )
OUTPUT
    src.StageRowId,
    inserted.SRequestId
INTO #InsertedServiceRequest (StageRowId, SRequestId);


INSERT INTO Entry (EntryId, ClassInCompId, FineId, PrizeRecipientName, DrawOrder)
SELECT
    isr.SRequestId,
    s.ClassInCompId,
    NULL,
    NULL,
    s.DrawOrder
FROM #StageEntry s
JOIN #InsertedServiceRequest isr
    ON isr.StageRowId = s.StageRowId;

SELECT COUNT(*) AS InsertedEntries
FROM #InsertedServiceRequest;

COMMIT TRAN;
GO


SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @CompetitionId INT = 4;
DECLARE @HostRanchId INT;
DECLARE @PaidTimeDate DATE;

SELECT
    @HostRanchId = c.HostRanchId,
    @PaidTimeDate = DATEADD(DAY, -1, c.CompetitionStartDate)
FROM Competition c
WHERE c.CompetitionId = @CompetitionId;

IF @HostRanchId IS NULL
BEGIN
    RAISERROR(N'CompetitionId לא נמצא.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;
/* -----------------------------------------
   1) כל הסלוטים של יום שלישי
      3,5,7 = 10
      כל השאר = 8
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_TuesdaySlots') IS NOT NULL DROP TABLE #PT_TuesdaySlots;

SELECT
    ROW_NUMBER() OVER (ORDER BY ptsc.StartTime, ptsc.CompSlotId) AS SlotOrder,
    ptsc.CompSlotId,
    ptsc.PaidTimeSlotId,
    ptsc.SlotDate,
    ptsc.StartTime,
    ptsc.EndTime,
    CASE
        WHEN ptsc.CompSlotId IN (3, 5, 7) THEN 10
        ELSE 9
    END AS SlotCap
INTO #PT_TuesdaySlots
FROM PaidTimeSlotInCompetition ptsc
WHERE ptsc.CompetitionId = @CompetitionId
  AND ptsc.SlotDate = @PaidTimeDate;

IF NOT EXISTS (SELECT 1 FROM #PT_TuesdaySlots)
BEGIN
    RAISERROR(N'לא נמצאו סלוטים של פייד טיים ליום שלישי בתחרות זו.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;


/* -----------------------------------------
   2) מחירונים פעילים של פייד טיים קצר / ארוך
   ----------------------------------------- */
DECLARE @ShortCatalogItemId INT;
DECLARE @LongCatalogItemId INT;

SELECT TOP 1
    @ShortCatalogItemId = pc.CatalogItemId
FROM PriceCatalog pc
JOIN PaidTimeProduct ptp
    ON ptp.ProductId = pc.ProductId
WHERE pc.RanchId = @HostRanchId
  AND pc.IsActive = 1
  AND ptp.DurationMinutes = 7
ORDER BY pc.CatalogItemId DESC;

SELECT TOP 1
    @LongCatalogItemId = pc.CatalogItemId
FROM PriceCatalog pc
JOIN PaidTimeProduct ptp
    ON ptp.ProductId = pc.ProductId
WHERE pc.RanchId = @HostRanchId
  AND pc.IsActive = 1
  AND ptp.DurationMinutes = 10
ORDER BY pc.CatalogItemId DESC;

IF @ShortCatalogItemId IS NULL OR @LongCatalogItemId IS NULL
BEGIN
    RAISERROR(N'חסר PriceCatalog פעיל לפייד טיים קצר/ארוך.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;

/* -----------------------------------------
   3) בסיס: סוסים שכבר רשומים למקצים בתחרות
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_HorseBase') IS NOT NULL DROP TABLE #PT_HorseBase;

WITH BasePerHorse AS
(
    SELECT
        sr.HorseId,
        sr.OrderedBySystemUserId,
        sr.RiderFederationMemberId,
        sr.CoachFederationMemberId,
        b.PaidByPersonId,
        ROW_NUMBER() OVER
        (
            PARTITION BY sr.HorseId
            ORDER BY cic.ClassDateTime, e.DrawOrder, e.EntryId
        ) AS rn
    FROM Entry e
    JOIN ServiceRequest sr
        ON sr.SRequestId = e.EntryId
    JOIN Bill b
        ON b.BillId = sr.BillId
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = e.ClassInCompId
    WHERE cic.CompetitionId = @CompetitionId
      AND NOT EXISTS
      (
          SELECT 1
          FROM PaidTimeRequest ptr
          JOIN ServiceRequest sr2
              ON sr2.SRequestId = ptr.PaidTimeRequestId
          JOIN PaidTimeSlotInCompetition ptsc2
              ON ptsc2.CompSlotId = ptr.AssignedCompSlotId
          WHERE ptsc2.CompetitionId = @CompetitionId
            AND sr2.HorseId = sr.HorseId
      )
)
SELECT
    ROW_NUMBER() OVER (ORDER BY HorseId) AS RowNo,
    HorseId,
    OrderedBySystemUserId,
    RiderFederationMemberId,
    CoachFederationMemberId,
    PaidByPersonId
INTO #PT_HorseBase
FROM BasePerHorse
WHERE rn = 1;

IF NOT EXISTS (SELECT 1 FROM #PT_HorseBase)
BEGIN
    RAISERROR(N'לא נמצאו סוסים להוספת פייד טיים, או שכבר יש לכולם פייד טיים בתחרות.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;

/* -----------------------------------------
   4) טווחי קיבולת לכל סלוט
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_SlotCapacityRange') IS NOT NULL DROP TABLE #PT_SlotCapacityRange;

WITH SlotBase AS
(
    SELECT
        ts.SlotOrder,
        ts.CompSlotId,
        ts.PaidTimeSlotId,
        ts.SlotDate,
        ts.StartTime,
        ts.EndTime,
        ts.SlotCap,
        ISNULL(
            SUM(ts.SlotCap) OVER
            (
                ORDER BY ts.SlotOrder
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            0
        ) + 1 AS FromSeq,
        SUM(ts.SlotCap) OVER
        (
            ORDER BY ts.SlotOrder
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS ToSeq
    FROM #PT_TuesdaySlots ts
)
SELECT
    SlotOrder,
    CompSlotId,
    PaidTimeSlotId,
    SlotDate,
    StartTime,
    EndTime,
    SlotCap,
    FromSeq,
    ToSeq
INTO #PT_SlotCapacityRange
FROM SlotBase;

/* -----------------------------------------
   5) בדיקת קיבולת כוללת
   ----------------------------------------- */
DECLARE @HorseCount INT;
DECLARE @TotalCapacity INT;

SELECT @HorseCount = COUNT(*) FROM #PT_HorseBase;
SELECT @TotalCapacity = SUM(SlotCap) FROM #PT_SlotCapacityRange;

IF @HorseCount > @TotalCapacity
BEGIN
    SELECT *
    FROM #PT_HorseBase
    WHERE RowNo > @TotalCapacity
    ORDER BY RowNo;

    RAISERROR(N'יש יותר סוסים מהקיבולת הכוללת של סלוטי הפייד טיים ביום שלישי.', 16, 1);
    ROLLBACK TRAN;
    RETURN;
END;

/* -----------------------------------------
   6) StagePaidTime
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_StagePaidTime') IS NOT NULL DROP TABLE #PT_StagePaidTime;

SELECT
    IDENTITY(INT,1,1) AS StageRowId,
    hb.HorseId,
    hb.OrderedBySystemUserId,
    hb.RiderFederationMemberId,
    hb.CoachFederationMemberId,
    hb.PaidByPersonId,
    CASE WHEN hb.RowNo % 2 = 1 THEN @ShortCatalogItemId ELSE @LongCatalogItemId END AS CatalogItemId,
    scr.CompSlotId AS RequestedCompSlotId,
    scr.CompSlotId AS AssignedCompSlotId,
    DATEADD
    (
        MINUTE,
        ((hb.RowNo - scr.FromSeq) * (120 / scr.SlotCap)),
        DATETIMEFROMPARTS
        (
            YEAR(scr.SlotDate),
            MONTH(scr.SlotDate),
            DAY(scr.SlotDate),
            DATEPART(HOUR, scr.StartTime),
            DATEPART(MINUTE, scr.StartTime),
            0,
            0
        )
    ) AS AssignedStartTime,
    pc.ItemPrice AS AmountToPay
INTO #PT_StagePaidTime
FROM #PT_HorseBase hb
JOIN #PT_SlotCapacityRange scr
    ON hb.RowNo BETWEEN scr.FromSeq AND scr.ToSeq
JOIN PriceCatalog pc
    ON pc.CatalogItemId =
       CASE WHEN hb.RowNo % 2 = 1 THEN @ShortCatalogItemId ELSE @LongCatalogItemId END;

/* -----------------------------------------
   7) Bill אחד לכל משלם
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_InsertedBillByPayer') IS NOT NULL DROP TABLE #PT_InsertedBillByPayer;
CREATE TABLE #PT_InsertedBillByPayer
(
    PaidByPersonId INT PRIMARY KEY,
    BillId INT NOT NULL
);

IF OBJECT_ID('tempdb..#PT_PayerTotals') IS NOT NULL DROP TABLE #PT_PayerTotals;

SELECT
    spt.PaidByPersonId,
    MIN(spt.AssignedStartTime) AS DateOpened,
    SUM(spt.AmountToPay) AS AmountToPay
INTO #PT_PayerTotals
FROM #PT_StagePaidTime spt
GROUP BY spt.PaidByPersonId;

MERGE Bill AS target
USING #PT_PayerTotals AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT (PaidByPersonId, AmountToPay, DateOpened, DateClosed)
    VALUES (src.PaidByPersonId, src.AmountToPay, src.DateOpened, NULL)
OUTPUT
    src.PaidByPersonId,
    inserted.BillId
INTO #PT_InsertedBillByPayer (PaidByPersonId, BillId);

/* -----------------------------------------
   8) ServiceRequest
   ----------------------------------------- */
IF OBJECT_ID('tempdb..#PT_InsertedServiceRequest') IS NOT NULL DROP TABLE #PT_InsertedServiceRequest;
CREATE TABLE #PT_InsertedServiceRequest
(
    StageRowId INT PRIMARY KEY,
    SRequestId INT NOT NULL
);

IF OBJECT_ID('tempdb..#PT_ServiceRequestSource') IS NOT NULL DROP TABLE #PT_ServiceRequestSource;

SELECT
    spt.StageRowId,
    spt.OrderedBySystemUserId,
    spt.HorseId,
    spt.RiderFederationMemberId,
    spt.CoachFederationMemberId,
    ib.BillId,
    spt.AssignedStartTime AS SRequestDateTime
INTO #PT_ServiceRequestSource
FROM #PT_StagePaidTime spt
JOIN #PT_InsertedBillByPayer ib
    ON ib.PaidByPersonId = spt.PaidByPersonId;

MERGE ServiceRequest AS target
USING #PT_ServiceRequestSource AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT
    (
        OrderedBySystemUserId,
        HorseId,
        RiderFederationMemberId,
        CoachFederationMemberId,
        BillId,
        PaymentId,
        SRequestDateTime
    )
    VALUES
    (
        src.OrderedBySystemUserId,
        src.HorseId,
        src.RiderFederationMemberId,
        src.CoachFederationMemberId,
        src.BillId,
        NULL,
        src.SRequestDateTime
    )
OUTPUT
    src.StageRowId,
    inserted.SRequestId
INTO #PT_InsertedServiceRequest (StageRowId, SRequestId);

/* -----------------------------------------
   9) PaidTimeRequest
   ----------------------------------------- */
INSERT INTO PaidTimeRequest
(
    PaidTimeRequestId,
    CatalogItemId,
    RequestedCompSlotId,
    AssignedCompSlotId,
    AssignedStartTime,
    [Status],
    Notes
)
SELECT
    isr.SRequestId,
    spt.CatalogItemId,
    spt.RequestedCompSlotId,
    spt.AssignedCompSlotId,
    spt.AssignedStartTime,
    N'שובץ',
    N'נוצר אוטומטית לכל סוס עם כניסה למקצה'
FROM #PT_StagePaidTime spt
JOIN #PT_InsertedServiceRequest isr
    ON isr.StageRowId = spt.StageRowId;

/* -----------------------------------------
   10) סיכום
   ----------------------------------------- */
SELECT COUNT(*) AS InsertedPaidTimeRequests
FROM #PT_InsertedServiceRequest;

SELECT
    scr.CompSlotId,
    scr.StartTime,
    scr.EndTime,
    scr.SlotCap,
    COUNT(ptr.PaidTimeRequestId) AS AssignedCount
FROM #PT_SlotCapacityRange scr
LEFT JOIN PaidTimeRequest ptr
    ON ptr.AssignedCompSlotId = scr.CompSlotId
GROUP BY
    scr.CompSlotId,
    scr.StartTime,
    scr.EndTime,
    scr.SlotCap
ORDER BY scr.StartTime;

COMMIT TRAN;
GO

USE RideOn;
GO


IF OBJECT_ID('tempdb..#HorseBaseForStalls') IS NOT NULL DROP TABLE #HorseBaseForStalls;
IF OBJECT_ID('tempdb..#StageStallBooking') IS NOT NULL DROP TABLE #StageStallBooking;
IF OBJECT_ID('tempdb..#SB_PR_Source') IS NOT NULL DROP TABLE #SB_PR_Source;
IF OBJECT_ID('tempdb..#SB_InsertedPR') IS NOT NULL DROP TABLE #SB_InsertedPR;

;WITH HorseBase AS
(
    SELECT
        sr.HorseId,
        h.HorseName,
        h.BarnName,
        h.RanchId,
        r.RanchName,
        sr.OrderedBySystemUserId,
        b.PaidByPersonId,
        ROW_NUMBER() OVER
        (
            PARTITION BY sr.HorseId
            ORDER BY e.EntryId
        ) AS rn
    FROM Entry e
    JOIN ServiceRequest sr
        ON sr.SRequestId = e.EntryId
    JOIN Bill b
        ON b.BillId = sr.BillId
    JOIN Horse h
        ON h.HorseId = sr.HorseId
    JOIN Ranch r
        ON r.RanchId = h.RanchId
    JOIN ClassInCompetition cic
        ON cic.ClassInCompId = e.ClassInCompId
    WHERE cic.CompetitionId = 4
      AND h.RanchId <> 11
)
SELECT
    HorseId,
    HorseName,
    BarnName,
    RanchId,
    RanchName,
    OrderedBySystemUserId,
    PaidByPersonId
INTO #HorseBaseForStalls
FROM HorseBase
WHERE rn = 1;

CREATE TABLE #StageStallBooking
(
    StageRowId INT IDENTITY(1,1) PRIMARY KEY,
    BookingType NVARCHAR(20) NOT NULL,
    RanchName NVARCHAR(100) NOT NULL,
    HorseId INT NULL,
    HorseName NVARCHAR(100) NULL,
    BarnName NVARCHAR(100) NULL,
    OrderedBySystemUserId INT NOT NULL,
    PaidByPersonId INT NOT NULL,
    StallRanchId INT NOT NULL,
    StallCompoundId TINYINT NOT NULL,
    StallId SMALLINT NOT NULL,
    StallNumber NVARCHAR(20) NOT NULL,
    CatalogItemId INT NOT NULL,
    CheckInDate DATE NOT NULL,
    CheckOutDate DATE NOT NULL,
    IsForTack BIT NOT NULL,
    Notes NVARCHAR(200) NULL
);

/* =========================
   תאי סוסים
   ========================= */

INSERT INTO #StageStallBooking
(
    BookingType, RanchName, HorseId, HorseName, BarnName,
    OrderedBySystemUserId, PaidByPersonId,
    StallRanchId, StallCompoundId, StallId, StallNumber,
    CatalogItemId, CheckInDate, CheckOutDate, IsForTack, Notes
)
SELECT
    N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
    hb.OrderedBySystemUserId, hb.PaidByPersonId,
    11, 3, 17, N'50',
    4, '2025-10-14', '2025-10-18', 0, N'GI'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'GI' AND hb.HorseId = 327;

INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 2, N'11', 4, '2025-10-14', '2025-10-18', 0, N'JP'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'JP' AND hb.HorseId = 440;

INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 3, N'12', 4, '2025-10-14', '2025-10-18', 0, N'JP'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'JP' AND hb.HorseId = 463;

INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 4, N'20', 4, '2025-10-14', '2025-10-18', 0, N'JP'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'JP' AND hb.HorseId = 355;

/* KPH */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 8, N'30', 4, '2025-10-14', '2025-10-18', 0, N'KPH'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'KPH' AND hb.HorseId = 330;

INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 9, N'31', 4, '2025-10-14', '2025-10-18', 0, N'KPH'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'KPH' AND hb.HorseId = 329;

INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 3, 10, N'32', 4, '2025-10-14', '2025-10-18', 0, N'KPH'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'KPH' AND hb.HorseId = 464;

/* LD */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 405 THEN 88
            WHEN 407 THEN 89
            WHEN 411 THEN 91
            WHEN 412 THEN 92
            WHEN 414 THEN 93
            WHEN 503 THEN 94
            WHEN 415 THEN 95
            WHEN 418 THEN 96
       END,
       CASE hb.HorseId
            WHEN 405 THEN N'901'
            WHEN 407 THEN N'902'
            WHEN 411 THEN N'904'
            WHEN 412 THEN N'905'
            WHEN 414 THEN N'906'
            WHEN 503 THEN N'907'
            WHEN 415 THEN N'908'
            WHEN 418 THEN N'909'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'LD'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'LD'
  AND hb.HorseId IN (405,407,411,412,414,503,415,418);

/* אביטל */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 80, N'810', 3, '2025-10-14', '2025-10-18', 0, N'אביטל'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'אביטל' AND hb.HorseId = 338;

/* אורוות הכרמל */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId WHEN 427 THEN 61 WHEN 396 THEN 62 END,
       CASE hb.HorseId WHEN 427 THEN N'701' WHEN 396 THEN N'702' END,
       3, '2025-10-14', '2025-10-18', 0, N'אורוות הכרמל'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'אורוות הכרמל' AND hb.HorseId IN (427,396);

/* בני */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 66, N'706', 3, '2025-10-14', '2025-10-18', 0, N'בני'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'בני' AND hb.HorseId = 417;

/* דניאל */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 348 THEN 11
            WHEN 323 THEN 12
            WHEN 311 THEN 14
            WHEN 394 THEN 15
       END,
       CASE hb.HorseId
            WHEN 348 THEN N'201'
            WHEN 323 THEN N'202'
            WHEN 311 THEN N'204'
            WHEN 394 THEN N'205'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'דניאל'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'דניאל' AND hb.HorseId IN (348,323,311,394);

/* דקניט */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 83, N'815', 3, '2025-10-14', '2025-10-18', 0, N'דקניט'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'דקניט' AND hb.HorseId = 259;

/* המחוג */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 2,
       CASE hb.HorseId
            WHEN 459 THEN 23
            WHEN 454 THEN 24
            WHEN 310 THEN 25
            WHEN 455 THEN 26
       END,
       CASE hb.HorseId
            WHEN 459 THEN N'1022'
            WHEN 454 THEN N'1023'
            WHEN 310 THEN N'1024'
            WHEN 455 THEN N'1025'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'המחוג'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'המחוג' AND hb.HorseId IN (459,454,310,455);

/* הרלב - ברק */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 4,
       CASE hb.HorseId
            WHEN 456 THEN 32
            WHEN 458 THEN 33
            WHEN 430 THEN 34
       END,
       CASE hb.HorseId
            WHEN 456 THEN N'32'
            WHEN 458 THEN N'33'
            WHEN 430 THEN N'34'
       END,
       4, '2025-10-14', '2025-10-18', 0, N'הרלב-ברק'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'הרלב' AND hb.HorseId IN (456,458,430);

/* הרלב - אוריין */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 269 THEN 69
            WHEN 298 THEN 70
            WHEN 419 THEN 71
       END,
       CASE hb.HorseId
            WHEN 269 THEN N'709'
            WHEN 298 THEN N'710'
            WHEN 419 THEN N'711'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'הרלב-אוריין'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'הרלב' AND hb.HorseId IN (269,298,419);

/* יפעת */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 63, N'703', 3, '2025-10-14', '2025-10-18', 0, N'יפעת'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'יפעת' AND hb.HorseId = 391;

/* משה */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 451 THEN 46
            WHEN 15  THEN 47
            WHEN 293 THEN 48
            WHEN 413 THEN 37
       END,
       CASE hb.HorseId
            WHEN 451 THEN N'507'
            WHEN 15  THEN N'508'
            WHEN 293 THEN N'509'
            WHEN 413 THEN N'407'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'משה'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'משה' AND hb.HorseId IN (451,15,293,413);

/* נוה עמיאל */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 408 THEN 35
            WHEN 409 THEN 36
            WHEN 410 THEN 45
       END,
       CASE hb.HorseId
            WHEN 408 THEN N'405'
            WHEN 409 THEN N'406'
            WHEN 410 THEN N'506'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'נוה עמיאל'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'נוה עמיאל' AND hb.HorseId IN (408,409,410);

/* נטלי */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 2, 1, N'1001', 3, '2025-10-14', '2025-10-18', 0, N'נטלי'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'נטלי' AND hb.HorseId = 390;

/* נען */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 307 THEN 40
            WHEN 360 THEN 41
            WHEN 256 THEN 42
            WHEN 373 THEN 43
            WHEN 447 THEN 32
       END,
       CASE hb.HorseId
            WHEN 307 THEN N'501'
            WHEN 360 THEN N'502'
            WHEN 256 THEN N'503'
            WHEN 373 THEN N'504'
            WHEN 447 THEN N'401'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'נען'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'נען' AND hb.HorseId IN (307,360,256,373,447);

/* סבנטי */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 1, N'101', 3, '2025-10-14', '2025-10-18', 0, N'סבנטי'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'סבנטי' AND hb.HorseId = 346;

/* רטורנו */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1, 65, N'705', 3, '2025-10-14', '2025-10-18', 0, N'רטורנו'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'רטורנו' AND hb.HorseId = 174;

/* רמת יוחנן */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 2,
       CASE hb.HorseId
            WHEN 380 THEN 3
            WHEN 421 THEN 4
            WHEN 290 THEN 5
            WHEN 372 THEN 6
            WHEN 378 THEN 7
            WHEN 359 THEN 8
            WHEN 416 THEN 9
            WHEN 317 THEN 11
       END,
       CASE hb.HorseId
            WHEN 380 THEN N'1003'
            WHEN 421 THEN N'1004'
            WHEN 290 THEN N'1005'
            WHEN 372 THEN N'1006'
            WHEN 378 THEN N'1007'
            WHEN 359 THEN N'1008'
            WHEN 416 THEN N'1009'
            WHEN 317 THEN N'1011'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'רמת יוחנן'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'רמת יוחנן' AND hb.HorseId IN (380,421,290,372,378,359,416,317);

/* שוגר */
INSERT INTO #StageStallBooking
SELECT N'Horse', hb.RanchName, hb.HorseId, hb.HorseName, hb.BarnName,
       hb.OrderedBySystemUserId, hb.PaidByPersonId,
       11, 1,
       CASE hb.HorseId
            WHEN 354 THEN 73
            WHEN 472 THEN 74
            WHEN 289 THEN 75
            WHEN 387 THEN 76
       END,
       CASE hb.HorseId
            WHEN 354 THEN N'801'
            WHEN 472 THEN N'802'
            WHEN 289 THEN N'803'
            WHEN 387 THEN N'804'
       END,
       3, '2025-10-14', '2025-10-18', 0, N'שוגר'
FROM #HorseBaseForStalls hb
WHERE hb.RanchName = N'שוגר' AND hb.HorseId IN (354,472,289,387);

/* =========================
   תאי ציוד
   ========================= */

INSERT INTO #StageStallBooking
VALUES
(N'Tack', N'GI',       NULL, NULL, NULL, 2372, 167, 11, 3, 20, N'60',   4, '2025-10-14', '2025-10-18', 1, N'ציוד GI - הדסה עזריה'),
(N'Tack', N'JP',       NULL, NULL, NULL, 624, 2338, 11, 3, 1,  N'10',   4, '2025-10-14', '2025-10-18', 1, N'ציוד JP'),
(N'Tack', N'KPH',      NULL, NULL, NULL, 348, 316,  11, 3, 15, N'43',   4, '2025-10-14', '2025-10-18', 1, N'ציוד KPH'),
(N'Tack', N'LD',       NULL, NULL, NULL, 2327, 471, 11, 1, 90, N'903',  3, '2025-10-14', '2025-10-18', 1, N'ציוד LD'),
(N'Tack', N'אורוות הכרמל', NULL, NULL, NULL, 722, 722, 11, 1, 49, N'601', 3, '2025-10-14', '2025-10-18', 1, N'ציוד אורוות הכרמל'),
(N'Tack', N'דניאל',    NULL, NULL, NULL, 88,  2773,11, 1, 13, N'203',  3, '2025-10-14', '2025-10-18', 1, N'ציוד דניאל'),
(N'Tack', N'הרלב-גיא', NULL, NULL, NULL, 2372, 2372,11, 1, 60, N'612',  3, '2025-10-14', '2025-10-18', 1, N'ציוד הרלב גיא'),
(N'Tack', N'הרלב-ברק', NULL, NULL, NULL, 374, 2646, 11, 4, 36, N'36',   4, '2025-10-14', '2025-10-18', 1, N'ציוד הרלב ברק'),
(N'Tack', N'יפעת',     NULL, NULL, NULL, 515, 4168, 11, 1, 52, N'604',  3, '2025-10-14', '2025-10-18', 1, N'ציוד יפעת - מאיה קרא'),
(N'Tack', N'משה',      NULL, NULL, NULL, 201, 201,  11, 1, 38, N'408',  3, '2025-10-14', '2025-10-18', 1, N'ציוד משה - משה סייג'),
(N'Tack', N'נען',      NULL, NULL, NULL, 519, 300,  11, 1, 33, N'403',  3, '2025-10-14', '2025-10-18', 1, N'ציוד נען'),
(N'Tack', N'סבנטי-109',NULL, NULL, NULL, 530, 3512, 11, 1, 9,  N'109',  3, '2025-10-14', '2025-10-18', 1, N'ציוד סבנטי 109'),
(N'Tack', N'סבנטי-110',NULL, NULL, NULL, 530, 3512, 11, 1, 10, N'110',  3, '2025-10-14', '2025-10-18', 1, N'ציוד סבנטי 110'),
(N'Tack', N'רמת יוחנן-1010', NULL, NULL, NULL, 491, 598, 11, 2, 10, N'1010', 3, '2025-10-14', '2025-10-18', 1, N'ציוד רמת יוחנן 1010'),
(N'Tack', N'רמת יוחנן-1014', NULL, NULL, NULL, 491, 598, 11, 2, 14, N'1014', 3, '2025-10-14', '2025-10-18', 1, N'ציוד רמת יוחנן 1014'),
(N'Tack', N'שוגר',     NULL, NULL, NULL, 398, 368,  11, 1, 77, N'805',  3, '2025-10-14', '2025-10-18', 1, N'ציוד שוגר');

/* =========================
   עדכון תאריכים מהאקסל
   ========================= */

UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ג''יי ג''יי (ליל קאש משין)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-16' WHERE BookingType = N'Horse' AND HorseName = N'גאנרס רייט';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'גולם';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'דונט קוושצ''ן דיס וויז';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'פרוזן צ''קס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'אברי דיי צ''קס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'אפיק רבולושיין';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'מאני גאן טרי';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'מודיפייד';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'מיס גוג ריקו';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'סי.סי. פארל ג''אם';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ספיד';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'פריטי ג''ינייס גאן (רובי)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'פול אופשיונל גאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ווימפי מאני גאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'רוז (גאנר ספיישל רוז)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-15' WHERE BookingType = N'Horse' AND HorseName = N'פיין לוקינג בנצ''יק';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'אינסטנט סמארט (פיצי)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'אקסטרה סטפ באלו';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'צ׳קס אולינה בלו';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'אר וואי יו אר ספיישל ';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'ג''ואנס ביג סטאר ';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'ספיישל בוגי נייט ';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'סולטן טרשיה (סולטן)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ספייס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'קסטום מייד מגנום (סטיב)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'אנני';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'בריליאנט גאנר';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'צ''יק קאט דיס גאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'מיי בלה טרי';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'גאנס פור מוזס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-15' WHERE BookingType = N'Horse' AND HorseName = N'זאוס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'מופאסה';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ביג מאני גאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'הופ אנד וינטאג';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ווימפס סמות'' סטפ ביבי';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'שייני סאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-13', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'לאוטה צ''קס';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-15', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'צ''קס פאנטסי';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'אינפרנו דאן איט';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'דונה';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'ספוק רייט און';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-14', CheckOutDate = '2025-10-17' WHERE BookingType = N'Horse' AND HorseName = N'ספשייל רויאל גאן';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'פיגו (פיור טיזור)';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'ג''יי ג''יי מגנום דאניט צ''יק';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'דה ליידיס לאב מי ';
UPDATE #StageStallBooking SET CheckInDate = '2025-10-12', CheckOutDate = '2025-10-18' WHERE BookingType = N'Horse' AND HorseName = N'סאטרדיי פפר נייט';

/* =========================
   בדיקה
   ========================= */

SELECT
    BookingType,
    RanchName,
    HorseId,
    HorseName,
    StallCompoundId,
    StallId,
    StallNumber,
    CatalogItemId,
    CheckInDate,
    CheckOutDate,
    OrderedBySystemUserId,
    PaidByPersonId,
    IsForTack,
    Notes
FROM #StageStallBooking
ORDER BY RanchName, IsForTack, StallCompoundId, StallNumber;

/* =========================================
   הכנסת תאים - ProductRequest + StallBooking
   ========================================= */

SELECT DISTINCT
    s.StageRowId,
    s.BookingType,
    s.RanchName,
    s.OrderedBySystemUserId
FROM #StageStallBooking s
LEFT JOIN SystemUser su
    ON su.SystemUserId = s.OrderedBySystemUserId
WHERE su.SystemUserId IS NULL;

SELECT
    s.StageRowId,
    4 AS CompetitionId,
    s.OrderedBySystemUserId,
    s.CatalogItemId,
    CAST('2025-09-27 00:00:00' AS DATETIME2(0)) AS PRequestDateTime,
    s.Notes,
    CAST('2025-09-27 00:00:00' AS DATETIME2(0)) AS ApprovalDate
INTO #SB_PR_Source
FROM #StageStallBooking s;

CREATE TABLE #SB_InsertedPR
(
    StageRowId INT PRIMARY KEY,
    PRequestId INT NOT NULL
);

MERGE ProductRequest AS target
USING #SB_PR_Source AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT
    (
        CompetitionId,
        OrderedBySystemUserId,
        CatalogItemId,
        PRequestDateTime,
        Notes,
        ApprovalDate
    )
    VALUES
    (
        src.CompetitionId,
        src.OrderedBySystemUserId,
        src.CatalogItemId,
        src.PRequestDateTime,
        src.Notes,
        src.ApprovalDate
    )
OUTPUT
    src.StageRowId,
    inserted.PRequestId
INTO #SB_InsertedPR (StageRowId, PRequestId);

INSERT INTO StallBooking
(
    StallBookingId,
    StallRanchId,
    StallCompoundId,
    StallId,
    HorseId,
    CheckInDate,
    CheckOutDate,
    IsForTack
)
SELECT
    ip.PRequestId,
    s.StallRanchId,
    s.StallCompoundId,
    s.StallId,
    s.HorseId,
    s.CheckInDate,
    s.CheckOutDate,
    s.IsForTack
FROM #StageStallBooking s
JOIN #SB_InsertedPR ip
    ON ip.StageRowId = s.StageRowId;


	USE RideOn;
GO

IF OBJECT_ID('tempdb..#HorseStallBase') IS NOT NULL DROP TABLE #HorseStallBase;
IF OBJECT_ID('tempdb..#StageShavingsLine') IS NOT NULL DROP TABLE #StageShavingsLine;
IF OBJECT_ID('tempdb..#StageShavingsOrder') IS NOT NULL DROP TABLE #StageShavingsOrder;
IF OBJECT_ID('tempdb..#SH_PR_Source') IS NOT NULL DROP TABLE #SH_PR_Source;
IF OBJECT_ID('tempdb..#SH_InsertedPR') IS NOT NULL DROP TABLE #SH_InsertedPR;

;WITH HorseStallBase AS
(
    SELECT
        sb.StallBookingId,
        sb.HorseId,
        h.HorseName,
        h.RanchId,
        r.RanchName,
        pr.OrderedBySystemUserId,
        ROW_NUMBER() OVER (PARTITION BY sb.HorseId ORDER BY sb.StallBookingId) AS rn
    FROM StallBooking sb
    JOIN ProductRequest pr
        ON pr.PRequestId = sb.StallBookingId
    JOIN Horse h
        ON h.HorseId = sb.HorseId
    JOIN Ranch r
        ON r.RanchId = h.RanchId
    WHERE pr.CompetitionId = 4
      AND sb.IsForTack = 0
      AND sb.HorseId IS NOT NULL
)
SELECT
    StallBookingId,
    HorseId,
    HorseName,
    RanchId,
    RanchName,
    OrderedBySystemUserId
INTO #HorseStallBase
FROM HorseStallBase
WHERE rn = 1;

CREATE TABLE #StageShavingsLine
(
    LineId INT IDENTITY(1,1) PRIMARY KEY,
    OrderGroupKey NVARCHAR(100) NOT NULL,
    RanchName NVARCHAR(100) NOT NULL,
    HorseId INT NOT NULL,
    StallBookingId INT NOT NULL,
    OrderedBySystemUserId INT NOT NULL,
    BagQuantityPerStall TINYINT NOT NULL
);

/* =========================
   הזמנות מרוכזות לפי חווה
   ========================= */

-- GI = 1
INSERT INTO #StageShavingsLine (OrderGroupKey, RanchName, HorseId, StallBookingId, OrderedBySystemUserId, BagQuantityPerStall)
SELECT N'GI', N'GI', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 1
FROM #HorseStallBase b
WHERE b.HorseId = 327;

-- JP = 11
INSERT INTO #StageShavingsLine
SELECT N'JP', N'JP', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId,
       CASE b.HorseId WHEN 440 THEN 4 WHEN 463 THEN 4 WHEN 355 THEN 3 END
FROM #HorseStallBase b
WHERE b.HorseId IN (440,463,355);

-- LD = 32
INSERT INTO #StageShavingsLine
SELECT N'LD', N'LD', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId IN (405,407,411,412,414,503,415,418);

-- דניאל = 8
INSERT INTO #StageShavingsLine
SELECT N'דניאל', N'דניאל', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 2
FROM #HorseStallBase b
WHERE b.HorseId IN (348,323,311,394);

-- המחוג = 12
INSERT INTO #StageShavingsLine
SELECT N'המחוג', N'המחוג', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 3
FROM #HorseStallBase b
WHERE b.HorseId IN (459,454,310,455);

-- משה = 8
INSERT INTO #StageShavingsLine
SELECT N'משה', N'משה', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 2
FROM #HorseStallBase b
WHERE b.HorseId IN (451,413,293,15);

-- נען = 15
INSERT INTO #StageShavingsLine
SELECT N'נען', N'נען', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 3
FROM #HorseStallBase b
WHERE b.HorseId IN (447,373,360,307,256);

/* =========================
   הזמנות נפרדות לכל סוס
   ========================= */

-- אורוות הכרמל
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'אורוות הכרמל-', b.HorseId), N'אורוות הכרמל', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId,
       CASE b.HorseId WHEN 427 THEN 2 WHEN 396 THEN 2 END
FROM #HorseStallBase b
WHERE b.HorseId IN (427,396);

-- דקניט
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'דקניט-', b.HorseId), N'דקניט', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId = 259;

-- הרלב
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'הרלב-', b.HorseId), N'הרלב', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId IN (269,298,419,456,458,430);

-- יפעת
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'יפעת-', b.HorseId), N'יפעת', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId = 391;

-- נוה עמיאל
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'נוה עמיאל-', b.HorseId), N'נוה עמיאל', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId,
       CASE b.HorseId WHEN 408 THEN 2 WHEN 409 THEN 2 WHEN 410 THEN 2 END
FROM #HorseStallBase b
WHERE b.HorseId IN (408,409,410);

-- נטלי
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'נטלי-', b.HorseId), N'נטלי', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 2
FROM #HorseStallBase b
WHERE b.HorseId = 390;

-- סבנטי
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'סבנטי-', b.HorseId), N'סבנטי', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId = 346;

-- רטורנו
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'רטורנו-', b.HorseId), N'רטורנו', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 2
FROM #HorseStallBase b
WHERE b.HorseId = 174;

-- רמת יוחנן
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'רמת יוחנן-', b.HorseId), N'רמת יוחנן', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId,
       CASE b.HorseId
            WHEN 421 THEN 4
            WHEN 416 THEN 4
            WHEN 380 THEN 3
            WHEN 378 THEN 3
            WHEN 372 THEN 5
            WHEN 359 THEN 4
            WHEN 317 THEN 3
            WHEN 290 THEN 2
       END
FROM #HorseStallBase b
WHERE b.HorseId IN (421,416,380,378,372,359,317,290);

-- שוגר
INSERT INTO #StageShavingsLine
SELECT CONCAT(N'שוגר-', b.HorseId), N'שוגר', b.HorseId, b.StallBookingId, b.OrderedBySystemUserId, 4
FROM #HorseStallBase b
WHERE b.HorseId IN (472,387,354,289);

/* =========================
   יצירת הזמנות נסורת
   ========================= */

SELECT
    l.OrderGroupKey,
    l.RanchName,
    MIN(l.OrderedBySystemUserId) AS OrderedBySystemUserId,
    SUM(l.BagQuantityPerStall) AS BagQuantity
INTO #StageShavingsOrder
FROM #StageShavingsLine l
GROUP BY
    l.OrderGroupKey,
    l.RanchName;

SELECT
    o.OrderGroupKey,
    4 AS CompetitionId,
    o.OrderedBySystemUserId,
    5 AS CatalogItemId,
    CAST('2025-10-14 00:00:00' AS DATETIME2(0)) AS PRequestDateTime,
    CONCAT(N'נסורת - ', o.RanchName) AS Notes,
    CAST('2025-10-14 00:00:00' AS DATETIME2(0)) AS ApprovalDate
INTO #SH_PR_Source
FROM #StageShavingsOrder o;

CREATE TABLE #SH_InsertedPR
(
    OrderGroupKey NVARCHAR(100) PRIMARY KEY,
    PRequestId INT NOT NULL
);

MERGE ProductRequest AS target
USING #SH_PR_Source AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT
    (
        CompetitionId,
        OrderedBySystemUserId,
        CatalogItemId,
        PRequestDateTime,
        Notes,
        ApprovalDate
    )
    VALUES
    (
        src.CompetitionId,
        src.OrderedBySystemUserId,
        src.CatalogItemId,
        src.PRequestDateTime,
        src.Notes,
        src.ApprovalDate
    )
OUTPUT
    src.OrderGroupKey,
    inserted.PRequestId
INTO #SH_InsertedPR (OrderGroupKey, PRequestId);

INSERT INTO ShavingsOrder
(
    ShavingsOrderId,
    WorkerSystemUserId,
    BagQuantity,
    RequestedDeliveryTime,
    ArrivalTime,
    ResponseTime
)
SELECT
    ip.PRequestId,
    NULL,
    o.BagQuantity,
    NULL,
    NULL,
    NULL
FROM #StageShavingsOrder o
JOIN #SH_InsertedPR ip
    ON ip.OrderGroupKey = o.OrderGroupKey;

INSERT INTO ShavingsOrderForStallBooking
(
    ShavingsOrderId,
    StallBookingId,
    BagQuantityPerStall
)
SELECT
    ip.PRequestId,
    l.StallBookingId,
    l.BagQuantityPerStall
FROM #StageShavingsLine l
JOIN #SH_InsertedPR ip
    ON ip.OrderGroupKey = l.OrderGroupKey;

/* =========================
   בדיקות
   ========================= */

SELECT
    o.RanchName,
    o.OrderGroupKey,
    o.BagQuantity
FROM #StageShavingsOrder o
ORDER BY o.RanchName, o.OrderGroupKey;

SELECT
    l.RanchName,
    l.OrderGroupKey,
    l.HorseId,
    l.BagQuantityPerStall
FROM #StageShavingsLine l
ORDER BY l.RanchName, l.OrderGroupKey, l.HorseId;







IF OBJECT_ID('tempdb..#StageBillProductRequest') IS NOT NULL DROP TABLE #StageBillProductRequest;

CREATE TABLE #StageBillProductRequest
(
    BillId INT NOT NULL,
    PRequestId INT NOT NULL
);

/* =========================
   1) תאי סוסים
   ========================= */
INSERT INTO #StageBillProductRequest (BillId, PRequestId)
SELECT DISTINCT
    b.BillId,
    sb.StallBookingId
FROM StallBooking sb
JOIN Horse h
    ON h.HorseId = sb.HorseId
JOIN ProductRequest pr
    ON pr.PRequestId = sb.StallBookingId
JOIN ServiceRequest sr
    ON sr.OrderedBySystemUserId = pr.OrderedBySystemUserId
   AND sr.HorseId = sb.HorseId
JOIN Entry e
    ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic
    ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b
    ON b.BillId = sr.BillId
WHERE pr.CompetitionId = 4
  AND sb.IsForTack = 0
  AND cic.CompetitionId = 4;

/* =========================
   2) תאי ציוד - משלם יחיד
   ========================= */

/* GI */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, sb.StallBookingId
FROM StallBooking sb
JOIN ProductRequest pr ON pr.PRequestId = sb.StallBookingId
JOIN Bill b ON b.PaidByPersonId = 167
WHERE pr.CompetitionId = 4 AND sb.IsForTack = 1 AND sb.StallRanchId = 11 AND sb.StallCompoundId = 3 AND sb.StallId = 20;

/* יפעת */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, sb.StallBookingId
FROM StallBooking sb
JOIN ProductRequest pr ON pr.PRequestId = sb.StallBookingId
JOIN Bill b ON b.PaidByPersonId = 4168
WHERE pr.CompetitionId = 4 AND sb.IsForTack = 1 AND sb.StallRanchId = 11 AND sb.StallCompoundId = 1 AND sb.StallId = 52;

/* משה */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, sb.StallBookingId
FROM StallBooking sb
JOIN ProductRequest pr ON pr.PRequestId = sb.StallBookingId
JOIN Bill b ON b.PaidByPersonId = 201
WHERE pr.CompetitionId = 4 AND sb.IsForTack = 1 AND sb.StallRanchId = 11 AND sb.StallCompoundId = 1 AND sb.StallId = 38;

/* =========================
   3) תאי ציוד - חלוקה בין כמה משלמים
   ========================= */

/* JP ציוד תא 10 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 3 AND horseSb.StallId IN (2,3,4) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 3 AND tack.StallId = 1
  AND cic.CompetitionId = 4;

/* KPH ציוד תא 43 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 3 AND horseSb.StallId IN (8,9,10) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 3 AND tack.StallId = 15
  AND cic.CompetitionId = 4;

/* LD ציוד תא 903 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (88,89,91,92,93,94,95,96) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 90
  AND cic.CompetitionId = 4;

/* אורוות הכרמל ציוד 601 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (61,62) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 49
  AND cic.CompetitionId = 4;

/* דניאל ציוד 203 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (11,12,14,15) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 13
  AND cic.CompetitionId = 4;

/* הרלב ברק ציוד 36 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 4 AND horseSb.StallId IN (32,33,34) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 4 AND tack.StallId = 36
  AND cic.CompetitionId = 4;

/* הרלב אוריין ציוד 612 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (69,70,71) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 60
  AND cic.CompetitionId = 4;

/* נען ציוד 403 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (32,40,41,42,43) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 33
  AND cic.CompetitionId = 4;

/* סבנטי ציוד 109+110 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN Bill b ON b.PaidByPersonId = 3512
WHERE prTack.CompetitionId = 4
  AND tack.IsForTack = 1
  AND tack.StallCompoundId = 1 AND tack.StallId IN (9,10);

/* רמת יוחנן ציוד 1010+1014 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 2 AND horseSb.StallId IN (3,4,5,6,7,8,9,11) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 2 AND tack.StallId IN (10,14)
  AND cic.CompetitionId = 4;

/* שוגר ציוד 805 */
INSERT INTO #StageBillProductRequest
SELECT DISTINCT b.BillId, tack.StallBookingId
FROM StallBooking tack
JOIN ProductRequest prTack ON prTack.PRequestId = tack.StallBookingId
JOIN StallBooking horseSb ON horseSb.StallCompoundId = 1 AND horseSb.StallId IN (73,74,75,76) AND horseSb.IsForTack = 0
JOIN Horse h ON h.HorseId = horseSb.HorseId
JOIN ServiceRequest sr ON sr.HorseId = h.HorseId
JOIN Entry e ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b ON b.BillId = sr.BillId
WHERE prTack.CompetitionId = 4
  AND tack.StallCompoundId = 1 AND tack.StallId = 77
  AND cic.CompetitionId = 4;

/* =========================
   4) נסורת - קישור לחשבונות
   ========================= */
INSERT INTO #StageBillProductRequest (BillId, PRequestId)
SELECT DISTINCT
    b.BillId,
    so.ShavingsOrderId
FROM ShavingsOrder so
JOIN ProductRequest pr
    ON pr.PRequestId = so.ShavingsOrderId
JOIN ShavingsOrderForStallBooking sosb
    ON sosb.ShavingsOrderId = so.ShavingsOrderId
JOIN StallBooking sb
    ON sb.StallBookingId = sosb.StallBookingId
JOIN Horse h
    ON h.HorseId = sb.HorseId
JOIN ServiceRequest sr
    ON sr.HorseId = h.HorseId
JOIN Entry e
    ON e.EntryId = sr.SRequestId
JOIN ClassInCompetition cic
    ON cic.ClassInCompId = e.ClassInCompId
JOIN Bill b
    ON b.BillId = sr.BillId
WHERE pr.CompetitionId = 4
  AND cic.CompetitionId = 4;

/* =========================
   5) מניעת כפילויות והכנסה
   ========================= */
INSERT INTO BillProductRequest (BillId, PRequestId, PaymentId)
SELECT DISTINCT
    s.BillId,
    s.PRequestId,
    NULL
FROM #StageBillProductRequest s
WHERE NOT EXISTS
(
    SELECT 1
    FROM BillProductRequest bpr
    WHERE bpr.BillId = s.BillId
      AND bpr.PRequestId = s.PRequestId
);

/* =========================
   6) בדיקות
   ========================= */
SELECT
    PRequestId,
    COUNT(*) AS BillsLinked
FROM BillProductRequest
WHERE PRequestId IN
(
    SELECT PRequestId FROM ProductRequest WHERE CompetitionId = 4
)
GROUP BY PRequestId
ORDER BY PRequestId;

SELECT TOP 200 *
FROM BillProductRequest
ORDER BY BillId, PRequestId;