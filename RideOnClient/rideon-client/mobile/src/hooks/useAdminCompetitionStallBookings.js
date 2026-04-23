import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getCompetitionInvitationDetails } from "../services/competitionService";
import { getManagedPayers } from "../services/payerService";
import {
  getHorsesForStallBooking,
  getHorsePayersForCompetition,
  createStallBooking,
} from "../services/stallBookingsService";

function normalizeHorseItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    horseName: item.horseName || item.HorseName || "",
    barnName: item.barnName || item.BarnName || "",
    federationNumber: item.federationNumber || item.FederationNumber || "",
  };
}

function normalizeHorsePayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    horseId: item.horseId || item.HorseId || null,
    paidByPersonId: item.paidByPersonId || item.PaidByPersonId || null,
    payerFullName:
      item.payerFullName ||
      item.PayerFullName ||
      item.fullName ||
      item.FullName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
    billId: item.billId || item.BillId || null,
  };
}

function normalizeManagedPayerItem(item) {
  if (!item) {
    return null;
  }

  return {
    paidByPersonId: item.personId || item.PersonId || null,
    payerFullName:
      item.fullName ||
      item.FullName ||
      (
        (item.firstName || item.FirstName || "") +
        " " +
        (item.lastName || item.LastName || "")
      ).trim(),
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
      item.catalogItemId ||
      item.CatalogItemId ||
      null,
    productId: item.productId || item.ProductId || null,
    itemPrice: item.itemPrice || item.ItemPrice || null,
    productName: item.productName || item.ProductName || "",
    categoryName: item.categoryName || item.CategoryName || "",
  };
}

function getServicePriceSectionsFromInvitation(invitationResponse) {
  return Array.isArray(invitationResponse?.data?.servicePriceSections)
    ? invitationResponse.data.servicePriceSections
    : [];
}

function extractHorseStallPriceItems(sections) {
  var flatItems = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      flatItems.push({
        ...item,
        categoryName: categoryName,
      });
    });
  });

  return flatItems
    .map(function (item) {
      return normalizePriceCatalogItem(item);
    })
    .filter(Boolean)
    .filter(function (item) {
      var categoryName = String(item.categoryName || "").trim();
      var productName = String(item.productName || "").trim();

      var mentionsStall =
        categoryName.includes("תא") ||
        productName.includes("תא") ||
        productName.toLowerCase().includes("stall");

      var mentionsTack =
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        productName.toLowerCase().includes("tack");

      return mentionsStall && !mentionsTack;
    });
}

function extractTackStallPriceItems(sections) {
  var flatItems = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      flatItems.push({
        ...item,
        categoryName: categoryName,
      });
    });
  });

  return flatItems
    .map(function (item) {
      return normalizePriceCatalogItem(item);
    })
    .filter(Boolean)
    .filter(function (item) {
      var categoryName = String(item.categoryName || "").trim();
      var productName = String(item.productName || "").trim();

      return (
        categoryName.includes("ציוד") ||
        productName.includes("ציוד") ||
        productName.toLowerCase().includes("tack")
      );
    });
}

function formatDateForInput(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  } catch (error) {
    return "";
  }
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

function formatPayerLabel(item) {
  if (!item) {
    return "";
  }

  return String(item.payerFullName || "").trim();
}

function formatStallTypeLabel(item) {
  if (!item) {
    return "";
  }

  var productName = String(item.productName || "").trim();
  var price = item.itemPrice ? String(item.itemPrice) + " ₪" : "";

  return [productName, price].filter(Boolean).join(" • ");
}

function uniqByPersonId(items) {
  var map = {};

  items.forEach(function (item) {
    if (item && item.paidByPersonId && !map[item.paidByPersonId]) {
      map[item.paidByPersonId] = item;
    }
  });

  return Object.values(map);
}

export default function useAdminCompetitionStallBookings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var activeCompetition = params.activeCompetition;

  var [horses, setHorses] = useState([]);
  var [horsePayers, setHorsePayers] = useState([]);
  var [managedPayers, setManagedPayers] = useState([]);
  var [horseStallTypeOptions, setHorseStallTypeOptions] = useState([]);
  var [tackStallTypeOptions, setTackStallTypeOptions] = useState([]);

  var [selectedHorseToAdd, setSelectedHorseToAdd] = useState(null);
  var [selectedHorseStallType, setSelectedHorseStallType] = useState(null);

  var [checkInDate, setCheckInDate] = useState("");
  var [checkOutDate, setCheckOutDate] = useState("");
  var [notes, setNotes] = useState("");

  var [selectedHorseBookings, setSelectedHorseBookings] = useState([]);
  var [expandedHorseEditorId, setExpandedHorseEditorId] = useState(null);

  var [mode, setMode] = useState("horse");

  var [selectedTackStallType, setSelectedTackStallType] = useState(null);
  var [tackQuantity, setTackQuantity] = useState("");
  var [tackSplitMode, setTackSplitMode] = useState("equal");
  var [selectedTackPayers, setSelectedTackPayers] = useState([]);
  var [tackNotes, setTackNotes] = useState("");

  var [loading, setLoading] = useState(false);
  var [isSaving, setIsSaving] = useState(false);
  var [screenError, setScreenError] = useState("");

  useEffect(
    function () {
      if (!activeCompetition) {
        return;
      }

      var defaultStart =
        activeCompetition.competitionStartDate ||
        activeCompetition.CompetitionStartDate ||
        "";
      var defaultEnd =
        activeCompetition.competitionEndDate ||
        activeCompetition.CompetitionEndDate ||
        "";

      if (!checkInDate && defaultStart) {
        setCheckInDate(formatDateForInput(defaultStart));
      }

      if (!checkOutDate && defaultEnd) {
        setCheckOutDate(formatDateForInput(defaultEnd));
      }
    },
    [activeCompetition],
  );

  useFocusEffect(
    useCallback(
      function () {
        if (!activeRole || !activeRole.ranchId || !competitionId) {
          return;
        }

        loadData();
      },
      [activeRole, competitionId],
    ),
  );

  async function loadData() {
    try {
      setLoading(true);
      setScreenError("");

      var results = await Promise.all([
        getCompetitionInvitationDetails(
          competitionId,
          activeRole.roleId,
          activeRole.ranchId,
        ),
        getHorsesForStallBooking(competitionId, activeRole.ranchId),
        getHorsePayersForCompetition(competitionId, activeRole.ranchId),
        getManagedPayers(activeRole.ranchId, null, null),
      ]);

      var invitationResponse = results[0];
      var horsesResponse = results[1];
      var horsePayersResponse = results[2];
      var managedPayersResponse = results[3];

      var sections = getServicePriceSectionsFromInvitation(invitationResponse);

      setHorseStallTypeOptions(extractHorseStallPriceItems(sections));
      setTackStallTypeOptions(extractTackStallPriceItems(sections));

      setHorses(
        (Array.isArray(horsesResponse?.data) ? horsesResponse.data : [])
          .map(function (item) {
            return normalizeHorseItem(item);
          })
          .filter(Boolean),
      );

      setHorsePayers(
        (Array.isArray(horsePayersResponse?.data)
          ? horsePayersResponse.data
          : []
        )
          .map(function (item) {
            return normalizeHorsePayerItem(item);
          })
          .filter(Boolean),
      );

      setManagedPayers(
        (Array.isArray(managedPayersResponse?.data)
          ? managedPayersResponse.data
          : []
        )
          .map(function (item) {
            return normalizeManagedPayerItem(item);
          })
          .filter(Boolean),
      );
    } catch (error) {
      setScreenError(
        String(error?.response?.data || "אירעה שגיאה בטעינת נתוני התאים"),
      );
    } finally {
      setLoading(false);
    }
  }

  var availableHorseOptions = useMemo(
    function () {
      return horses.filter(function (horse) {
        return !selectedHorseBookings.some(function (booking) {
          return booking.horse.horseId === horse.horseId;
        });
      });
    },
    [horses, selectedHorseBookings],
  );

  function getDefaultHorsePayers(horseId) {
    return uniqByPersonId(
      horsePayers.filter(function (payer) {
        return payer.horseId === horseId;
      }),
    );
  }

  function getAvailablePayersForHorse(horseId) {
    var defaultPayers = getDefaultHorsePayers(horseId);
    return uniqByPersonId(defaultPayers.concat(managedPayers));
  }

  useEffect(
    function () {
      if (!selectedHorseToAdd || !selectedHorseToAdd.horseId) {
        return;
      }

      setSelectedHorseBookings(function (prev) {
        var exists = prev.some(function (booking) {
          return booking.horse.horseId === selectedHorseToAdd.horseId;
        });

        if (exists) {
          return prev;
        }

        return prev.concat([
          {
            horse: selectedHorseToAdd,
            payers: getDefaultHorsePayers(selectedHorseToAdd.horseId),
          },
        ]);
      });

      setSelectedHorseToAdd(null);
    },
    [selectedHorseToAdd],
  );

  function handleRemoveHorseBooking(horseId) {
    setSelectedHorseBookings(function (prev) {
      return prev.filter(function (booking) {
        return booking.horse.horseId !== horseId;
      });
    });

    setExpandedHorseEditorId(function (prev) {
      return prev === horseId ? null : prev;
    });
  }

  function toggleHorsePayerSelection(horseId, payerItem) {
    if (!horseId || !payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedHorseBookings(function (prev) {
      return prev.map(function (booking) {
        if (booking.horse.horseId !== horseId) {
          return booking;
        }

        var exists = booking.payers.some(function (payer) {
          return payer.paidByPersonId === payerItem.paidByPersonId;
        });

        var updatedPayers = exists
          ? booking.payers.filter(function (payer) {
              return payer.paidByPersonId !== payerItem.paidByPersonId;
            })
          : uniqByPersonId(booking.payers.concat([payerItem]));

        return {
          ...booking,
          payers: updatedPayers,
        };
      });
    });
  }

  function toggleHorseEditor(horseId) {
    setExpandedHorseEditorId(function (prev) {
      return prev === horseId ? null : horseId;
    });
  }

  var allSelectedHorsePayers = useMemo(
    function () {
      var merged = [];

      selectedHorseBookings.forEach(function (booking) {
        booking.payers.forEach(function (payer) {
          merged.push(payer);
        });
      });

      return uniqByPersonId(merged);
    },
    [selectedHorseBookings],
  );

  function toggleTackPayerSelection(payerItem) {
    if (!payerItem || !payerItem.paidByPersonId) {
      return;
    }

    setSelectedTackPayers(function (prev) {
      var exists = prev.some(function (item) {
        return item.paidByPersonId === payerItem.paidByPersonId;
      });

      if (exists) {
        return prev.filter(function (item) {
          return item.paidByPersonId !== payerItem.paidByPersonId;
        });
      }

      return uniqByPersonId(prev.concat([payerItem]));
    });
  }

  var derivedTackDates = useMemo(
    function () {
      return {
        startDate: checkInDate,
        endDate: checkOutDate,
      };
    },
    [checkInDate, checkOutDate],
  );

  function validateHorseBookingsForm() {
    if (!selectedHorseStallType || !selectedHorseStallType.priceCatalogId) {
      return "יש לבחור סוג תא";
    }

    if (!selectedHorseBookings.length) {
      return "יש להוסיף לפחות סוס אחד";
    }

    if (!checkInDate || !checkOutDate) {
      return "יש לבחור תאריכי כניסה ויציאה";
    }

    var hasHorseWithoutPayers = selectedHorseBookings.some(function (booking) {
      return !booking.payers || booking.payers.length === 0;
    });

    if (hasHorseWithoutPayers) {
      return "יש לבחור לפחות משלם אחד לכל סוס";
    }

    if (!user || !user.personId) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    return "";
  }

  async function handleCreateHorseStallBookings() {
    var validationMessage = validateHorseBookingsForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return;
    }

    try {
      setIsSaving(true);

      var requests = selectedHorseBookings.map(function (booking) {
        return createStallBooking({
          competitionId: competitionId,
          orderedBySystemUserId: user.personId,
          catalogItemId: selectedHorseStallType.priceCatalogId,
          notes: notes ? notes.trim() : null,
          ranchId: activeRole.ranchId,
          horseId: booking.horse.horseId,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          isForTack: false,
          payers: booking.payers.map(function (payer) {
            return {
              payerPersonId: payer.paidByPersonId,
            };
          }),
        });
      });

      await Promise.all(requests);

      Alert.alert("נשמר", "תאי הסוסים הוזמנו בהצלחה");
      setMode("tack");
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה בשמירת הזמנת התאים"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenTackMode() {
    if (!selectedHorseBookings.length) {
      Alert.alert("שגיאה", "יש להוסיף לפחות סוס אחד לפני מעבר לתאי Tack");
      return;
    }

    setMode("tack");
  }

  function handleBackToHorseMode() {
    setMode("horse");
  }

  function handleSubmitTackDraft() {
    Alert.alert(
      "עדיין לא מחובר",
      "טופס תא Tack מוכן בצד לקוח, אבל כדי לשמור אותו צריך להשלים תמיכה מתאימה בשרת.",
    );
  }

  return {
    mode,

    horseStallTypeOptions,
    tackStallTypeOptions,

    selectedHorseToAdd,
    setSelectedHorseToAdd,
    selectedHorseStallType,
    setSelectedHorseStallType,

    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    notes,
    setNotes,

    selectedHorseBookings,
    availableHorseOptions,
    getAvailablePayersForHorse,
    handleRemoveHorseBooking,
    toggleHorsePayerSelection,
    expandedHorseEditorId,
    toggleHorseEditor,

    allSelectedHorsePayers,
    selectedTackStallType,
    setSelectedTackStallType,
    tackQuantity,
    setTackQuantity,
    tackSplitMode,
    setTackSplitMode,
    selectedTackPayers,
    toggleTackPayerSelection,
    tackNotes,
    setTackNotes,
    derivedTackDates,

    loading,
    isSaving,
    screenError,

    handleCreateHorseStallBookings,
    handleOpenTackMode,
    handleBackToHorseMode,
    handleSubmitTackDraft,

    formatHorseLabel,
    formatPayerLabel,
    formatStallTypeLabel,
  };
}
