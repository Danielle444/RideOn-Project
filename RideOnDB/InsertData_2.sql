USE RideOn;
GO

/* =========================================================
   ========================================================= */

INSERT INTO ProductCategory (CategoryName)
VALUES
(N'פייד טיים'),
(N'תאים'),
(N'נסורת');
GO

/* =========================================================
   ========================================================= */

INSERT INTO Product (CategoryId, ProductName)
VALUES
(1, N'פייד טיים קצר'),
(1, N'פייד טיים ארוך'),
(2, N'תא רגיל'),
(2, N'תא משודרג'),
(3, N'שק נסורת רגיל');
GO

/* =========================================================
   ========================================================= */

INSERT INTO PaidTimeProduct (ProductId, DurationMinutes)
VALUES
(1, 7),   -- פייד טיים קצר
(2, 10);  -- פייד טיים ארוך
GO

/* =========================================================
========================================================= */

INSERT INTO Field (FieldName)
VALUES
(N'ריינינג'),
(N'קאטינג'),
(N'אולארונד'),
(N'אקסטרים'),
(N'קפיצות'),
(N'דרסז');
GO

/* =========================================================
   ========================================================= */

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

/* =========================================================
   ========================================================= */

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

/* =========================================================
   ========================================================= */

INSERT INTO PrizeType (PrizeTypeName, PrizeDescription)
VALUES
(N'שובר', N'שובר קניה באחת מחנויות ציוד סוסים'),
(N'ג''קפוט', N'כסף אשר נאסף מתוך התשלום על המקצה והולך לטובת פרס שנאסף בכיתה'),
(N'כסף מוסף', N'סכום כסף שמוגדר מראש שהולך כולו לטובת הפרס בכיתה');
GO

/* =========================================================
   ========================================================= */

INSERT INTO PaymentMethod (PaymentMethodType)
VALUES
(N'אשראי'),
(N'מזומן'),
(N'העברה בנקאית'),
(N'צ''ק');
GO

/* =========================================================
   ========================================================= */

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

/* =========================================================
   ========================================================= */

INSERT INTO JudgeField (JudgeId, FieldId)
VALUES
(1, 3), -- Teresa Sullivan -> אולארונד
(2, 3), -- Sylvia Katschker -> אולארונד
(3, 4), -- Shchar Hashuv -> אקסטרים
(3, 2), -- Shchar Hashuv -> קאטינג
(4, 4), -- Sharon Shechtman -> אקסטרים
(5, 4), -- Shai Kaneti -> אקסטרים
(5, 2), -- Shai Kaneti -> קאטינג
(6, 2), -- Nitzan Peleg -> קאטינג
(7, 1), -- Ricky Bordignon -> ריינינג
(8, 1), -- Linda Long -> ריינינג
(9, 1); -- Francois Gauthier -> ריינינג
GO

/* =========================================================
   ========================================================= */

INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
VALUES
(1, N'פתוח לא מוגבל', NULL, NULL),
(1, N'ירוקי התאחדות', NULL, NULL),
(1, N'ירוקי רוכב חדש התאחדות', NULL, NULL),
(1, N'נוער ירוקי התאחדות', NULL, NULL),
(1, N'Unrestricted Youth NRHA', NULL, NULL),
(1, N'נונ פרו 50+', NULL, NULL),
(1, N'Open NRHA', NULL, NULL),
(1, N'Limited Open NRHA', NULL, NULL),
(1, N'Novice Horse Open Level 1 NRHA', NULL, NULL),
(1, N'נוביס התאחדות', NULL, NULL),
(1, N'נוביס נונ פרו התאחדות', NULL, NULL),
(1, N'Non Pro NRHA', NULL, NULL),
(1, N'Limited Non Pro NRHA', NULL, NULL),
(1, N'Prime Time Non Pro NRHA', NULL, NULL),
(1, N'Youth 14-18 NRHA', NULL, NULL),
(1, N'Youth 13 & Under NRHA', NULL, NULL);
GO

INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
VALUES
(2, N'קאו הורס נונ פרו', NULL, NULL),
(2, N'קאטינג פתוח', NULL, NULL),
(2, N'קאטינג פתוח NCHA', NULL, NULL),
(2, N'קאטינג נונ פרו', NULL, NULL),
(2, N'קאטינג נונ פרו NCHA', NULL, NULL),
(2, N'קאטינג נוביס', NULL, NULL),
(2, N'קאטינג נוביס נונ פרו', NULL, NULL),
(2, N'קאטינג נוביס פרימיום', NULL, NULL),
(2, N'קאטינג נוביס פרימיום נונ פרו', NULL, NULL),
(2, N'קאו הורס פתוח', NULL, NULL),
(2, N'קאטינג נונ פרו פלאטינום', NULL, NULL),
(2, N'NCHA 2000 Limit Rider', NULL, NULL),
(2, N'קאטינג נונ פרו מוגבל', NULL, NULL),
(2, N'קאטינג נוער', NULL, NULL),
(2, N'קאטינג נוער NCHA', NULL, NULL),
(2, N'קאטינג נוער ירוקי עד 18', NULL, NULL),
(2, N'קאטינג נוער ירוקי עד 15', NULL, NULL),
(2, N'קאטינג ירוקי בוגרים', NULL, NULL),
(2, N'קאטינג ירוקי 40+', NULL, NULL);
GO

INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
VALUES
(4, N'אקסטרים קאובוי פתוח מוגבל - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי פתוח  - IEF', NULL, NULL),
(4, N'Youth EXCA', NULL, NULL),
(4, N'Intermediate EXCA', NULL, NULL),
(4, N'אקס'' קאובוי - ראנג'' סורטינג נונפרו', NULL, NULL),
(4, N'אקס'' קאובוי - ראנג'' סורטינג פתוח', NULL, NULL),
(4, N'אקס'' קאובוי עד 18 ירוקי רוכב חדש - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי עד 18 ירוקי - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נוער עד גיל 12 IEF', NULL, NULL),
(4, N'אקסטרים קאובוי רוכב ירוקי - IEF', NULL, NULL),
(4, N'אקס'' קאובוי רוכב ירוקי רוכב חדש - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נונ פרו מוגבל IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נוער עד 18 מוגבל IEF', NULL, NULL),
(4, N'NONPRO EXCA', NULL, NULL),
(4, N'PRO EXCA', NULL, NULL),
(4, N'אקסטרים קאובוי נוביס  - IEF', NULL, NULL),
(4, N'Young Gun EXCA', NULL, NULL),
(4, N'אקס'' קאובוי עד15 ירוקי רוכב חדש - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי עד 15 ירוקי - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נוער עד גיל 18 - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נוער עד גיל 15 - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נונ פרו 40+ - IEF', NULL, NULL),
(4, N'אקסטרים קאובוי נונ פרו  - IEF', NULL, NULL),
(4, N'OPEN EXCA', NULL, NULL),
(4, N'Novice EXCA', NULL, NULL),
(4, N'אקסטרים קאובוי - נוביס נונ פרו', NULL, NULL),
(4, N'אקסטרים קאובוי עד 12 ירוקי - IEF', NULL, NULL);
GO


INSERT INTO ClassType (FieldId, ClassName, JudgingSheetFormat, QualificationDescription)
VALUES
(3, N'מקצה אימון טרייל', NULL, NULL),
(3, N'טרייל פתוח', NULL, NULL),
(3, N'טרייל  עד 18', NULL, NULL),
(3, N'טרייל ירוקי עד 15', NULL, NULL),
(3, N'מקצה אימון הורסמנשיפ', NULL, NULL),
(3, N'מקצה אימון פלז''ר', NULL, NULL),
(3, N'הליכה ג''וג עד גיל 18', NULL, NULL),
(3, N'הורסמנשיפ הליכה ג''וג עד גיל 18', NULL, NULL),
(3, N'הורסמנשיפ ירוקי עד 18', NULL, NULL),
(3, N'האנט סיט אקוויטיישן פתוח', NULL, NULL),
(3, N'האנטר אנדר סאדל פתוח', NULL, NULL),
(3, N'האנט סיט אקוויטיישן עד גיל 18', NULL, NULL),
(3, N'האנטר אנדר סאדל עד גיל 18', NULL, NULL),
(3, N'האנטר אנדר סאדל ירוקי עד 18', NULL, NULL),
(3, N'האנטר אנדר סאדל עד גיל 15', NULL, NULL),
(3, N'האנט סיט אקוויטיישן ירוקי עד 15', NULL, NULL),
(3, N'האנטר אנדר סאדל ירוקי עד 15', NULL, NULL),
(3, N'האנט סיט אקוויטיישן עד גיל 13', NULL, NULL),
(3, N'האנטר אנדר סאדל עד גיל 13', NULL, NULL),
(3, N'האנטר אנדר סאדל 13 ירוקי', NULL, NULL),
(3, N'טרייל נונ פרו', NULL, NULL),
(3, N'טרייל פתוח לסוסי נוביס', NULL, NULL),
(3, N'טרייל ירוקי עד 18', NULL, NULL),
(3, N'טרייל הליכה ג''וג עד גיל 18', NULL, NULL),
(3, N'טרייל עד גיל 13', NULL, NULL),
(3, N'הורסמנשיפ פתוח', NULL, NULL),
(3, N'הורסמנשיפ ירוקי בוגרים', NULL, NULL),
(3, N'הורסמנשיפ ירוקי עד 13', NULL, NULL),
(3, N'הורסמנשיפ עד 15', NULL, NULL),
(3, N'הורסמנשיפ נוביס נוער', NULL, NULL),
(3, N'הורסמנשיפ עד גיל 10', NULL, NULL),
(3, N'פלז''ר נונ פרו', NULL, NULL),
(3, N'פלזר נונפרו 40+ הליכה גוג', NULL, NULL),
(3, N'הליכה ג''וג עד גיל 10', NULL, NULL),
(3, N'פלז''ר ירוקי בוגרים', NULL, NULL),
(3, N'פלז''ר פתוח לסוסי נוביס', NULL, NULL),
(3, N'פלז''ר עד 18', NULL, NULL),
(3, N'פלז''ר ירוקי עד 15', NULL, NULL),
(3, N'הליכה ג''וג סירקט עד 13', NULL, NULL),
(3, N'פלז''ר עד גיל 13', NULL, NULL),
(3, N'שואומנשיפ', NULL, NULL),
(3, N'שואומנשיפ  ירוקי', NULL, NULL),
(3, N'טרייל נוביס נוער', NULL, NULL),
(3, N'טרייל עד  15', NULL, NULL),
(3, N'טרייל ירוקי בוגרים', NULL, NULL),
(3, N'טרייל ירוקי עד 13', NULL, NULL),
(3, N'טרייל עד גיל 10', NULL, NULL),
(3, N'הורסמנשיפ נונ פרו', NULL, NULL),
(3, N'הורסמנשיפ פתוח לסוסי נוביס', NULL, NULL),
(3, N'הורסמנשיפ ונפרו 40+ הליכה גוג', NULL, NULL),
(3, N'הורסמנשיפ עד 18', NULL, NULL),
(3, N'הורסמנשיפ ירוקי עד 15', NULL, NULL),
(3, N'הורסמנשיפ עד גיל 13', NULL, NULL),
(3, N'פלז''ר פתוח', NULL, NULL),
(3, N'פלזר נוביס נוער', NULL, NULL),
(3, N'פלז''ר  ירוקי עד  18', NULL, NULL),
(3, N'פלז''ר עד  15', NULL, NULL),
(3, N'הליכה ג''וג עד גיל 13', NULL, NULL);
GO

/* =========================================================
   ========================================================= */

