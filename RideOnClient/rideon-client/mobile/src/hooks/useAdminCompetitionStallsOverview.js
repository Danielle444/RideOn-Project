import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getStallBookingsForCompetitionAndRanch,
  getAllStallBookingPayersForCompetitionAndRanch,
} from "../services/stallBookingsService";

import {
  getShavingsOrdersForCompetitionAndRanch,
  getAllShavingsOrderDetailsForCompetitionAndRanch,
} from "../services/shavingsOrderService";

import {
  getAssignments,
  getAssignedStallPrices,
  getStallMapPublishStatus,
} from "../services/stallMapService";

function normalizeAssignedPrice(item) {
  if (!item) return null;
  return {
    assignmentId:
      item.assignmentId || item.AssignmentId || item.assignmentid || null,
    compoundId:
      item.compoundId || item.CompoundId || item.compoundid || null,
    stallId: item.stallId || item.StallId || item.stallid || null,
    horseId: item.horseId || item.HorseId || item.horseid || null,
    assignedPrice:
      Number(
        item.assignedPrice ||
          item.AssignedPrice ||
          item.assignedprice ||
          0,
      ) || 0,
    productName:
      item.productName || item.ProductName || item.productname || "",
  };
}

function normalizeStallAssignment(item) {
  if (!item) return null;

  return {
    assignmentId:
      item.assignmentId || item.AssignmentId || item.assignmentid || null,
    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,
    compoundId:
      item.compoundId || item.CompoundId || item.compoundid || null,
    stallId: item.stallId || item.StallId || item.stallid || null,
    stallNumber:
      item.stallNumber || item.StallNumber || item.stallnumber || "",
    horseId: item.horseId || item.HorseId || item.horseid || null,
    productName:
      item.productName || item.ProductName || item.productname || "",
    bookingRanchId:
      item.bookingRanchId ||
      item.BookingRanchId ||
      item.bookingranchid ||
      null,
    bookingRanchName:
      item.bookingRanchName ||
      item.BookingRanchName ||
      item.bookingranchname ||
      "",
  };
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    var normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
  }

  return false;
}

function normalizeDateString(value) {
  if (!value) {
    return "";
  }

  var text = String(value).trim();

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    return text.split("T")[0];
  }

  if (text.length >= 10) {
    return text.slice(0, 10);
  }

  return text;
}

function calculateNumberOfDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return 1;
  }

  try {
    var start = new Date(startDate);
    var end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 1;
    }

    var diff = end.getTime() - start.getTime();
    var days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return 1;
    }

    return days;
  } catch {
    return 1;
  }
}

function normalizeBooking(item) {
  if (!item) {
    return null;
  }

  var horseId = item.horseId || item.HorseId || item.horseid || null;

  var isForTack = normalizeBoolean(
    item.isForTack ?? item.IsForTack ?? item.isfortack,
  );

  return {
    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,

    horseId: horseId,

    horseName: item.horseName || item.HorseName || item.horsename || "",

    isForTack: isForTack,

    isTackBooking: isForTack === true || horseId === null,

    startDate: normalizeDateString(
      item.startDate || item.StartDate || item.startdate,
    ),

    endDate: normalizeDateString(item.endDate || item.EndDate || item.enddate),

    compoundId: item.compoundId || item.CompoundId || item.compoundid || null,

    stallId: item.stallId || item.StallId || item.stallid || null,

    priceCatalogId:
      Number(
        item.priceCatalogId || item.PriceCatalogId || item.pricecatalogid || 0,
      ) || null,

    itemPrice:
      Number(item.itemPrice || item.ItemPrice || item.itemprice || 0) || 0,

    notes: item.notes || item.Notes || "",

    isPaid: normalizeBoolean(item.isPaid ?? item.IsPaid ?? item.ispaid),

    isCancelled: normalizeBoolean(
      item.isCancelled ?? item.IsCancelled ?? item.iscancelled,
    ),

    hasApprovedChange: normalizeBoolean(
      item.hasApprovedChange ??
        item.HasApprovedChange ??
        item.hasapprovedchange,
    ),

    hasPendingChange: normalizeBoolean(
      item.hasPendingChange ?? item.HasPendingChange ?? item.haspendingchange,
    ),

    hasPendingCancellation: normalizeBoolean(
      item.hasPendingCancellation ??
        item.HasPendingCancellation ??
        item.haspendingcancellation,
    ),
  };
}

function normalizeStallBookingPayer(item) {
  if (!item) {
    return null;
  }

  return {
    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,

    billId: item.billId || item.BillId || item.billid || null,

    payerPersonId:
      item.payerPersonId ||
      item.PayerPersonId ||
      item.paidByPersonId ||
      item.PaidByPersonId ||
      item.payerpersonid ||
      null,

    payerFullName:
      item.payerFullName || item.PayerFullName || item.payerfullname || "",

    amountToPay:
      Number(item.amountToPay || item.AmountToPay || item.amounttopay || 0) ||
      0,

    dateClosed: item.dateClosed || item.DateClosed || item.dateclosed || null,
  };
}

function normalizeShavingsOrder(item) {
  if (!item) {
    return null;
  }

  return {
    shavingsOrderId:
      item.shavingsOrderId ||
      item.ShavingsOrderId ||
      item.shavingsorderid ||
      null,

    requestedDeliveryTime:
      item.requestedDeliveryTime ||
      item.RequestedDeliveryTime ||
      item.requesteddeliverytime ||
      null,

    bagQuantity:
      Number(item.bagQuantity || item.BagQuantity || item.bagquantity || 0) ||
      0,

    deliveryStatus:
      item.deliveryStatus || item.DeliveryStatus || item.deliverystatus || "",

    notes: item.notes || item.Notes || "",

    workerSystemUserId:
      item.workerSystemUserId ||
      item.WorkerSystemUserId ||
      item.workersystemuserid ||
      null,

    approvedByPersonId:
      item.approvedByPersonId ||
      item.ApprovedByPersonId ||
      item.approvedbypersonid ||
      null,

    approvedAt: item.approvedAt || item.ApprovedAt || item.approvedat || null,

    orderedByName:
      item.orderedByName || item.OrderedByName || item.orderedbyname || "",

    priceCatalogId:
      item.priceCatalogId || item.PriceCatalogId || item.pricecatalogid || null,

    itemPrice:
      Number(item.itemPrice || item.ItemPrice || item.itemprice || 0) || 0,

    totalAmount:
      Number(item.totalAmount || item.TotalAmount || item.totalamount || 0) ||
      0,
  };
}

function normalizeShavingsDetail(item) {
  if (!item) {
    return null;
  }

  return {
    shavingsOrderId:
      item.shavingsOrderId ||
      item.ShavingsOrderId ||
      item.shavingsorderid ||
      null,

    stallBookingId:
      item.stallBookingId || item.StallBookingId || item.stallbookingid || null,

    horseId: item.horseId || item.HorseId || item.horseid || null,

    horseName: item.horseName || item.HorseName || item.horsename || "",

    bagQuantityPerStall:
      Number(
        item.bagQuantityPerStall ||
          item.BagQuantityPerStall ||
          item.bagquantityperstall ||
          0,
      ) || 0,
  };
}

function getMainPayerName(payers) {
  if (!Array.isArray(payers) || payers.length === 0) {
    return "";
  }

  if (payers.length === 1) {
    return payers[0].payerFullName || "";
  }

  return payers
    .map(function (payer) {
      return payer.payerFullName;
    })
    .filter(Boolean)
    .join(", ");
}

export default function useAdminCompetitionStallsOverview(params) {
  var competitionId = params.competitionId;

  var activeRole = params.activeRole;

  var [loading, setLoading] = useState(false);

  var [screenError, setScreenError] = useState("");

  var [stallBookings, setStallBookings] = useState([]);

  var [stallBookingPayers, setStallBookingPayers] = useState([]);

  var [shavingsOrders, setShavingsOrders] = useState([]);

  var [shavingsDetails, setShavingsDetails] = useState([]);

  var [stallAssignments, setStallAssignments] = useState([]);

  var [assignedStallPrices, setAssignedStallPrices] = useState([]);

  var [stallMapPublished, setStallMapPublished] = useState(false);

  var loadData = useCallback(
    async function () {
      if (!competitionId || !activeRole || !activeRole.ranchId) {
        return;
      }

      try {
        setLoading(true);

        setScreenError("");

        var results = await Promise.all([
          getStallBookingsForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),

          getAllStallBookingPayersForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),

          getShavingsOrdersForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),

          getAllShavingsOrderDetailsForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),

          // assignments may fail (older server / SP missing) - swallow gracefully.
          getAssignments(competitionId, activeRole.ranchId).catch(function (err) {
            console.log("STALL ASSIGNMENTS LOAD WARN", err);
            return { data: [] };
          }),

          getAssignedStallPrices(competitionId, activeRole.ranchId).catch(
            function (err) {
              console.log("STALL ASSIGNED PRICES LOAD WARN", err);
              return { data: [] };
            },
          ),

          getStallMapPublishStatus(competitionId, activeRole.ranchId).catch(
            function (err) {
              console.log("STALL MAP PUBLISH STATUS WARN", err);
              return { data: null };
            },
          ),
        ]);

        setStallBookings(
          (Array.isArray(results[0]?.data) ? results[0].data : [])
            .map(normalizeBooking)
            .filter(Boolean),
        );

        setStallBookingPayers(
          (Array.isArray(results[1]?.data) ? results[1].data : [])
            .map(normalizeStallBookingPayer)
            .filter(Boolean),
        );

        setShavingsOrders(
          (Array.isArray(results[2]?.data) ? results[2].data : [])
            .map(normalizeShavingsOrder)
            .filter(Boolean),
        );

        setShavingsDetails(
          (Array.isArray(results[3]?.data) ? results[3].data : [])
            .map(normalizeShavingsDetail)
            .filter(Boolean),
        );

        setStallAssignments(
          (Array.isArray(results[4]?.data) ? results[4].data : [])
            .map(normalizeStallAssignment)
            .filter(Boolean),
        );

        setAssignedStallPrices(
          (Array.isArray(results[5]?.data) ? results[5].data : [])
            .map(normalizeAssignedPrice)
            .filter(Boolean),
        );

        var publishData = results[6]?.data;
        setStallMapPublished(
          !!(publishData &&
            (publishData.isPublished || publishData.IsPublished)),
        );
      } catch (error) {
        console.log("STALLS OVERVIEW ERROR", error);

        setScreenError(
          String(error?.response?.data || "אירעה שגיאה בטעינת התאים"),
        );
      } finally {
        setLoading(false);
      }
    },
    [competitionId, activeRole],
  );

  useEffect(
    function () {
      loadData();
    },
    [loadData],
  );

  var cards = useMemo(
    function () {
      var safeBookings = Array.isArray(stallBookings) ? stallBookings : [];

      var safePayers = Array.isArray(stallBookingPayers)
        ? stallBookingPayers
        : [];

      var safeOrders = Array.isArray(shavingsOrders) ? shavingsOrders : [];

      var safeDetails = Array.isArray(shavingsDetails) ? shavingsDetails : [];

      var safeAssignments = Array.isArray(stallAssignments)
        ? stallAssignments
        : [];

      var safePrices = Array.isArray(assignedStallPrices)
        ? assignedStallPrices
        : [];

      return safeBookings.map(function (booking) {
        var bookingPayers = safePayers.filter(function (payer) {
          return (
            Number(payer.stallBookingId) === Number(booking.stallBookingId)
          );
        });

        var assignment = safeAssignments.find(function (a) {
          return (
            Number(a.stallBookingId) === Number(booking.stallBookingId)
          );
        });

        var priceRow = assignment
          ? safePrices.find(function (p) {
              return (
                Number(p.compoundId) === Number(assignment.compoundId) &&
                Number(p.stallId) === Number(assignment.stallId) &&
                Number(p.horseId) === Number(assignment.horseId)
              );
            })
          : null;

        var relatedDetails = safeDetails.filter(function (detail) {
          return (
            Number(detail.stallBookingId) === Number(booking.stallBookingId)
          );
        });

        var relatedOrders = relatedDetails
          .map(function (detail) {
            var order = safeOrders.find(function (item) {
              return (
                Number(item.shavingsOrderId) === Number(detail.shavingsOrderId)
              );
            });

            if (!order) {
              return null;
            }

            var amountForThisStall =
              Number(detail.bagQuantityPerStall || 0) *
              Number(order.itemPrice || 0);

            return {
              ...order,

              bagQuantityPerStall: detail.bagQuantityPerStall,

              amountForThisStall: amountForThisStall,

              totalAmount: amountForThisStall,
            };
          })
          .filter(Boolean);

        var numberOfDays = calculateNumberOfDays(
          booking.startDate,
          booking.endDate,
        );

        // Prefer assigned-stall price (reflects actual stall type secretary assigned).
        // Falls back to booking price if no assignment or price endpoint failed.
        var effectivePerDayPrice = priceRow
          ? Number(priceRow.assignedPrice || 0)
          : Number(booking.itemPrice || 0);

        var stallAmount =
          Number(numberOfDays || 1) * effectivePerDayPrice;

        var shavingsTotalAmount = relatedOrders.reduce(function (sum, order) {
          return sum + Number(order.amountForThisStall || 0);
        }, 0);

        var totalCardAmount = stallAmount + shavingsTotalAmount;

        return {
          ...booking,

          numberOfDays: numberOfDays,

          stallAmount: stallAmount,

          payers: bookingPayers,

          payerName: getMainPayerName(bookingPayers),

          shavingsOrders: relatedOrders,

          shavingsTotalAmount: shavingsTotalAmount,

          totalAmount: totalCardAmount,

          // Assignment data (from stallassignment) - if present, secretary already assigned a specific stall.
          // Display layer should prefer these over the requested booking.compoundId/stallId.
          isAssigned: !!assignment,
          assignedCompoundId: assignment ? assignment.compoundId : null,
          assignedStallId: assignment ? assignment.stallId : null,
          assignedStallNumber: assignment ? assignment.stallNumber : null,
          assignedProductName: assignment
            ? assignment.productName ||
              (priceRow ? priceRow.productName : null)
            : null,
          // Assigned per-day price from stall.stalltype's current pricecatalog.
          assignedPricePerDay: priceRow
            ? Number(priceRow.assignedPrice || 0)
            : null,
          // Stall map is published at competition+hostRanch level (per Danielle's design).
          // Same flag for all cards in this competition.
          stallMapIsPublished: stallMapPublished,
        };
      });
    },
    [
      stallBookings,
      stallBookingPayers,
      shavingsOrders,
      shavingsDetails,
      stallAssignments,
      assignedStallPrices,
      stallMapPublished,
    ],
  );

  return {
    loading: loading,
    screenError: screenError,

    cards: cards,

    reload: loadData,
  };
}
