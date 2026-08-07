import { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getTrainersByRanch } from "../services/federationMembersService";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getPaidTimeCandidatesByRanch } from "../services/entriesService";
import { getManagedPayers } from "../services/payerService";
import {
  createPaidTimeRequest,
  getPaidTimeRequestEditDetail,
  updatePaidTimeRequestNotes,
} from "../services/paidTimeRequestsService";
import {
  validatePaidTimeForm,
  clearFieldError,
  buildPaidTimeReviewModel,
  buildPaidTimeRequestPayload,
  buildPaidTimeUpdatePayload,
  buildSuccessSnapshot,
  getHebrewDateLabel,
  formatDisplayTime,
  formatDurationLabel,
  formatPriceLabel,
} from "../utils/paidTimeRequestForm";

var CREATE_ERROR_MESSAGE =
  "אירעה שגיאה בשמירת בקשת הפייד טיים. אנא נסי שוב.";
var EDIT_ERROR_MESSAGE =
  "אירעה שגיאה בעדכון בקשת הפייד טיים. אנא נסי שוב.";
var EDIT_NOT_FOUND_MESSAGE = "בקשת הפייד-טיים לא נמצאה";

function normalizeHorseItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    horseName: item.horseName || item.HorseName || "",
    barnName: item.barnName || item.BarnName || "",
  };
}

function normalizeFederationMemberItem(item) {
  if (!item) {
    return null;
  }

  return {
    federationMemberId:
      item.federationMemberId ||
      item.FederationMemberId ||
      item.riderFederationMemberId ||
      item.RiderFederationMemberId ||
      item.coachFederationMemberId ||
      item.CoachFederationMemberId ||
      null,
    firstName: item.firstName || item.FirstName || "",
    lastName: item.lastName || item.LastName || "",
    fullName:
      item.fullName ||
      item.FullName ||
      item.riderName ||
      item.RiderName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
  };
}

function normalizePayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    personId:
      item.personId ||
      item.PersonId ||
      item.paidByPersonId ||
      item.PaidByPersonId ||
      null,
    firstName: item.firstName || item.FirstName || "",
    lastName: item.lastName || item.LastName || "",
    fullName:
      item.fullName ||
      item.FullName ||
      item.payerName ||
      item.PayerName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
  };
}

// דה-דופ של שורות מועמדים לפי מפתח, בסדר ההופעה הראשון - ל-CAP-1
// (הורדת הכפילויות מ-usp_getpaidtimecandidatesbyranch, שמחזירה שורה לכל entry).
function dedupeByKey(items, keyGetter) {
  var seen = {};
  var result = [];

  items.forEach(function (item) {
    var key = keyGetter(item);

    if (key === null || key === undefined || key === "" || seen[key]) {
      return;
    }

    seen[key] = true;
    result.push(item);
  });

  return result;
}

function normalizePaidTimeSlotItem(item) {
  if (!item) {
    return null;
  }

  return {
    paidTimeSlotInCompId:
      item.paidTimeSlotInCompId ||
      item.PaidTimeSlotInCompId ||
      null,
    slotDate: item.slotDate || item.SlotDate || null,
    startTime: item.startTime || item.StartTime || "",
    endTime: item.endTime || item.EndTime || "",
    timeOfDay: item.timeOfDay || item.TimeOfDay || "",
    arenaName: item.arenaName || item.ArenaName || "",
  };
}

function normalizePriceCatalogItem(item) {
  if (!item) {
    return null;
  }

  return {
    priceCatalogId:
      item.priceCatalogId ||
      item.PriceCatalogId ||
      null,
    productId: item.productId || item.ProductId || null,
    itemPrice: item.itemPrice || item.ItemPrice || null,
    durationMinutes: item.durationMinutes || item.DurationMinutes || null,
    productName: item.productName || item.ProductName || "",
  };
}

function formatHorseLabel(item) {
  if (!item) {
    return "";
  }

  var horseName = String(item.horseName || "").trim();
  var barnName = String(item.barnName || "").trim();

  if (barnName) {
    return horseName + " (" + barnName + ")";
  }

  return horseName;
}

function formatMemberLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.fullName || "").trim();
}

function formatPayerLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.fullName || "").trim();
}

function formatRequestedSlotLabel(item) {
  if (!item) {
    return "";
  }

  var dateLabel = getHebrewDateLabel(item.slotDate);
  var timeLabel = [
    formatDisplayTime(item.startTime),
    formatDisplayTime(item.endTime),
  ]
    .filter(Boolean)
    .join(" - ");
  var arenaName = String(item.arenaName || "").trim();

  return [dateLabel, timeLabel, arenaName].filter(Boolean).join(" • ");
}

function formatPriceCatalogLabel(item) {
  if (!item) {
    return "";
  }

  var duration = formatDurationLabel(item.durationMinutes);
  var price = formatPriceLabel(item.itemPrice);

  return [item.productName || "", duration, price].filter(Boolean).join(" • ");
}

export default function useAdminCompetitionPaidTimes(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  // רק לתצוגה במסך האישור. אם המסך לא מספק שם תחרות, פשוט לא מוצגת שורה.
  var competitionName = params.competitionName || "";
  // CAP-1: כשמסופק, ה-hook הזה עובד במצב עריכה של בקשה קיימת במקום יצירה.
  // מצב ה-hook (יצירה מול עריכה) נקבע פעם אחת ב-mount - כל מסך שמייצר
  // פתיחה חדשה עבור בקשה אחרת ממקם מופע חדש של CompetitionPaidTimeFormCard/
  // useAdminCompetitionPaidTimes (mount מותנה), לא מחליף פרמטר על מופע קיים.
  var editPaidTimeRequestId = params.editPaidTimeRequestId || null;
  var isEditMode = !!editPaidTimeRequestId;
  // CAP-4: "managed" = usp_getmanagedpayersbysystemuser (המשלמים המנוהלים
  // המאושרים של החווה - רשימה רחבה יותר), במקום ברירת המחדל (מועמדים לפי
  // usp_getpaidtimecandidatesbyranch, רק משלמים שכבר משויכים למקצה שנרשם
  // בפועל בתחרות זו). נבחר ע"י הקורא של ה-Add הבלתי-נעול בלבד - זרימת
  // ה-Add הנעולה (payer-account) וזרימת העריכה ממשיכות במקור הקיים.
  var payerSource = params.payerSource === "managed" ? "managed" : "candidates";

  var [horses, setHorses] = useState([]);
  var [riders, setRiders] = useState([]);
  var [trainers, setTrainers] = useState([]);
  var [payers, setPayers] = useState([]);
  var [requestableSlots, setRequestableSlots] = useState([]);
  var [priceCatalogItems, setPriceCatalogItems] = useState([]);

  var [selectedPriceCatalog, setSelectedPriceCatalog] = useState(null);
  var [selectedRequestedSlot, setSelectedRequestedSlot] = useState(null);
  var [selectedHorse, setSelectedHorse] = useState(null);
  var [selectedRider, setSelectedRider] = useState(null);
  var [selectedTrainer, setSelectedTrainer] = useState(null);
  var [selectedPayer, setSelectedPayer] = useState(null);
  var [notes, setNotes] = useState("");

  var [locks, setLocks] = useState({
    priceCatalog: false,
    requestedSlot: false,
    horse: false,
    rider: false,
    coach: false,
    payer: false,
    notes: false,
  });

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  // ולידציה ברמת השדה: מפה של fieldKey -> הודעה, כדי שכל השדות החסרים
  // יוצגו יחד מתחת לשדה שלהם במקום Alert עם השגיאה הראשונה בלבד.
  var [fieldErrors, setFieldErrors] = useState({});
  // שגיאה שאינה של שדה בטופס (משתמש מחובר / חווה פעילה חסרים).
  var [formError, setFormError] = useState("");
  // בקשת גלילה לסקשן הראשון שנכשל. ה-token משתנה בכל ניסיון כושל.
  var [scrollRequest, setScrollRequest] = useState(null);

  var [isReviewOpen, setIsReviewOpen] = useState(false);
  var [reviewModel, setReviewModel] = useState(null);
  var [submitError, setSubmitError] = useState("");

  var [successSnapshot, setSuccessSnapshot] = useState(null);
  var [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // CAP-1: gating מהפרוצדורה החדשה usp_getpaidtimerequestforedit, ברירת
  // מחדל חופשית (true/true) כדי שמצב יצירה לעולם לא ייחסם בטעות לפני
  // שהעריכה בכלל נטענה.
  var [editGating, setEditGating] = useState({
    canModify: true,
    canCancel: true,
    status: null,
  });
  var [editLoadError, setEditLoadError] = useState("");
  // עולה ב-1 בכל שמירת עריכה מוצלחת - הצרכן (PaidTimeCreateModal) מאזין
  // לשינוי כדי לסגור את המודל, בלי לעבור דרך מסך סקירה/הצלחה שלא מתאים
  // לזרימת עריכה.
  var [editSaveVersion, setEditSaveVersion] = useState(0);
  // מבטיח שפרטי העריכה נטענים ומיישרים את הטופס פעם אחת בלבד - לא בכל
  // focus חוזר, כדי לא לדרוס בחירות שהמשתמשת כבר שינתה באמצע עריכה.
  var hasHydratedEditRef = useRef(false);

  useFocusEffect(
    useCallback(
      function () {
        if (!activeRole || !activeRole.ranchId || !competitionId) {
          return;
        }

        loadScreenData();
      },
      [activeRole, competitionId],
    ),
  );

  async function loadScreenData() {
    try {
      if (!activeRole || !activeRole.ranchId || !competitionId) {
        return;
      }

      setLoading(true);
      setScreenError("");

      // CAP-1: פרטי העריכה נטענים באותו Promise.all, פעם אחת בלבד
      // (hasHydratedEditRef), כדי לא לשלוח בקשה מיותרת בכל focus חוזר.
      var shouldLoadEditDetail = isEditMode && !hasHydratedEditRef.current;
      // CAP-4: מקור משלם רחב (usp_getmanagedpayersbysystemuser) רק כשמבקשים
      // אותו במפורש - ראו payerSource למעלה. שני המצבים האחרים (יצירה עם
      // משלם נעול, עריכה) ממשיכים במקור המועמדים הקיים בלי שינוי.
      var shouldLoadManagedPayers = payerSource === "managed";

      // חמישה "משבצות" קבועות (חלקן Promise.resolve(null) כשלא רלוונטיות)
      // כדי ש-results[i] יישאר יציב בלי תלות באילו מהן בפועל נטענו.
      var results = await Promise.all([
        getCompetitionInvitationDetails(
          competitionId,
          activeRole.roleId,
          activeRole.ranchId,
        ),
        getPaidTimeCandidatesByRanch(competitionId, activeRole.ranchId),
        getTrainersByRanch(activeRole.ranchId, null),
        shouldLoadEditDetail
          ? getPaidTimeRequestEditDetail(
              editPaidTimeRequestId,
              activeRole.ranchId,
            )
          : Promise.resolve(null),
        shouldLoadManagedPayers
          ? getManagedPayers(activeRole.ranchId, null, "Approved")
          : Promise.resolve(null),
      ]);

      var invitationResponse = results[0];
      var candidatesResponse = results[1];
      var trainersResponse = results[2];
      var editDetailResponse = shouldLoadEditDetail ? results[3] : null;
      var managedPayersResponse = shouldLoadManagedPayers ? results[4] : null;

      // CAP-1: מקור אחד לסוס/רוכב/משלם - רק בעלי חיים/גורמים הרשומים
      // בפועל למקצה בתחרות הזו (usp_getpaidtimecandidatesbyranch), במקום
      // כל בעלי החיים/גורמי החווה כולל "רוחות רפאים". המאמן נשאר מכל
      // מאמני החווה (getTrainersByRanch) - הפרוצדורה מסננת מאמן חובה,
      // כך שרשימת מאמנים ממנה תהיה חסרה.
      var candidateRows = Array.isArray(candidatesResponse?.data)
        ? candidatesResponse.data
        : [];

      var incomingSlots = Array.isArray(invitationResponse?.data?.paidTimeSlots)
        ? invitationResponse.data.paidTimeSlots
        : [];

      var incomingPriceSections = Array.isArray(
        invitationResponse?.data?.servicePriceSections,
      )
        ? invitationResponse.data.servicePriceSections
        : [];

      var paidTimeSection =
        incomingPriceSections.find(function (section) {
          return (
            String(section?.categoryName || "").trim() === "פייד טיים" ||
            Number(section?.categoryId) === 1
          );
        }) || null;

      var incomingPriceItems = Array.isArray(paidTimeSection?.items)
        ? paidTimeSection.items
        : [];

      var nextRequestableSlots = incomingSlots
        .map(function (item) {
          return normalizePaidTimeSlotItem(item);
        })
        .filter(Boolean);

      var nextPriceCatalogItems = incomingPriceItems
        .map(function (item) {
          return normalizePriceCatalogItem(item);
        })
        .filter(Boolean);

      var nextHorses = dedupeByKey(candidateRows, function (item) {
        return item.horseId || item.HorseId || null;
      })
        .map(function (item) {
          return normalizeHorseItem(item);
        })
        .filter(Boolean);

      // CAP-4: מקור המשלם ל-Add הבלתי-נעול הוא usp_getmanagedpayersbysystemuser
      // (רשימה רחבה - המשלמים המנוהלים המאושרים של החווה), לא מוגבל למי
      // שכבר משויך למקצה שנרשם. normalizePayerItem כבר דו-casing-מגונן
      // (personId/PersonId, fullName/FullName) - נעשה בו שימוש חוזר ישירות,
      // בלי מתאם חדש; usp_insertpaidtimerequest מוודא רק שהמשלם קיים
      // כאדם, כך שרשימה רחבה יותר לא מפרה את כלל היצירה.
      var nextPayers = shouldLoadManagedPayers
        ? (Array.isArray(managedPayersResponse?.data)
            ? managedPayersResponse.data
            : []
          )
            .map(function (item) {
              return normalizePayerItem(item);
            })
            .filter(Boolean)
        : dedupeByKey(candidateRows, function (item) {
            return item.paidByPersonId || item.PaidByPersonId || null;
          })
            .map(function (item) {
              return normalizePayerItem(item);
            })
            .filter(Boolean);

      var nextRiders = dedupeByKey(candidateRows, function (item) {
        return (
          item.riderFederationMemberId || item.RiderFederationMemberId || null
        );
      })
        .map(function (item) {
          return normalizeFederationMemberItem(item);
        })
        .filter(Boolean);

      var nextTrainers = (
        Array.isArray(trainersResponse?.data) ? trainersResponse.data : []
      )
        .map(function (item) {
          return normalizeFederationMemberItem(item);
        })
        .filter(Boolean);

      setRequestableSlots(nextRequestableSlots);
      setPriceCatalogItems(nextPriceCatalogItems);
      setHorses(nextHorses);
      setPayers(nextPayers);
      setRiders(nextRiders);
      setTrainers(nextTrainers);

      // CAP-1: יישור הטופס עם בקשה קיימת, פעם אחת. הסלוט חייב להיפתר בתוך
      // requestableSlots (לא מסונתז) כדי שהמדרג תאריך/חלק-יום/מגרש/שעה-מדויקת
      // ב-CompetitionPaidTimeFormCard יתמלא נכון - אם הבקשה מצביעה על סלוט
      // שאינו ברשימה (למשל תאריך שכבר עבר וסונן החוצה מ-getCompetitionInvitationDetails),
      // השדה נשאר ריק והמשתמשת בוחרת מחדש; לא ידוע מקרה כזה בפועל, מסומן
      // כמגבלה ולא תוקן באופן שקט.
      if (shouldLoadEditDetail) {
        hasHydratedEditRef.current = true;

        var detail = editDetailResponse ? editDetailResponse.data : null;

        if (!detail) {
          setEditLoadError(EDIT_NOT_FOUND_MESSAGE);
        } else {
          var resolvedSlot =
            nextRequestableSlots.find(function (item) {
              return (
                item.paidTimeSlotInCompId === detail.requestedCompSlotId
              );
            }) || null;

          var resolvedPriceCatalog =
            nextPriceCatalogItems.find(function (item) {
              return item.priceCatalogId === detail.priceCatalogId;
            }) || null;

          var resolvedHorse =
            nextHorses.find(function (item) {
              return item.horseId === detail.horseId;
            }) || null;

          var resolvedRider =
            nextRiders.find(function (item) {
              return item.federationMemberId === detail.riderFederationMemberId;
            }) || null;

          var resolvedCoach = detail.coachFederationMemberId
            ? nextTrainers.find(function (item) {
                return (
                  item.federationMemberId === detail.coachFederationMemberId
                );
              }) || null
            : null;

          var resolvedPayer =
            nextPayers.find(function (item) {
              return item.personId === detail.paidByPersonId;
            }) || null;

          setSelectedRequestedSlot(resolvedSlot);
          setSelectedPriceCatalog(resolvedPriceCatalog);
          setSelectedHorse(resolvedHorse);
          setSelectedRider(resolvedRider);
          setSelectedTrainer(resolvedCoach);
          setSelectedPayer(resolvedPayer);
          setNotes(detail.notes || "");

          setEditGating({
            canModify: !!detail.canModify,
            canCancel: !!detail.canCancel,
            status: detail.status || null,
          });
        }
      }
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת נתוני פייד טיים"),
      );
    } finally {
      setLoading(false);
    }
  }

  // עוטפים את ה-setters כדי לנקות את שגיאת השדה ברגע שהמשתמשת מתקנת אותו.
  // ניקוי בחירה (בחירת null) לא מנקה את השגיאה - השדה עדיין חסר.
  function buildFieldSetter(setValue, fieldKey) {
    return function (nextValue) {
      setValue(nextValue);

      if (!nextValue) {
        return;
      }

      setFieldErrors(function (prevErrors) {
        return clearFieldError(prevErrors, fieldKey);
      });
    };
  }

  var setSelectedPriceCatalogField = buildFieldSetter(
    setSelectedPriceCatalog,
    "priceCatalog",
  );
  var setSelectedRequestedSlotField = buildFieldSetter(
    setSelectedRequestedSlot,
    "requestedSlot",
  );
  var setSelectedHorseField = buildFieldSetter(setSelectedHorse, "horse");
  var setSelectedRiderField = buildFieldSetter(setSelectedRider, "rider");
  var setSelectedTrainerField = buildFieldSetter(setSelectedTrainer, "coach");
  var setSelectedPayerField = buildFieldSetter(setSelectedPayer, "payer");

  function handleToggleLock(fieldKey) {
    setLocks(function (prevLocks) {
      return {
        ...prevLocks,
        [fieldKey]: !prevLocks[fieldKey],
      };
    });
  }

  function resetUnlockedFields() {
    setSelectedPriceCatalog(function (prevValue) {
      return locks.priceCatalog ? prevValue : null;
    });

    setSelectedRequestedSlot(function (prevValue) {
      return locks.requestedSlot ? prevValue : null;
    });

    setSelectedHorse(function (prevValue) {
      return locks.horse ? prevValue : null;
    });

    setSelectedRider(function (prevValue) {
      return locks.rider ? prevValue : null;
    });

    setSelectedTrainer(function (prevValue) {
      return locks.coach ? prevValue : null;
    });

    setSelectedPayer(function (prevValue) {
      return locks.payer ? prevValue : null;
    });

    setNotes(function (prevValue) {
      return locks.notes ? prevValue : "";
    });
  }

  function getFormValues() {
    return {
      requestedSlot: selectedRequestedSlot,
      priceCatalog: selectedPriceCatalog,
      horse: selectedHorse,
      rider: selectedRider,
      coach: selectedTrainer,
      payer: selectedPayer,
      notes: notes,
      user: user,
      activeRole: activeRole,
      competitionName: competitionName,
    };
  }

  var labelFormatters = {
    formatHorseLabel: formatHorseLabel,
    formatMemberLabel: formatMemberLabel,
    formatPayerLabel: formatPayerLabel,
  };

  // הפעולה הראשית של הטופס: ולידציה של הכל במכה אחת, ואם תקין - פתיחת
  // מסך האישור. אין כאן קריאה ליצירה; היא קורית רק מ-handleConfirmSubmit.
  function handleContinueToReview() {
    var result = validatePaidTimeForm(getFormValues());

    setFieldErrors(result.fieldErrors);
    setFormError(result.contextError);

    if (!result.isValid) {
      if (result.firstInvalidFieldKey) {
        setScrollRequest(function (prevRequest) {
          return {
            fieldKey: result.firstInvalidFieldKey,
            token: (prevRequest ? prevRequest.token : 0) + 1,
          };
        });
      }

      return;
    }

    setSubmitError("");
    setReviewModel(buildPaidTimeReviewModel(getFormValues(), labelFormatters));
    setIsReviewOpen(true);
  }

  function handleBackToEdit() {
    if (isSaving) {
      return;
    }

    setIsReviewOpen(false);
    setSubmitError("");
  }

  async function handleConfirmSubmit() {
    // הגנה כפולה מפני שליחה כפולה: גם הכפתור מושבת בזמן שמירה, וגם כאן.
    if (isSaving) {
      return;
    }

    var values = getFormValues();
    var result = validatePaidTimeForm(values);

    if (!result.isValid) {
      setFieldErrors(result.fieldErrors);
      setFormError(result.contextError);
      setIsReviewOpen(false);
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError("");

      await createPaidTimeRequest(buildPaidTimeRequestPayload(values));

      // צילום המצב לפני האיפוס - כדי שמסך ההצלחה יציג את מה שנשלח גם
      // אחרי שהשדות הלא נעולים התרוקנו.
      setSuccessSnapshot(buildSuccessSnapshot(values, labelFormatters));
      setIsReviewOpen(false);
      setReviewModel(null);
      setIsSuccessOpen(true);
      setFieldErrors({});
      setFormError("");

      // התנהגות הנעילה/השימור נשארה בדיוק כפי שהייתה.
      resetUnlockedFields();
    } catch (error) {
      // בכוונה לא מוצג טקסט השרת/מסד הנתונים - רק הודעה בעברית למשתמשת.
      setSubmitError(CREATE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCloseSuccess() {
    setIsSuccessOpen(false);
    setSuccessSnapshot(null);
  }

  // CAP-1: שמירת עריכה - ללא מסך סקירה/הצלחה (לא מתאים לזרימת עריכה, ראו
  // הערת PaidTimeCreateModal). ולידציה זהה ליצירה נשארת רלוונטית: כל
  // השדות מולאו מ-usp_getpaidtimerequestforedit, אז כישלון ולידציה כאן
  // אומר שהפתרון (resolve) מול requestableSlots/horses/... נכשל.
  async function handleSaveEdit() {
    if (isSaving) {
      return;
    }

    var values = getFormValues();
    var result = validatePaidTimeForm(values);

    if (!result.isValid) {
      setFieldErrors(result.fieldErrors);
      setFormError(result.contextError);
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError("");

      await updatePaidTimeRequestNotes(
        buildPaidTimeUpdatePayload(
          editPaidTimeRequestId,
          activeRole ? activeRole.ranchId : null,
          values,
        ),
      );

      setFieldErrors({});
      setFormError("");
      setEditSaveVersion(function (prevVersion) {
        return prevVersion + 1;
      });
    } catch (error) {
      setSubmitError(EDIT_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  // "המשך לאישור" חייב להיות לחיץ גם כשחסרים שדות - זו הפעולה שמפעילה את
  // הוולידציה ומציגה את כל השגיאות יחד. לכן החסימה היחידה היא שמירה פעילה.
  var canSubmit = useMemo(
    function () {
      return !isSaving;
    },
    [isSaving],
  );

  return {
    horses,
    riders,
    trainers,
    payers,
    requestableSlots,
    priceCatalogItems,

    selectedPriceCatalog,
    selectedRequestedSlot,
    selectedHorse,
    selectedRider,
    selectedTrainer,
    selectedPayer,
    notes,

    setSelectedPriceCatalog: setSelectedPriceCatalogField,
    setSelectedRequestedSlot: setSelectedRequestedSlotField,
    setSelectedHorse: setSelectedHorseField,
    setSelectedRider: setSelectedRiderField,
    setSelectedTrainer: setSelectedTrainerField,
    setSelectedPayer: setSelectedPayerField,
    setNotes,

    locks,
    handleToggleLock,

    loading,
    isSaving,
    screenError,
    canSubmit,

    fieldErrors,
    formError,
    scrollRequest,

    isReviewOpen,
    reviewModel,
    submitError,
    handleContinueToReview,
    handleBackToEdit,
    handleConfirmSubmit,

    isSuccessOpen,
    successSnapshot,
    handleCloseSuccess,

    formatHorseLabel,
    formatMemberLabel,
    formatPayerLabel,
    formatRequestedSlotLabel,
    formatPriceCatalogLabel,

    isEditMode,
    editCanModify: editGating.canModify,
    editCanCancel: editGating.canCancel,
    editStatus: editGating.status,
    editLoadError,
    editSaveVersion,
    handleSaveEdit,
  };
}
