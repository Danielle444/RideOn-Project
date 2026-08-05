import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getCompetitionInvitationDetails } from "../services/competitionService";
import {
  createShavingsOrder,
  getShavingsOrdersForCompetitionAndRanch,
  getStallBookingsForShavings,
} from "../services/shavingsOrderService";

function normalizeDateString(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  return text.length >= 10 ? text.slice(0, 10) : text;
}

function normalizeAvailableStall(item) {
  if (!item) {
    return null;
  }

  return {
    stallBookingId:
      item.stallBookingId ??
      item.StallBookingId ??
      item.stallbookingid ??
      item.Stallbookingid ??
      item.stall_booking_id ??
      null,
    horseId: item.horseId ?? item.HorseId ?? item.horseid ?? null,
    horseName: item.horseName ?? item.HorseName ?? item.horsename ?? "",
    startDate: normalizeDateString(
      item.startDate ?? item.startDate ?? item.startDate ?? item.startdate,
    ),
    endDate: normalizeDateString(
      item.endDate ?? item.endDate ?? item.endDate ?? item.enddate,
    ),
    compoundId: item.compoundId ?? item.compoundId ?? item.compoundid ?? null,
    stallId: item.stallId ?? item.StallId ?? item.stallid ?? null,
    payerNames: item.payerNames ?? item.PayerNames ?? item.payernames ?? "",
  };
}

function normalizeShavingsOrder(item) {
  if (!item) {
    return null;
  }

  return {
    shavingsOrderId:
      item.shavingsOrderId ?? item.ShavingsOrderId ?? item.shavingsorderid,
    requestedDeliveryTime:
      item.requestedDeliveryTime ??
      item.RequestedDeliveryTime ??
      item.requesteddeliverytime ??
      null,
    bagQuantity: item.bagQuantity ?? item.BagQuantity ?? item.bagquantity ?? 0,
    deliveryStatus:
      item.deliveryStatus ?? item.DeliveryStatus ?? item.deliverystatus ?? "",
    notes: item.notes ?? item.Notes ?? "",
  };
}

function normalizePriceCatalogItem(item, categoryName) {
  if (!item) {
    return null;
  }

  return {
    priceCatalogId: item.priceCatalogId ?? item.PriceCatalogId ?? null,
    productName: item.productName ?? item.ProductName ?? "",
    itemPrice: Number(item.itemPrice ?? item.ItemPrice ?? 0),
    categoryName: categoryName || "",
  };
}

function extractShavingsPriceItems(invitationResponse) {
  var sections = Array.isArray(invitationResponse?.data?.servicePriceSections)
    ? invitationResponse.data.servicePriceSections
    : [];

  var result = [];

  sections.forEach(function (section) {
    var categoryName = String(section?.categoryName || "").trim();
    var items = Array.isArray(section?.items) ? section.items : [];

    items.forEach(function (item) {
      var normalized = normalizePriceCatalogItem(item, categoryName);

      if (!normalized) {
        return;
      }

      var productName = String(normalized.productName || "");
      var lowerProductName = productName.toLowerCase();
      var lowerCategoryName = categoryName.toLowerCase();

      if (
        productName.includes("נסורת") ||
        categoryName.includes("נסורת") ||
        lowerProductName.includes("shavings") ||
        lowerCategoryName.includes("shavings")
      ) {
        result.push(normalized);
      }
    });
  });

  return result;
}

function parseDateOnlyString(dateString) {
  if (!dateString) {
    return null;
  }

  var parts = String(dateString).split("-");

  if (parts.length !== 3) {
    return null;
  }

  var year = Number(parts[0]);
  var month = Number(parts[1]) - 1;
  var day = Number(parts[2]);

  var date = new Date(year, month, day);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateOnlyString(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function addDaysToDateString(dateString, days) {
  var date = parseDateOnlyString(dateString);

  if (!date) {
    return "";
  }

  date.setDate(date.getDate() + days);

  return formatDateOnlyString(date);
}

function formatNowForInput() {
  var now = new Date();
  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, "0");
  var day = String(now.getDate()).padStart(2, "0");
  var hours = String(now.getHours()).padStart(2, "0");
  var minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    date: year + "-" + month + "-" + day,
    time: hours + ":" + minutes,
  };
}

export default function useAdminCompetitionShavings(params) {
  var user = params.user;
  var activeRole = params.activeRole;
  var competitionId = params.competitionId;
  var isActiveTab = params.isActiveTab;

  var [loading, setLoading] = useState(false);
  var [screenError, setScreenError] = useState("");
  var [isSaving, setIsSaving] = useState(false);

  var [availableStalls, setAvailableStalls] = useState([]);
  var [existingOrders, setExistingOrders] = useState([]);
  var [priceCatalogItems, setPriceCatalogItems] = useState([]);
  var [selectedPriceCatalog, setSelectedPriceCatalog] = useState(null);

  var [deliveryMode, setDeliveryMode] = useState("now");
  var [deliveryDate, setDeliveryDate] = useState("");
  var [deliveryTime, setDeliveryTime] = useState("");
  var [quantityMode, setQuantityMode] = useState("equal");
  var [equalBagQuantity, setEqualBagQuantity] = useState("");
  var [selectedStalls, setSelectedStalls] = useState([]);
  var [appliedInitialStallId, setAppliedInitialStallId] = useState(null);
  var [notes, setNotes] = useState("");

  var loadData = useCallback(
    async function () {
      if (!competitionId || !activeRole || !activeRole.ranchId) {
        return;
      }

      try {
        setLoading(true);
        setScreenError("");

        var results = await Promise.all([
          getCompetitionInvitationDetails(
            competitionId,
            activeRole.roleId,
            activeRole.ranchId,
          ),
          getStallBookingsForShavings(competitionId, activeRole.ranchId),
          getShavingsOrdersForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),
        ]);

        var invitationResponse = results[0];
        var stallsResponse = results[1];
        var ordersResponse = results[2];

        var shavingsPrices = extractShavingsPriceItems(invitationResponse);

        setPriceCatalogItems(shavingsPrices);

        setSelectedPriceCatalog(function (prev) {
          if (prev) {
            return prev;
          }

          if (shavingsPrices.length === 1) {
            return shavingsPrices[0];
          }

          return null;
        });

        setAvailableStalls(
          (Array.isArray(stallsResponse?.data) ? stallsResponse.data : [])
            .map(function (item) {
              return normalizeAvailableStall(item);
            })
            .filter(Boolean),
        );

        setExistingOrders(
          (Array.isArray(ordersResponse?.data) ? ordersResponse.data : [])
            .map(function (item) {
              return normalizeShavingsOrder(item);
            })
            .filter(Boolean),
        );
      } catch (error) {
        setScreenError(
          String(error?.response?.data || "אירעה שגיאה בטעינת נתוני הנסורת"),
        );
      } finally {
        setLoading(false);
      }
    },
    [competitionId, activeRole],
  );

  useEffect(
    function () {
      if (isActiveTab) {
        loadData();
      }
    },
    [isActiveTab, loadData],
  );

  useFocusEffect(
    useCallback(
      function () {
        if (isActiveTab) {
          loadData();
        }
      },
      [isActiveTab, loadData],
    ),
  );

  useEffect(
    function () {
      if (!isActiveTab) {
        setAppliedInitialStallId(null);
        return;
      }

      if (!params.initialStallBookingId) {
        return;
      }

      if (appliedInitialStallId === params.initialStallBookingId) {
        return;
      }

      var matchedStall = availableStalls.find(function (stall) {
        return (
          Number(stall.stallBookingId) === Number(params.initialStallBookingId)
        );
      });

      if (!matchedStall) {
        return;
      }

      setSelectedStalls([
        {
          stallBookingId: matchedStall.stallBookingId,
          horseName: matchedStall.horseName,
          payerNames: matchedStall.payerNames,
          startDate: matchedStall.startDate,
          bagQuantity: "",
        },
      ]);

      setQuantityMode("equal");
      setAppliedInitialStallId(params.initialStallBookingId);
    },
    [
      isActiveTab,
      params.initialStallBookingId,
      availableStalls,
      appliedInitialStallId,
    ],
  );

  function toggleStallSelection(stall) {
    if (
      !stall ||
      stall.stallBookingId === null ||
      stall.stallBookingId === undefined
    ) {
      Alert.alert("שגיאה", "לא נמצא מזהה תא תקין לסוס שנבחר");
      return;
    }

    setSelectedStalls(function (prev) {
      var exists = prev.some(function (item) {
        return item.stallBookingId === stall.stallBookingId;
      });

      if (exists) {
        return prev.filter(function (item) {
          return item.stallBookingId !== stall.stallBookingId;
        });
      }

      return prev.concat([
        {
          stallBookingId: stall.stallBookingId,
          horseName: stall.horseName,
          payerNames: stall.payerNames,
          startDate: stall.startDate,
          bagQuantity: "",
        },
      ]);
    });
  }

  function setStallBagQuantity(stallBookingId, value) {
    setSelectedStalls(function (prev) {
      return prev.map(function (item) {
        if (item.stallBookingId !== stallBookingId) {
          return item;
        }

        return {
          ...item,
          bagQuantity: value,
        };
      });
    });
  }

  var selectedStallIds = useMemo(
    function () {
      return selectedStalls.map(function (item) {
        return item.stallBookingId;
      });
    },
    [selectedStalls],
  );

  function getBagsForStall(stallBookingId) {
    var item = selectedStalls.find(function (stall) {
      return stall.stallBookingId === stallBookingId;
    });

    if (!item) {
      return 0;
    }

    if (quantityMode === "equal") {
      return Number(equalBagQuantity || 0);
    }

    return Number(item.bagQuantity || 0);
  }

  function getStallPrice(stallBookingId) {
    return (
      getBagsForStall(stallBookingId) *
      Number(selectedPriceCatalog?.itemPrice || 0)
    );
  }

  var totalBags = useMemo(
    function () {
      if (quantityMode === "equal") {
        return selectedStalls.length * Number(equalBagQuantity || 0);
      }

      return selectedStalls.reduce(function (sum, item) {
        return sum + Number(item.bagQuantity || 0);
      }, 0);
    },
    [quantityMode, selectedStalls, equalBagQuantity],
  );

  var totalPrice = useMemo(
    function () {
      return totalBags * Number(selectedPriceCatalog?.itemPrice || 0);
    },
    [totalBags, selectedPriceCatalog],
  );

  // CAP-7: "אספקה כעת" זמינה רק אם לפחות תא נבחר כבר בטווח שלו (תאריך
  // הכניסה שלו פחות יום) - העוגן הוא התא עם תאריך הכניסה המוקדם ביותר
  // מבין הנבחרים, כי הוא זה שנכנס לטווח ראשון.
  var earliestDeliveryDate = useMemo(
    function () {
      var startDates = selectedStalls
        .map(function (item) {
          return item.startDate;
        })
        .filter(Boolean)
        .sort();

      if (startDates.length === 0) {
        return "";
      }

      return addDaysToDateString(startDates[0], -1);
    },
    [selectedStalls],
  );

  var isNowDeliveryAvailable = useMemo(
    function () {
      if (!earliestDeliveryDate) {
        return true;
      }

      return formatDateOnlyString(new Date()) >= earliestDeliveryDate;
    },
    [earliestDeliveryDate],
  );

  function getRequestedDeliveryTime() {
    if (deliveryMode === "now") {
      var nowValue = formatNowForInput();
      return nowValue.date + "T" + nowValue.time + ":00";
    }

    return deliveryDate + "T" + deliveryTime + ":00";
  }

  function validateForm() {
    if (!selectedPriceCatalog || !selectedPriceCatalog.priceCatalogId) {
      return "לא נמצא מחיר פעיל לנסורת";
    }

    if (!selectedStalls.length) {
      return "יש לבחור לפחות סוס אחד";
    }

    if (deliveryMode === "later" && (!deliveryDate || !deliveryTime)) {
      return "יש לבחור תאריך ושעה לאספקה";
    }

    if (deliveryMode === "now" && !isNowDeliveryAvailable) {
      return "אספקה כעת אינה זמינה עבור התאים שנבחרו";
    }

    if (quantityMode === "equal") {
      if (
        !Number(equalBagQuantity || 0) ||
        Number(equalBagQuantity || 0) <= 0
      ) {
        return "יש להזין כמות שקים תקינה לכל סוס";
      }
    } else {
      var invalid = selectedStalls.some(function (item) {
        return (
          !Number(item.bagQuantity || 0) || Number(item.bagQuantity || 0) <= 0
        );
      });

      if (invalid) {
        return "יש להזין כמות שקים תקינה לכל סוס שנבחר";
      }
    }

    if (!user || !user.personId) {
      return "לא נמצאו פרטי משתמש מחובר";
    }

    if (!activeRole || !activeRole.ranchId) {
      return "לא נמצאה חווה פעילה";
    }

    return "";
  }

  async function handleCreateShavingsOrder() {
    var validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("שגיאה", validationMessage);
      return false;
    }

    try {
      setIsSaving(true);

      var payload = {
        competitionId: competitionId,
        orderedBySystemUserId: user.personId,
        priceCatalogId: selectedPriceCatalog.priceCatalogId,
        // Ranch-model fix: the server derives the requesting ranch from the
        // selected stallBookingIds themselves and the host ranch from
        // competitionId -- it never trusts a client-supplied ranchId for
        // this endpoint, so it is intentionally not sent. The stall picker
        // above is already scoped to activeRole.ranchId (one requesting
        // ranch at a time), so a mixed-ranch selection cannot occur through
        // this screen; server-side validation remains authoritative.
        notes: notes ? notes.trim() : null,
        requestedDeliveryTime: getRequestedDeliveryTime(),
        stalls: selectedStalls.map(function (item) {
          return {
            stallBookingId: item.stallBookingId,
            bagQuantity:
              quantityMode === "equal"
                ? Number(equalBagQuantity)
                : Number(item.bagQuantity),
          };
        }),
      };

      await createShavingsOrder(payload);
      await loadData();

      Alert.alert("נשמר", "הזמנת הנסורת נשלחה בהצלחה");

      setSelectedStalls([]);
      setEqualBagQuantity("");
      setNotes("");
      setQuantityMode("equal");
      setDeliveryMode("now");
      setDeliveryDate("");
      setDeliveryTime("");

      return true;
    } catch (error) {
      Alert.alert(
        "שגיאה",
        String(error?.response?.data || "אירעה שגיאה ביצירת הזמנת הנסורת"),
      );

      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function formatStallLabel(stall) {
    if (!stall) {
      return "";
    }

    var parts = [stall.horseName];

    if (stall.compoundId || stall.stallId) {
      parts.push(
        "תא " + (stall.compoundId || "-") + "/" + (stall.stallId || "-"),
      );
    }

    return parts.filter(Boolean).join(" • ");
  }

  function formatPriceCatalogLabel(item) {
    if (!item) {
      return "";
    }

    return item.productName + " • " + item.itemPrice + " ₪";
  }

  return {
    loading: loading,
    screenError: screenError,
    isSaving: isSaving,

    availableStalls: availableStalls,
    existingOrders: existingOrders,
    priceCatalogItems: priceCatalogItems,
    selectedPriceCatalog: selectedPriceCatalog,
    setSelectedPriceCatalog: setSelectedPriceCatalog,

    deliveryMode: deliveryMode,
    setDeliveryMode: setDeliveryMode,
    deliveryDate: deliveryDate,
    setDeliveryDate: setDeliveryDate,
    deliveryTime: deliveryTime,
    setDeliveryTime: setDeliveryTime,
    earliestDeliveryDate: earliestDeliveryDate,
    isNowDeliveryAvailable: isNowDeliveryAvailable,

    quantityMode: quantityMode,
    setQuantityMode: setQuantityMode,
    equalBagQuantity: equalBagQuantity,
    setEqualBagQuantity: setEqualBagQuantity,

    selectedStalls: selectedStalls,
    selectedStallIds: selectedStallIds,
    toggleStallSelection: toggleStallSelection,
    setStallBagQuantity: setStallBagQuantity,

    notes: notes,
    setNotes: setNotes,

    totalBags: totalBags,
    totalPrice: totalPrice,
    getBagsForStall: getBagsForStall,
    getStallPrice: getStallPrice,

    handleCreateShavingsOrder: handleCreateShavingsOrder,
    formatStallLabel: formatStallLabel,
    formatPriceCatalogLabel: formatPriceCatalogLabel,
  };
}
