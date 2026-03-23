USE RideOn;
GO


/* =========================================================
   InsertData_08_CompetitionFollowUpData.sql
   כולל:
   - HorseParticipationInCompetition
   - Bill (AmountToPay correction)
   - Payment
   - ProductChangeRequest
   - ChangeEntryRequest
   ========================================================= */

INSERT INTO HorseParticipationInCompetition
(
    HorseId,
    CompetitionId,
    HCApprovalStatus,
    HCApprovalDate,
    HCPath,
    HCUploadDate,
    HCApproverSystemUserId
)
VALUES
(15, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-15.pdf', '2025-10-01T09:00:00', 79),
(174, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-174.pdf', '2025-10-03T09:00:00', 79),
(256, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-256.pdf', '2025-10-05T09:00:00', 79),
(259, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-259.pdf', '2025-10-07T09:00:00', 79),
(260, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-260.pdf', '2025-10-09T09:00:00', 79),
(263, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-263.pdf', '2025-10-11T09:00:00', 79),
(269, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-269.pdf', '2025-10-13T09:00:00', 79),

(283, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-283.pdf', '2025-10-01T09:00:00', 79),
(289, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-289.pdf', '2025-10-03T09:00:00', 79),
(290, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-290.pdf', '2025-10-05T09:00:00', 79),
(292, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-292.pdf', '2025-10-07T09:00:00', 79),
(293, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-293.pdf', '2025-10-09T09:00:00', 79),
(298, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-298.pdf', '2025-10-11T09:00:00', 79),
(307, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-307.pdf', '2025-10-13T09:00:00', 79),

(310, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-310.pdf', '2025-10-01T09:00:00', 79),
(311, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-311.pdf', '2025-10-03T09:00:00', 79),
(317, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-317.pdf', '2025-10-05T09:00:00', 79),
(323, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-323.pdf', '2025-10-07T09:00:00', 79),
(327, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-327.pdf', '2025-10-09T09:00:00', 79),
(329, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-329.pdf', '2025-10-11T09:00:00', 79),
(330, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-330.pdf', '2025-10-13T09:00:00', 79),

(335, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-335.pdf', '2025-10-01T09:00:00', 79),
(338, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-338.pdf', '2025-10-03T09:00:00', 79),
(346, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-346.pdf', '2025-10-05T09:00:00', 79),
(348, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-348.pdf', '2025-10-07T09:00:00', 79),
(354, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-354.pdf', '2025-10-09T09:00:00', 79),
(355, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-355.pdf', '2025-10-11T09:00:00', 79),
(359, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-359.pdf', '2025-10-13T09:00:00', 79),

(360, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-360.pdf', '2025-10-01T09:00:00', 79),
(372, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-372.pdf', '2025-10-03T09:00:00', 79),
(373, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-373.pdf', '2025-10-05T09:00:00', 79),
(377, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-377.pdf', '2025-10-07T09:00:00', 79),
(378, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-378.pdf', '2025-10-09T09:00:00', 79),
(380, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-380.pdf', '2025-10-11T09:00:00', 79),
(382, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-382.pdf', '2025-10-13T09:00:00', 79),

(385, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-385.pdf', '2025-10-01T09:00:00', 79),
(387, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-387.pdf', '2025-10-03T09:00:00', 79),
(390, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-390.pdf', '2025-10-05T09:00:00', 79),
(391, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-391.pdf', '2025-10-07T09:00:00', 79),
(394, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-394.pdf', '2025-10-09T09:00:00', 79),
(396, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-396.pdf', '2025-10-11T09:00:00', 79),
(405, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-405.pdf', '2025-10-13T09:00:00', 79),

(407, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-407.pdf', '2025-10-01T09:00:00', 79),
(408, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-408.pdf', '2025-10-03T09:00:00', 79),
(409, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-409.pdf', '2025-10-05T09:00:00', 79),
(410, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-410.pdf', '2025-10-07T09:00:00', 79),
(411, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-411.pdf', '2025-10-09T09:00:00', 79),
(412, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-412.pdf', '2025-10-11T09:00:00', 79),
(413, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-413.pdf', '2025-10-13T09:00:00', 79),

(414, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-414.pdf', '2025-10-01T09:00:00', 79),
(415, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-415.pdf', '2025-10-03T09:00:00', 79),
(416, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-416.pdf', '2025-10-05T09:00:00', 79),
(417, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-417.pdf', '2025-10-07T09:00:00', 79),
(418, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-418.pdf', '2025-10-09T09:00:00', 79),
(419, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-419.pdf', '2025-10-11T09:00:00', 79),
(421, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-421.pdf', '2025-10-13T09:00:00', 79),

(427, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-427.pdf', '2025-10-01T09:00:00', 79),
(430, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-430.pdf', '2025-10-03T09:00:00', 79),
(440, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-440.pdf', '2025-10-05T09:00:00', 79),
(447, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-447.pdf', '2025-10-07T09:00:00', 79),
(448, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-448.pdf', '2025-10-09T09:00:00', 79),
(449, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-449.pdf', '2025-10-11T09:00:00', 79),
(451, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-451.pdf', '2025-10-13T09:00:00', 79),

(454, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-454.pdf', '2025-10-01T09:00:00', 79),
(455, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-455.pdf', '2025-10-03T09:00:00', 79),
(456, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-456.pdf', '2025-10-05T09:00:00', 79),
(458, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-458.pdf', '2025-10-07T09:00:00', 79),
(459, 4, N'מאושר', '2025-10-10T10:00:00', N'/health-certificates/competition-4/horse-459.pdf', '2025-10-09T09:00:00', 79),
(463, 4, N'מאושר', '2025-10-13T10:00:00', N'/health-certificates/competition-4/horse-463.pdf', '2025-10-11T09:00:00', 79),
(464, 4, N'מאושר', '2025-10-14T10:00:00', N'/health-certificates/competition-4/horse-464.pdf', '2025-10-13T09:00:00', 79),

(465, 4, N'מאושר', '2025-10-03T10:00:00', N'/health-certificates/competition-4/horse-465.pdf', '2025-10-01T09:00:00', 79),
(472, 4, N'מאושר', '2025-10-05T10:00:00', N'/health-certificates/competition-4/horse-472.pdf', '2025-10-03T09:00:00', 79),
(488, 4, N'מאושר', '2025-10-06T10:00:00', N'/health-certificates/competition-4/horse-488.pdf', '2025-10-05T09:00:00', 79),
(503, 4, N'מאושר', '2025-10-09T10:00:00', N'/health-certificates/competition-4/horse-503.pdf', '2025-10-07T09:00:00', 79);
GO

USE RideOn;
GO

WITH ServiceSums AS
(
    SELECT
        sr.BillId,
        SUM(
            CASE
                WHEN e.EntryId IS NOT NULL
                    THEN ISNULL(cic.OrganizerCost, 0) + ISNULL(cic.FederationCost, 0)
                WHEN ptr.PaidTimeRequestId IS NOT NULL
                    THEN ISNULL(pc.ItemPrice, 0)
                ELSE 0
            END
        ) AS ServiceTotal
    FROM ServiceRequest sr
    LEFT JOIN Entry e
        ON e.EntryId = sr.SRequestId
    LEFT JOIN ClassInCompetition cic
        ON cic.ClassInCompId = e.ClassInCompId
    LEFT JOIN PaidTimeRequest ptr
        ON ptr.PaidTimeRequestId = sr.SRequestId
    LEFT JOIN PriceCatalog pc
        ON pc.CatalogItemId = ptr.CatalogItemId
    GROUP BY sr.BillId
),
ProductSums AS
(
    SELECT
        bpr.BillId,
        SUM(pc.ItemPrice) AS ProductTotal
    FROM BillProductRequest bpr
    JOIN ProductRequest pr
        ON pr.PRequestId = bpr.PRequestId
    JOIN PriceCatalog pc
        ON pc.CatalogItemId = pr.CatalogItemId
    GROUP BY bpr.BillId
),
CorrectSums AS
(
    SELECT
        b.BillId,
        ISNULL(ss.ServiceTotal, 0) + ISNULL(ps.ProductTotal, 0) AS CorrectAmountToPay
    FROM Bill b
    LEFT JOIN ServiceSums ss
        ON ss.BillId = b.BillId
    LEFT JOIN ProductSums ps
        ON ps.BillId = b.BillId
)
UPDATE b
SET b.AmountToPay = cs.CorrectAmountToPay
FROM Bill b
JOIN CorrectSums cs
    ON cs.BillId = b.BillId
WHERE b.AmountToPay <> cs.CorrectAmountToPay;
GO



SET XACT_ABORT ON;
BEGIN TRAN;

IF OBJECT_ID('tempdb..#PaymentPlan') IS NOT NULL DROP TABLE #PaymentPlan;
IF OBJECT_ID('tempdb..#InsertedPayments') IS NOT NULL DROP TABLE #InsertedPayments;
IF OBJECT_ID('tempdb..#PaymentCoverage') IS NOT NULL DROP TABLE #PaymentCoverage;

CREATE TABLE #PaymentPlan
(
    PlanRowId INT IDENTITY(1,1) PRIMARY KEY,
    StageKey NVARCHAR(20) NOT NULL,
    BillId INT NOT NULL,
    PaymentMethodId INT NOT NULL,
    EnteredBySystemUserId INT NOT NULL,
    TotalPayment DECIMAL(10,2) NOT NULL,
    PaymentDate DATETIME2(0) NOT NULL,
    Receipt NVARCHAR(255) NOT NULL,
    IsFullPayment BIT NOT NULL
);

CREATE TABLE #InsertedPayments
(
    PlanRowId INT NOT NULL,
    PaymentId INT NOT NULL
);

CREATE TABLE #PaymentCoverage
(
    StageKey NVARCHAR(20) NOT NULL,
    CoverageType NVARCHAR(10) NOT NULL, -- SR / BPR
    CoveredId INT NOT NULL
);

/* =========================================
   PAYMENT PLAN
   ========================================= */

INSERT INTO #PaymentPlan
(StageKey, BillId, PaymentMethodId, EnteredBySystemUserId, TotalPayment, PaymentDate, Receipt, IsFullPayment)
VALUES
-- FULL PAYMENTS
(N'FULL_67',  67, 1,   79,  200.00, '2025-10-01T10:15:00', N'RCPT-2025-0001', 1),
(N'FULL_78',  78, 3,  622,  490.00, '2025-10-02T11:40:00', N'RCPT-2025-0002', 1),
(N'FULL_92',  92, 2, 4000,  490.00, '2025-10-03T09:20:00', N'RCPT-2025-0003', 1),
(N'FULL_190',190, 1,   79,  240.00, '2025-10-14T09:00:00', N'RCPT-2025-0004', 1),
(N'FULL_193',193, 4,  622,  170.00, '2025-10-14T09:10:00', N'RCPT-2025-0005', 1),
(N'FULL_203',203, 2, 4000,  170.00, '2025-10-14T10:00:00', N'RCPT-2025-0006', 1),
(N'FULL_250',250, 3,   79,  320.00, '2025-10-15T16:30:00', N'RCPT-2025-0007', 1),

-- PARTIAL PAYMENTS
(N'PART_65',  65, 1,  622,  440.00, '2025-10-05T12:00:00', N'RCPT-2025-0008', 0),
(N'PART_71',  71, 3,   79,  750.00, '2025-10-06T13:15:00', N'RCPT-2025-0009', 0),
(N'PART_90',  90, 4, 4000,  600.00, '2025-10-07T15:45:00', N'RCPT-2025-0010', 0),
(N'PART_101',101, 1,  622, 1000.00, '2025-10-08T10:25:00', N'RCPT-2025-0011', 0),
(N'PART_195',195, 2,   79,  410.00, '2025-10-15T11:10:00', N'RCPT-2025-0012', 0);

/* =========================================
   WHAT EACH PAYMENT COVERS
   ========================================= */

INSERT INTO #PaymentCoverage (StageKey, CoverageType, CoveredId)
VALUES
-- FULL_67
(N'FULL_67', N'SR', 88),

-- FULL_78
(N'FULL_78', N'SR', 10),
(N'FULL_78', N'BPR', 90),
(N'FULL_78', N'BPR', 149),

-- FULL_92
(N'FULL_92', N'SR', 9),
(N'FULL_92', N'BPR', 99),
(N'FULL_92', N'BPR', 157),

-- FULL_190
(N'FULL_190', N'SR', 190),

-- FULL_193
(N'FULL_193', N'SR', 191),

-- FULL_203
(N'FULL_203', N'SR', 193),

-- FULL_250
(N'FULL_250', N'SR', 221),
(N'FULL_250', N'BPR', 134),

-- PART_65
(N'PART_65', N'BPR', 67),
(N'PART_65', N'BPR', 127),
(N'PART_65', N'BPR', 143),

-- PART_71
(N'PART_71', N'SR', 6),
(N'PART_71', N'SR', 63),

-- PART_90
(N'PART_90', N'SR', 5),
(N'PART_90', N'SR', 47),

-- PART_101
(N'PART_101', N'SR', 37),
(N'PART_101', N'SR', 44),

-- PART_195
(N'PART_195', N'SR', 227),
(N'PART_195', N'SR', 228);

/* =========================================
   INSERT PAYMENTS
   ========================================= */

;WITH OrderedPlan AS
(
    SELECT
        PlanRowId,
        PaymentMethodId,
        EnteredBySystemUserId,
        TotalPayment,
        PaymentDate,
        Receipt
    FROM #PaymentPlan
)
MERGE Payment AS tgt
USING OrderedPlan AS src
    ON 1 = 0
WHEN NOT MATCHED THEN
    INSERT
    (
        PaymentMethodId,
        EnteredBySystemUserId,
        TotalPayment,
        [Date],
        Receipt
    )
    VALUES
    (
        src.PaymentMethodId,
        src.EnteredBySystemUserId,
        src.TotalPayment,
        src.PaymentDate,
        src.Receipt
    )
OUTPUT
    src.PlanRowId,
    inserted.PaymentId
INTO #InsertedPayments (PlanRowId, PaymentId);

/* =========================================
   LINK PAYMENTS TO SERVICE REQUESTS
   ========================================= */

UPDATE sr
SET sr.PaymentId = ip.PaymentId
FROM ServiceRequest sr
JOIN #PaymentCoverage pc
    ON pc.CoverageType = N'SR'
   AND pc.CoveredId = sr.SRequestId
JOIN #PaymentPlan pp
    ON pp.StageKey = pc.StageKey
JOIN #InsertedPayments ip
    ON ip.PlanRowId = pp.PlanRowId
WHERE sr.PaymentId IS NULL;

/* =========================================
   LINK PAYMENTS TO BILL PRODUCT REQUESTS
   ========================================= */

UPDATE bpr
SET bpr.PaymentId = ip.PaymentId
FROM BillProductRequest bpr
JOIN #PaymentCoverage pc
    ON pc.CoverageType = N'BPR'
   AND pc.CoveredId = bpr.PRequestId
JOIN #PaymentPlan pp
    ON pp.StageKey = pc.StageKey
JOIN #InsertedPayments ip
    ON ip.PlanRowId = pp.PlanRowId
WHERE bpr.PaymentId IS NULL;

/* =========================================
   CLOSE ONLY FULLY PAID BILLS
   ========================================= */

UPDATE b
SET b.DateClosed = pp.PaymentDate
FROM Bill b
JOIN #PaymentPlan pp
    ON pp.BillId = b.BillId
WHERE pp.IsFullPayment = 1
  AND b.DateClosed IS NULL;

COMMIT TRAN;
GO


SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @NewPRequestId_71 INT;
DECLARE @NewPRequestId_92 INT;

/* =========================================================
   שינוי 1:
   PRequestId 71
   תא רגיל
   CheckInDate: 2025-10-12 -> 2025-10-13
   ========================================================= */

INSERT INTO ProductRequest
(
    CompetitionId,
    OrderedBySystemUserId,
    CatalogItemId,
    PRequestDateTime,
    Notes,
    ApprovalDate
)
SELECT
    pr.CompetitionId,
    pr.OrderedBySystemUserId,
    pr.CatalogItemId,
    '2025-10-10T10:00:00',
    N'שינוי תאריך כניסה - יום אחד קדימה',
    '2025-10-10T12:00:00'
FROM ProductRequest pr
WHERE pr.PRequestId = 71;

SET @NewPRequestId_71 = SCOPE_IDENTITY();

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
    @NewPRequestId_71,
    sb.StallRanchId,
    sb.StallCompoundId,
    sb.StallId,
    sb.HorseId,
    DATEADD(DAY, 1, sb.CheckInDate),
    sb.CheckOutDate,
    sb.IsForTack
FROM StallBooking sb
WHERE sb.StallBookingId = 71;

INSERT INTO ProductChangeRequest
(
    OriginalPRequestId,
    NewPRequestId,
    AnsweredBySystemUserId,
    [Status],
    RequestDate,
    IsCancelled
)
VALUES
(
    71,
    @NewPRequestId_71,
    79,
    N'אושר',
    '2025-10-10T09:30:00',
    0
);

/* =========================================================
   שינוי 2:
   PRequestId 92
   תא משודרג
   CheckInDate: 2025-10-14 -> 2025-10-13
   ========================================================= */

INSERT INTO ProductRequest
(
    CompetitionId,
    OrderedBySystemUserId,
    CatalogItemId,
    PRequestDateTime,
    Notes,
    ApprovalDate
)
SELECT
    pr.CompetitionId,
    pr.OrderedBySystemUserId,
    pr.CatalogItemId,
    '2025-10-11T11:00:00',
    N'שינוי תאריך כניסה - יום אחד אחורה',
    '2025-10-11T13:00:00'
FROM ProductRequest pr
WHERE pr.PRequestId = 92;

SET @NewPRequestId_92 = SCOPE_IDENTITY();

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
    @NewPRequestId_92,
    sb.StallRanchId,
    sb.StallCompoundId,
    sb.StallId,
    sb.HorseId,
    DATEADD(DAY, -1, sb.CheckInDate),
    sb.CheckOutDate,
    sb.IsForTack
FROM StallBooking sb
WHERE sb.StallBookingId = 92;

INSERT INTO ProductChangeRequest
(
    OriginalPRequestId,
    NewPRequestId,
    AnsweredBySystemUserId,
    [Status],
    RequestDate,
    IsCancelled
)
VALUES
(
    92,
    @NewPRequestId_92,
    79,
    N'אושר',
    '2025-10-11T10:30:00',
    0
);

COMMIT TRAN;
GO


SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @NewEntryId_1 INT;
DECLARE @NewEntryId_64 INT;

/* =========================================================
   שינוי 1:
   EntryId 1
   מקצה 98 -> 107
   אותו סוס / רוכב / מאמן / ביל
   ========================================================= */

INSERT INTO ServiceRequest
(
    OrderedBySystemUserId,
    HorseId,
    RiderFederationMemberId,
    CoachFederationMemberId,
    BillId,
    PaymentId,
    SRequestDateTime
)
SELECT
    sr.OrderedBySystemUserId,
    sr.HorseId,
    sr.RiderFederationMemberId,
    sr.CoachFederationMemberId,
    sr.BillId,
    NULL,
    '2025-10-10T09:00:00'
FROM ServiceRequest sr
WHERE sr.SRequestId = 1;

SET @NewEntryId_1 = SCOPE_IDENTITY();

INSERT INTO Entry
(
    EntryId,
    ClassInCompId,
    FineId,
    PrizeRecipientName,
    DrawOrder
)
SELECT
    @NewEntryId_1,
    107,
    e.FineId,
    e.PrizeRecipientName,
    e.DrawOrder
FROM Entry e
WHERE e.EntryId = 1;

INSERT INTO ChangeEntryRequest
(
    OriginalEntryId,
    NewEntryId,
    RequestDateTime,
    [Status],
    IsCancelled
)
VALUES
(
    1,
    @NewEntryId_1,
    '2025-10-10T08:30:00',
    N'אושר',
    0
);

/* =========================================================
   שינוי 2:
   EntryId 64
   מקצה 113 -> 127
   ========================================================= */

INSERT INTO ServiceRequest
(
    OrderedBySystemUserId,
    HorseId,
    RiderFederationMemberId,
    CoachFederationMemberId,
    BillId,
    PaymentId,
    SRequestDateTime
)
SELECT
    sr.OrderedBySystemUserId,
    sr.HorseId,
    sr.RiderFederationMemberId,
    sr.CoachFederationMemberId,
    sr.BillId,
    NULL,
    '2025-10-11T10:00:00'
FROM ServiceRequest sr
WHERE sr.SRequestId = 64;

SET @NewEntryId_64 = SCOPE_IDENTITY();

INSERT INTO Entry
(
    EntryId,
    ClassInCompId,
    FineId,
    PrizeRecipientName,
    DrawOrder
)
SELECT
    @NewEntryId_64,
    127,
    e.FineId,
    e.PrizeRecipientName,
    e.DrawOrder
FROM Entry e
WHERE e.EntryId = 64;

INSERT INTO ChangeEntryRequest
(
    OriginalEntryId,
    NewEntryId,
    RequestDateTime,
    [Status],
    IsCancelled
)
VALUES
(
    64,
    @NewEntryId_64,
    '2025-10-11T09:30:00',
    N'אושר',
    0
);

/* =========================================================
   שינוי 3:
   EntryId 73
   בקשת שינוי שבוטלה
   ========================================================= */

INSERT INTO ChangeEntryRequest
(
    OriginalEntryId,
    NewEntryId,
    RequestDateTime,
    [Status],
    IsCancelled
)
VALUES
(
    73,
    NULL,
    '2025-10-12T11:00:00',
    N'בוטל',
    1
);

COMMIT TRAN;
GO

