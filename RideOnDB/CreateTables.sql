USE master;
GO

IF DB_ID(N'RideOn') IS NOT NULL
BEGIN
    ALTER DATABASE RideOn SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE RideOn;
END
GO

CREATE DATABASE RideOn;
GO

USE RideOn;
GO

/* =========================================================
   1) BASE TABLES
   ========================================================= */

CREATE TABLE Person
(
    PersonId INT IDENTITY(1,1) PRIMARY KEY,
    NationalId VARCHAR(9) NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL,
    Gender NVARCHAR(10) NOT NULL,
    DateOfBirth DATE NULL,
    CellPhone VARCHAR(20) NULL,
    Email NVARCHAR(254) NULL,

    CONSTRAINT CK_Person_NationalId
        CHECK (NationalId IS NULL OR (NationalId NOT LIKE '%[^0-9]%' AND LEN(NationalId) = 9)),

    CONSTRAINT CK_Person_Email
        CHECK (Email IS NULL OR Email LIKE '_%@_%._%'),

    CONSTRAINT CK_Person_CellPhone
        CHECK (
            CellPhone IS NULL
            OR (
                LEN(CellPhone) BETWEEN 9 AND 20
                AND CellPhone NOT LIKE '%[^0-9+ -]%'
            )
        )
);
GO

CREATE UNIQUE INDEX UX_Person_NationalId
ON Person(NationalId)
WHERE NationalId IS NOT NULL;
GO

CREATE TABLE Role
(
    RoleId TINYINT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE Ranch
(
    RanchId INT IDENTITY(1,1) PRIMARY KEY,
    RanchName NVARCHAR(100) NOT NULL,
    ContactEmail NVARCHAR(254) NULL,
    ContactPhone VARCHAR(20) NULL,
    WebsiteUrl NVARCHAR(255) NULL,
    Location GEOGRAPHY NULL,

    CONSTRAINT CK_Ranch_ContactEmail
        CHECK (ContactEmail IS NULL OR ContactEmail LIKE '_%@_%._%'),

    CONSTRAINT CK_Ranch_ContactPhone
        CHECK (
            ContactPhone IS NULL
            OR (
                LEN(ContactPhone) BETWEEN 9 AND 20
                AND ContactPhone NOT LIKE '%[^0-9+ -]%'
            )
        )
);
GO

CREATE TABLE ProductCategory
(
    CategoryId TINYINT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE
);
GO

CREATE TABLE Field
(
    FieldId TINYINT IDENTITY(1,1) PRIMARY KEY,
    FieldName NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE Maneuver
(
    ManeuverId TINYINT IDENTITY(1,1) PRIMARY KEY,
	ManeuverName NVARCHAR(100) NOT NULL,
    ManeuverDescription NVARCHAR(255) NOT NULL
);
GO

CREATE TABLE Judge
(
    JudgeId INT IDENTITY(1,1) PRIMARY KEY,
    FirstNameHebrew NVARCHAR(50) NOT NULL,
    LastNameHebrew NVARCHAR(50) NOT NULL,
    FirstNameEnglish NVARCHAR(50) NULL,
    LastNameEnglish NVARCHAR(50) NULL,
    Country NVARCHAR(50) NULL
);
GO

CREATE TABLE PrizeType
(
    PrizeTypeId TINYINT IDENTITY(1,1) PRIMARY KEY,
    PrizeTypeName NVARCHAR(100) NOT NULL UNIQUE,
    PrizeDescription NVARCHAR(255) NULL
);
GO


CREATE TABLE PaymentMethod
(
    PaymentMethodId INT IDENTITY(1,1) PRIMARY KEY,
    PaymentMethodType NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE NotificationType
(
    NotificationTypeId INT IDENTITY(1,1) PRIMARY KEY,
    NotificationTypeName NVARCHAR(100) NOT NULL,
    NotificationTypeDescription NVARCHAR(255) NULL
);
GO

CREATE TABLE MessageForCompetition
(
    MessageId INT IDENTITY(1,1) PRIMARY KEY,
    MessageContent NVARCHAR(500) NOT NULL,
    SendDate DATETIME2(0) NULL,
    CreatedDateTime DATETIME2(0) NOT NULL,
    [Status] NVARCHAR(20) NULL
);
GO

CREATE TABLE PaidTimeSlot
(
    PaidTimeSlotId INT IDENTITY(1,1) PRIMARY KEY,
    DayOfWeek NVARCHAR(15) NOT NULL,
    TimeOfDay NVARCHAR(15) NOT NULL

);
GO

/* =========================================================
   2) PERSON INHERITANCE
   ========================================================= */

CREATE TABLE FederationMember
(
    FederationMemberId INT PRIMARY KEY,
    HasValidMembership BIT NULL,
    MedicalCheckValidUntil DATE NULL,
    CertificationLevel NVARCHAR(30) NULL,

    CONSTRAINT FK_FederationMember_Person
        FOREIGN KEY (FederationMemberId) REFERENCES Person(PersonId)
);
GO

CREATE TABLE SystemUser
(
    SystemUserId INT PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_SystemUser_IsActive DEFAULT 1,
    CreatedDate DATETIME2(0) NOT NULL CONSTRAINT DF_SystemUser_CreatedDate DEFAULT SYSDATETIME(),

    CONSTRAINT FK_SystemUser_Person
        FOREIGN KEY (SystemUserId) REFERENCES Person(PersonId)
);
GO


/* =========================================================
   3) PERSON / RANCH RELATIONS
   ========================================================= */

CREATE TABLE PersonRanch
(
    PersonId INT NOT NULL,
    RanchId INT NOT NULL,

    CONSTRAINT PK_PersonRanch
        PRIMARY KEY (PersonId, RanchId),

    CONSTRAINT FK_PersonRanch_Person
        FOREIGN KEY (PersonId) REFERENCES Person(PersonId),

    CONSTRAINT FK_PersonRanch_Ranch
        FOREIGN KEY (RanchId) REFERENCES Ranch(RanchId)
);
GO

CREATE TABLE PersonRanchRole
(
    PersonId INT NOT NULL,
    RanchId INT NOT NULL,
    RoleId TINYINT NOT NULL,
    RoleStatus NVARCHAR(20) NULL,

    CONSTRAINT PK_PersonRanchRole
        PRIMARY KEY (PersonId, RanchId, RoleId),

    CONSTRAINT FK_PersonRanchRole_Affiliation
        FOREIGN KEY (PersonId, RanchId)
        REFERENCES PersonRanch(PersonId, RanchId),

    CONSTRAINT FK_PersonRanchRole_Role
        FOREIGN KEY (RoleId) REFERENCES Role(RoleId)
);
GO

CREATE TABLE PersonManagedBySystemUser
(
    SystemUserId INT NOT NULL,
    PersonId INT NOT NULL,
    RequestDate DATETIME2(0) NULL,
    UpdateDate DATETIME2(0) NULL,
    ApprovalStatus NVARCHAR(20) NULL,

    CONSTRAINT PK_PersonManagedBySystemUser
        PRIMARY KEY (SystemUserId, PersonId),

    CONSTRAINT FK_PersonManagedBySystemUser_SystemUser
        FOREIGN KEY (SystemUserId) REFERENCES SystemUser(SystemUserId),

    CONSTRAINT FK_PersonManagedBySystemUser_Person
        FOREIGN KEY (PersonId) REFERENCES Person(PersonId)
);
GO

/* =========================================================
   4) PRODUCT CATALOG
   ========================================================= */

CREATE TABLE Product
(
    ProductId SMALLINT IDENTITY(1,1) PRIMARY KEY,
    CategoryId TINYINT NOT NULL,
    ProductName NVARCHAR(100) NOT NULL UNIQUE,

    CONSTRAINT FK_Product_ProductCategory
        FOREIGN KEY (CategoryId) REFERENCES ProductCategory(CategoryId)
);
GO

CREATE TABLE PaidTimeProduct
(
    ProductId SMALLINT PRIMARY KEY,
    DurationMinutes TINYINT NOT NULL,

    CONSTRAINT CK_PaidTimeProduct_DurationMinutes
        CHECK (DurationMinutes IN (7, 10)),

    CONSTRAINT FK_PaidTimeProduct_Product
        FOREIGN KEY (ProductId) REFERENCES Product(ProductId)
);
GO

CREATE TABLE PriceCatalog
(
    CatalogItemId INT IDENTITY(1,1) PRIMARY KEY,
    ProductId SMALLINT NOT NULL,
    RanchId INT NOT NULL,
    CreationDate DATETIME2(0) NOT NULL,
    ItemPrice DECIMAL(10,2) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_PriceCatalog_IsActive DEFAULT 1,

    CONSTRAINT CK_PriceCatalog_ItemPrice
        CHECK (ItemPrice >= 0),

    CONSTRAINT FK_PriceCatalog_Product
        FOREIGN KEY (ProductId) REFERENCES Product(ProductId),

    CONSTRAINT FK_PriceCatalog_Ranch
        FOREIGN KEY (RanchId) REFERENCES Ranch(RanchId)
);
GO

CREATE UNIQUE INDEX UX_PriceCatalog_Active
ON PriceCatalog(ProductId, RanchId)
WHERE IsActive = 1;
GO

/* =========================================================
   5) RANCH FACILITIES
   ========================================================= */

CREATE TABLE Arena
(
    RanchId INT NOT NULL,
    ArenaId TINYINT NOT NULL,
    ArenaName NVARCHAR(100) NOT NULL,
    ArenaLength SMALLINT NULL,
    ArenaWidth SMALLINT NULL,
    IsCovered BIT NULL,

    CONSTRAINT PK_Arena
        PRIMARY KEY (RanchId, ArenaId),

    CONSTRAINT UQ_Arena_RanchId_ArenaName
        UNIQUE (RanchId, ArenaName),

    CONSTRAINT CK_Arena_ArenaLength
        CHECK (ArenaLength IS NULL OR ArenaLength > 0),

    CONSTRAINT CK_Arena_ArenaWidth
        CHECK (ArenaWidth IS NULL OR ArenaWidth > 0),

    CONSTRAINT FK_Arena_Ranch
        FOREIGN KEY (RanchId) REFERENCES Ranch(RanchId)
);
GO

CREATE TABLE StallCompound
(
    RanchId INT NOT NULL,
    CompoundId TINYINT NOT NULL,
    CompoundName NVARCHAR(100) NOT NULL,

    CONSTRAINT PK_StallCompound
        PRIMARY KEY (RanchId, CompoundId),

    CONSTRAINT UQ_StallCompound_Ranch_CompoundName
        UNIQUE (RanchId, CompoundName),

    CONSTRAINT FK_StallCompound_Ranch
        FOREIGN KEY (RanchId) REFERENCES Ranch(RanchId)
);
GO

	CREATE TABLE dbo.Stall
(
    RanchId INT NOT NULL,
    CompoundId TINYINT NOT NULL,
    StallId SMALLINT NOT NULL, -- הותאם ל-SMALLINT לפי הסטנדרט שלנו
    StallNumber NVARCHAR(20) NOT NULL,
    StallType SMALLINT NOT NULL, -- החליף את StallType בעקבות הקשר IsTypeOf
    StallNotes NVARCHAR(500) NULL,

    CONSTRAINT PK_Stall
        PRIMARY KEY (RanchId, CompoundId, StallId),

    CONSTRAINT UQ_Stall_Ranch_Compound_StallNumber
        UNIQUE (RanchId, CompoundId, StallNumber),

    CONSTRAINT FK_Stall_StallCompound
        FOREIGN KEY (RanchId, CompoundId)
        REFERENCES dbo.StallCompound(RanchId, CompoundId),

    CONSTRAINT FK_Stall_Product
        FOREIGN KEY (StallType)
        REFERENCES dbo.Product(ProductId)
);
GO
/* =========================================================
   6) COMPETITIONS / CLASSES / JUDGING
   ========================================================= */

CREATE TABLE Competition
(
    CompetitionId INT IDENTITY(1,1) PRIMARY KEY,
    HostRanchId INT NOT NULL,
    FieldId TINYINT NOT NULL,
    CreatedBySystemUserId INT NOT NULL,
    CompetitionName NVARCHAR(100) NOT NULL,
    CompetitionStartDate DATE NOT NULL,
    CompetitionEndDate DATE NOT NULL,
    RegistrationOpenDate DATE NULL,
    RegistrationEndDate DATE NULL,
    PaidTimeRegistrationDate DATE NULL,
    PaidTimePublicationDate DATE NULL,
    CompetitionStatus NVARCHAR(20) NULL,
    Notes NVARCHAR(500) NULL,
    StallMapUrl NVARCHAR(255) NULL,

    CONSTRAINT CK_Competition_Dates
        CHECK (
            CompetitionEndDate >= CompetitionStartDate
            AND (RegistrationOpenDate IS NULL OR RegistrationEndDate IS NULL OR RegistrationEndDate >= RegistrationOpenDate)
        ),

    CONSTRAINT FK_Competition_Ranch
        FOREIGN KEY (HostRanchId) REFERENCES Ranch(RanchId),

    CONSTRAINT FK_Competition_Field
        FOREIGN KEY (FieldId) REFERENCES Field(FieldId),

    CONSTRAINT FK_Competition_CreatedBySystemUser
        FOREIGN KEY (CreatedBySystemUserId) REFERENCES SystemUser(SystemUserId)
);
GO

CREATE TABLE ClassType
(
    ClassTypeId SMALLINT IDENTITY(1,1) PRIMARY KEY,
    FieldId TINYINT NOT NULL,
    ClassName NVARCHAR(100) NOT NULL,
    JudgingSheetFormat NVARCHAR(500) NULL,
    QualificationDescription NVARCHAR(255) NULL,

    CONSTRAINT FK_ClassType_Field
        FOREIGN KEY (FieldId) REFERENCES Field(FieldId)
);
GO

CREATE TABLE JudgeField
(
    JudgeId INT NOT NULL,
    FieldId TINYINT NOT NULL,

    CONSTRAINT PK_JudgeField
        PRIMARY KEY (JudgeId, FieldId),

    CONSTRAINT FK_JudgeField_Judge
        FOREIGN KEY (JudgeId) REFERENCES Judge(JudgeId),

    CONSTRAINT FK_JudgeField_Field
        FOREIGN KEY (FieldId) REFERENCES Field(FieldId)
);
GO

CREATE TABLE ClassInCompetition
(
    ClassInCompId INT IDENTITY(1,1) PRIMARY KEY,
    CompetitionId INT NOT NULL,
    ClassTypeId SMALLINT NOT NULL,
    ArenaRanchId INT NOT NULL,
    ArenaId TINYINT NOT NULL,
    ClassDateTime DATETIME2(0) NULL,
    OrganizerCost DECIMAL(10,2) NULL,
    FederationCost DECIMAL(10,2) NULL,
    ClassNotes NVARCHAR(500) NULL,
    StartTime TIME(0) NULL,
    OrderInDay TINYINT NULL,

    CONSTRAINT CK_ClassInCompetition_OrganizerCost
        CHECK (OrganizerCost IS NULL OR OrganizerCost >= 0),

    CONSTRAINT CK_ClassInCompetition_FederationCost
        CHECK (FederationCost IS NULL OR FederationCost >= 0),

    CONSTRAINT FK_ClassInCompetition_Competition
        FOREIGN KEY (CompetitionId) REFERENCES Competition(CompetitionId),

    CONSTRAINT FK_ClassInCompetition_ClassType
        FOREIGN KEY (ClassTypeId) REFERENCES ClassType(ClassTypeId),

    CONSTRAINT FK_ClassInCompetition_Arena
        FOREIGN KEY (ArenaRanchId, ArenaId)
        REFERENCES Arena(RanchId, ArenaId)
);
GO

CREATE TABLE Pattern
(
PatternNumber TINYINT PRIMARY KEY
);
GO

CREATE TABLE ReiningType
(
ReiningClassInCompId INT PRIMARY KEY,
PatternNumber TINYINT NOT NULL,

CONSTRAINT FK_ReiningType_ClassInCompetition
FOREIGN KEY (ReiningClassInCompId) REFERENCES ClassInCompetition(ClassInCompId),

CONSTRAINT FK_ReiningType_Pattern
FOREIGN KEY (PatternNumber) REFERENCES Pattern(PatternNumber)
);
GO


CREATE TABLE PatternManeuver
(
PatternNumber TINYINT NOT NULL,
ManeuverId TINYINT NOT NULL,
[Order] TINYINT NOT NULL,

CONSTRAINT PK_PatternManeuver
PRIMARY KEY (PatternNumber, ManeuverId),

CONSTRAINT UQ_PatternManeuver_Order
UNIQUE (PatternNumber, [Order]),

CONSTRAINT CK_PatternManeuver_Order
CHECK ([Order] > 0),

CONSTRAINT FK_PatternManeuver_Pattern
FOREIGN KEY (PatternNumber) REFERENCES Pattern(PatternNumber),

CONSTRAINT FK_PatternManeuver_Maneuver
FOREIGN KEY (ManeuverId) REFERENCES Maneuver(ManeuverId)
);
GO 


CREATE TABLE ClassJudge
(
    ClassInCompId INT NOT NULL,
    JudgeId INT NOT NULL,

    CONSTRAINT PK_ClassJudge
        PRIMARY KEY (ClassInCompId, JudgeId),

    CONSTRAINT FK_ClassJudge_ClassInCompetition
        FOREIGN KEY (ClassInCompId) REFERENCES ClassInCompetition(ClassInCompId),

    CONSTRAINT FK_ClassJudge_Judge
        FOREIGN KEY (JudgeId) REFERENCES Judge(JudgeId)
);
GO

CREATE TABLE ClassPrize
(
    ClassInCompId INT NOT NULL,
    PrizeTypeId TINYINT NOT NULL,
    PrizeAmount DECIMAL(10,2) NOT NULL,

    CONSTRAINT CK_ClassPrize_PrizeAmount
        CHECK (PrizeAmount >= 0),

    CONSTRAINT PK_ClassPrize
        PRIMARY KEY (ClassInCompId, PrizeTypeId),

    CONSTRAINT FK_ClassPrize_ClassInCompetition
        FOREIGN KEY (ClassInCompId) REFERENCES ClassInCompetition(ClassInCompId),

    CONSTRAINT FK_ClassPrize_PrizeType
        FOREIGN KEY (PrizeTypeId) REFERENCES PrizeType(PrizeTypeId)
);
GO

/* =========================================================
   7) HORSES
   ========================================================= */

CREATE TABLE Horse
(
    HorseId INT IDENTITY(1,1) PRIMARY KEY,
    RanchId INT NOT NULL,
    HorseName NVARCHAR(100) NOT NULL,
    BarnName NVARCHAR(100) NULL,
    FederationNumber VARCHAR(30) NULL,
    ChipNumber VARCHAR(30) NULL,
    BirthYear SMALLINT NULL,
    Gender NVARCHAR(10) NULL,

    CONSTRAINT FK_Horse_Ranch
        FOREIGN KEY (RanchId) REFERENCES Ranch(RanchId)
);
GO

CREATE UNIQUE INDEX UX_Horse_ChipNumber
ON Horse(ChipNumber)
WHERE ChipNumber IS NOT NULL;
GO

CREATE UNIQUE INDEX UX_Horse_FederationNumber
ON Horse(FederationNumber)
WHERE FederationNumber IS NOT NULL;
GO

CREATE TABLE HorseOwner
(
    HorseId INT NOT NULL,
    FederationMemberId INT NOT NULL,

    CONSTRAINT PK_HorseOwner
        PRIMARY KEY (HorseId, FederationMemberId),

    CONSTRAINT FK_HorseOwner_Horse
        FOREIGN KEY (HorseId) REFERENCES Horse(HorseId),

    CONSTRAINT FK_HorseOwner_FederationMember
        FOREIGN KEY (FederationMemberId) REFERENCES FederationMember(FederationMemberId)
);
GO

CREATE TABLE HorseParticipationInCompetition
(
    HorseId INT NOT NULL,
    CompetitionId INT NOT NULL,
    HCApprovalStatus NVARCHAR(20) NULL,
    HCApprovalDate DATETIME2(0) NULL,
    HCPath NVARCHAR(255) NULL,
    HCUploadDate DATETIME2(0) NULL,
    HCApproverSystemUserId INT NULL,

    CONSTRAINT PK_HorseParticipationInCompetition
        PRIMARY KEY (HorseId, CompetitionId),

    CONSTRAINT CK_HCHorseParticipationInCompetition_ApprovalConsistency
        CHECK (HCApprovalDate IS NULL OR HCApproverSystemUserId IS NOT NULL),

    CONSTRAINT FK_HorseParticipationInCompetition_Horse
        FOREIGN KEY (HorseId) REFERENCES Horse(HorseId),

    CONSTRAINT FK_HorseParticipationInCompetition_Competition
        FOREIGN KEY (CompetitionId) REFERENCES Competition(CompetitionId),

    CONSTRAINT FK_HCHorseParticipationInCompetition_Approver
        FOREIGN KEY (HCApproverSystemUserId) REFERENCES SystemUser(SystemUserId)
);
GO

/* =========================================================
   8) BILLS / PAYMENTS / FINES
   ========================================================= */

CREATE TABLE Bill
(
    BillId INT IDENTITY(1,1) PRIMARY KEY,
    PaidByPersonId INT NOT NULL,
    AmountToPay DECIMAL(10,2) NOT NULL,
    DateOpened DATETIME2(0) NOT NULL,
    DateClosed DATETIME2(0) NULL,

    CONSTRAINT CK_Bill_AmountToPay
        CHECK (AmountToPay >= 0),

    CONSTRAINT CK_Bill_Dates
        CHECK (DateClosed IS NULL OR DateClosed >= DateOpened),

    CONSTRAINT FK_Bill_PaidByPerson
        FOREIGN KEY (PaidByPersonId) REFERENCES Person(PersonId)
);
GO

CREATE TABLE Payment
(
    PaymentId INT IDENTITY(1,1) PRIMARY KEY,
    PaymentMethodId INT NOT NULL,
    EnteredBySystemUserId INT NOT NULL,
    TotalPayment DECIMAL(10,2) NOT NULL,
    [Date] DATETIME2(0) NOT NULL,
    Receipt NVARCHAR(255) NULL,

    CONSTRAINT CK_Payment_TotalPayment
        CHECK (TotalPayment >= 0),

    CONSTRAINT FK_Payment_PaymentMethod
        FOREIGN KEY (PaymentMethodId) REFERENCES PaymentMethod(PaymentMethodId),

    CONSTRAINT FK_Payment_EnteredBySystemUser
        FOREIGN KEY (EnteredBySystemUserId) REFERENCES SystemUser(SystemUserId)
);
GO

CREATE TABLE Fine
(
    FineId INT IDENTITY(1,1) PRIMARY KEY,
    FineName NVARCHAR(100) NOT NULL,
    FineDescription NVARCHAR(255) NULL,
    FineAmount DECIMAL(10,2) NOT NULL,

    CONSTRAINT CK_Fine_FineAmount
        CHECK (FineAmount >= 0)

);
GO


/* =========================================================
   9) PAID TIME SLOTS IN COMPETITION
   ========================================================= */

CREATE TABLE PaidTimeSlotInCompetition
(
    CompSlotId INT IDENTITY(1,1) PRIMARY KEY,
    CompetitionId INT NOT NULL,
    PaidTimeSlotId INT NOT NULL,
    ArenaRanchId INT NOT NULL,
    ArenaId TINYINT NOT NULL,
    SlotDate DATE NOT NULL,
    StartTime TIME(0) NOT NULL,
    EndTime TIME(0) NOT NULL,
    SlotStatus NVARCHAR(20) NULL,
    SlotNotes NVARCHAR(500) NULL,

    CONSTRAINT CK_PaidTimeSlotInCompetition_Times
        CHECK (EndTime > StartTime),

    CONSTRAINT FK_PaidTimeSlotInCompetition_Competition
        FOREIGN KEY (CompetitionId) REFERENCES Competition(CompetitionId),

    CONSTRAINT FK_PaidTimeSlotInCompetition_PaidTimeSlot
        FOREIGN KEY (PaidTimeSlotId) REFERENCES PaidTimeSlot(PaidTimeSlotId),

    CONSTRAINT FK_PaidTimeSlotInCompetition_Arena
        FOREIGN KEY (ArenaRanchId, ArenaId)
        REFERENCES Arena(RanchId, ArenaId)
);
GO

/* =========================================================
   10) PRODUCT REQUESTS
   ========================================================= */

CREATE TABLE ProductRequest
(
    PRequestId INT IDENTITY(1,1) PRIMARY KEY,
    CompetitionId INT NOT NULL,
    OrderedBySystemUserId INT NOT NULL,
    CatalogItemId INT NOT NULL,
    PRequestDateTime DATETIME2(0) NOT NULL,
    Notes NVARCHAR(500) NULL,
    ApprovalDate DATETIME2(0) NULL,

    CONSTRAINT CK_ProductRequest_ApprovalDate
        CHECK (ApprovalDate IS NULL OR ApprovalDate >= PRequestDateTime),

    CONSTRAINT FK_ProductRequest_Competition
        FOREIGN KEY (CompetitionId) REFERENCES Competition(CompetitionId),

    CONSTRAINT FK_ProductRequest_OrderedBySystemUser
        FOREIGN KEY (OrderedBySystemUserId) REFERENCES SystemUser(SystemUserId),

    CONSTRAINT FK_ProductRequest_PriceCatalog
        FOREIGN KEY (CatalogItemId) REFERENCES PriceCatalog(CatalogItemId)
);
GO

CREATE TABLE StallBooking
(
    StallBookingId INT PRIMARY KEY,
    StallRanchId INT NOT NULL,
    StallCompoundId TINYINT NOT NULL,
    StallId SMALLINT  NOT NULL,
    HorseId INT NULL,
    CheckInDate DATE NOT NULL,
    CheckOutDate DATE NULL,
    IsForTack BIT NOT NULL,

    CONSTRAINT CK_StallBooking_Dates
        CHECK (CheckOutDate IS NULL OR CheckOutDate >= CheckInDate),

    CONSTRAINT FK_StallBooking_ProductRequest
        FOREIGN KEY (StallBookingId) REFERENCES ProductRequest(PRequestId),

    CONSTRAINT FK_StallBooking_Stall
        FOREIGN KEY (StallRanchId, StallCompoundId, StallId)
        REFERENCES Stall(RanchId, CompoundId, StallId),

    CONSTRAINT FK_StallBooking_Horse
        FOREIGN KEY (HorseId) REFERENCES Horse(HorseId)
);
GO

CREATE TABLE ShavingsOrder
(
    ShavingsOrderId INT PRIMARY KEY,
    WorkerSystemUserId INT NULL,
    BagQuantity TINYINT NOT NULL,
    RequestedDeliveryTime DATETIME2(0) NULL,
    ArrivalTime DATETIME2(0) NULL,
    ResponseTime DATETIME2(0) NULL,

    CONSTRAINT CK_ShavingsOrder_BagQuantity
        CHECK (BagQuantity > 0),

    CONSTRAINT FK_ShavingsOrder_ProductRequest
        FOREIGN KEY (ShavingsOrderId) REFERENCES ProductRequest(PRequestId),

    CONSTRAINT FK_ShavingsOrder_WorkerSystemUser
        FOREIGN KEY (WorkerSystemUserId) REFERENCES SystemUser(SystemUserId)
);
GO

CREATE TABLE ShavingsOrderForStallBooking
(
    ShavingsOrderId INT NOT NULL,
    StallBookingId INT NOT NULL,
    BagQuantityPerStall TINYINT NOT NULL,

    CONSTRAINT CK_ShavingsOrderForStallBooking_BagQuantityPerStall
        CHECK (BagQuantityPerStall > 0),

    CONSTRAINT PK_ShavingsOrderForStallBooking
        PRIMARY KEY (ShavingsOrderId, StallBookingId),

    CONSTRAINT FK_ShavingsOrderForStallBooking_ShavingsOrder
        FOREIGN KEY (ShavingsOrderId) REFERENCES ShavingsOrder(ShavingsOrderId),

    CONSTRAINT FK_ShavingsOrderForStallBooking_StallBooking
        FOREIGN KEY (StallBookingId) REFERENCES StallBooking(StallBookingId)
);
GO

CREATE TABLE ProductChangeRequest
(
    ProductChangeRequestId INT IDENTITY(1,1) PRIMARY KEY,
    OriginalPRequestId INT NOT NULL UNIQUE,
    NewPRequestId INT NULL,
    AnsweredBySystemUserId INT NULL,
    [Status] NVARCHAR(20) NULL,
    RequestDate DATETIME2(0) NOT NULL,
    IsCancelled BIT NOT NULL CONSTRAINT DF_ProductChangeRequest_IsCancelled DEFAULT 0,

    CONSTRAINT CK_ProductChangeRequest_CancelLogic
        CHECK (
            (IsCancelled = 1 AND NewPRequestId IS NULL)
            OR
            (IsCancelled = 0 AND NewPRequestId IS NOT NULL)
        ),

    CONSTRAINT CK_ProductChangeRequest_DifferentRequests
        CHECK (
            NewPRequestId IS NULL OR NewPRequestId <> OriginalPRequestId
        ),

    CONSTRAINT FK_ProductChangeRequest_Original
        FOREIGN KEY (OriginalPRequestId) REFERENCES ProductRequest(PRequestId),

    CONSTRAINT FK_ProductChangeRequest_New
        FOREIGN KEY (NewPRequestId) REFERENCES ProductRequest(PRequestId),

    CONSTRAINT FK_ProductChangeRequest_AnsweredBySystemUser
        FOREIGN KEY (AnsweredBySystemUserId) REFERENCES SystemUser(SystemUserId)
);
GO

CREATE UNIQUE INDEX UX_ProductChangeRequest_NewPRequestId
ON ProductChangeRequest(NewPRequestId)
WHERE NewPRequestId IS NOT NULL;
GO

CREATE TABLE BillProductRequest
(
    BillId INT NOT NULL,
    PRequestId INT NOT NULL,
    PaymentId INT NULL,

    CONSTRAINT PK_BillProductRequest
        PRIMARY KEY (BillId, PRequestId),

    CONSTRAINT FK_BillProductRequest_Bill
        FOREIGN KEY (BillId) REFERENCES Bill(BillId),

    CONSTRAINT FK_BillProductRequest_ProductRequest
        FOREIGN KEY (PRequestId) REFERENCES ProductRequest(PRequestId),

    CONSTRAINT FK_BillProductRequest_Payment
        FOREIGN KEY (PaymentId) REFERENCES Payment(PaymentId)
);
GO

/* =========================================================
   11) SERVICE REQUESTS
   ========================================================= */

CREATE TABLE ServiceRequest
(
    SRequestId INT IDENTITY(1,1) PRIMARY KEY,
    OrderedBySystemUserId INT NOT NULL,
    HorseId INT NOT NULL,
    RiderFederationMemberId INT NULL,
    CoachFederationMemberId INT NULL,
    BillId INT NOT NULL,
    PaymentId INT NULL,
    SRequestDateTime DATETIME2(0) NOT NULL,

    CONSTRAINT FK_ServiceRequest_OrderedBySystemUser
        FOREIGN KEY (OrderedBySystemUserId) REFERENCES SystemUser(SystemUserId),

    CONSTRAINT FK_ServiceRequest_Horse
        FOREIGN KEY (HorseId) REFERENCES Horse(HorseId),

    CONSTRAINT FK_ServiceRequest_RiderFederationMember
        FOREIGN KEY (RiderFederationMemberId) REFERENCES FederationMember(FederationMemberId),

    CONSTRAINT FK_ServiceRequest_CoachFederationMember
        FOREIGN KEY (CoachFederationMemberId) REFERENCES FederationMember(FederationMemberId),

    CONSTRAINT FK_ServiceRequest_Bill
        FOREIGN KEY (BillId) REFERENCES Bill(BillId),

    CONSTRAINT FK_ServiceRequest_Payment
        FOREIGN KEY (PaymentId) REFERENCES Payment(PaymentId)
);
GO

CREATE TABLE Entry
(
    EntryId INT PRIMARY KEY,
    ClassInCompId INT NOT NULL,
    FineId INT NULL,
    PrizeRecipientName NVARCHAR(100) NULL,
    DrawOrder TINYINT NULL,

    CONSTRAINT FK_Entry_ServiceRequest
        FOREIGN KEY (EntryId) REFERENCES ServiceRequest(SRequestId),

    CONSTRAINT FK_Entry_ClassInCompetition
        FOREIGN KEY (ClassInCompId) REFERENCES ClassInCompetition(ClassInCompId),

    CONSTRAINT FK_Entry_Fine
        FOREIGN KEY (FineId) REFERENCES Fine(FineId)
);
GO

CREATE TABLE ChangeEntryRequest
(
    ChangeEntryRequestId INT IDENTITY(1,1) PRIMARY KEY,
    OriginalEntryId INT NOT NULL,
    NewEntryId INT NULL,
    RequestDateTime DATETIME2(0) NOT NULL,
    [Status] NVARCHAR(20) NULL,
    IsCancelled BIT NOT NULL CONSTRAINT DF_ChangeEntryRequest_IsCancelled DEFAULT 0,

    CONSTRAINT CK_ChangeEntryRequest_CancelLogic
        CHECK (
            (IsCancelled = 1 AND NewEntryId IS NULL)
            OR
            (IsCancelled = 0 AND NewEntryId IS NOT NULL)
        ),

    CONSTRAINT CK_ChangeEntryRequest_DifferentEntries
        CHECK (
            NewEntryId IS NULL OR NewEntryId <> OriginalEntryId
        ),

    CONSTRAINT FK_ChangeEntryRequest_OriginalEntry
        FOREIGN KEY (OriginalEntryId) REFERENCES Entry(EntryId),

    CONSTRAINT FK_ChangeEntryRequest_NewEntry
        FOREIGN KEY (NewEntryId) REFERENCES Entry(EntryId)
);
GO

CREATE TABLE PaidTimeRequest
(
    PaidTimeRequestId INT PRIMARY KEY,
    CatalogItemId INT NOT NULL,
    RequestedCompSlotId INT NOT NULL,
    AssignedCompSlotId INT NULL,
    AssignedStartTime DATETIME2(0) NULL,
    [Status] NVARCHAR(20) NULL,
    Notes NVARCHAR(500) NULL,

    CONSTRAINT FK_PaidTimeRequest_ServiceRequest
        FOREIGN KEY (PaidTimeRequestId) REFERENCES ServiceRequest(SRequestId),

    CONSTRAINT FK_PaidTimeRequest_PriceCatalog
        FOREIGN KEY (CatalogItemId) REFERENCES PriceCatalog(CatalogItemId),

    CONSTRAINT FK_PaidTimeRequest_RequestedCompSlot
        FOREIGN KEY (RequestedCompSlotId) REFERENCES PaidTimeSlotInCompetition(CompSlotId),

    CONSTRAINT FK_PaidTimeRequest_AssignedCompSlot
        FOREIGN KEY (AssignedCompSlotId) REFERENCES PaidTimeSlotInCompetition(CompSlotId)
);
GO

/* =========================================================
   12) NOTIFICATIONS / COMPETITION MESSAGES
   ========================================================= */

CREATE TABLE Notification
(
    NotificationId INT IDENTITY(1,1) PRIMARY KEY,
    NotificationTypeId INT NOT NULL,
    NotificationContent NVARCHAR(500) NOT NULL,
    SendDate DATETIME2(0) NULL,
    CreatedDateTime DATETIME2(0) NOT NULL,
    [Status] NVARCHAR(20) NULL,

    CONSTRAINT FK_Notification_NotificationType
        FOREIGN KEY (NotificationTypeId) REFERENCES NotificationType(NotificationTypeId)
);
GO

CREATE TABLE CompetitionMessage
(
    CompetitionId INT NOT NULL,
    MessageId INT NOT NULL,

    CONSTRAINT PK_CompetitionMessage
        PRIMARY KEY (CompetitionId, MessageId),

    CONSTRAINT FK_CompetitionMessage_Competition
        FOREIGN KEY (CompetitionId) REFERENCES Competition(CompetitionId),

    CONSTRAINT FK_CompetitionMessage_Message
        FOREIGN KEY (MessageId) REFERENCES MessageForCompetition(MessageId)
);
GO
