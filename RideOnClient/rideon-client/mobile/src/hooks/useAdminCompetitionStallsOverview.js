import { useCallback, useEffect, useMemo, useState } from "react";

import { getStallBookingsForCompetitionAndRanch } from "../services/stallBookingsService";

import {
  getShavingsOrdersForCompetitionAndRanch,
  getAllShavingsOrderDetailsForCompetitionAndRanch,
} from "../services/shavingsOrderService";

function normalizeBooking(item) {
  if (!item) {
    return null;
  }

  return {
    stallBookingId: item.stallBookingId || item.StallBookingId || null,

    horseName: item.horseName || item.HorseName || "",

    isTackBooking:
      item.isTackBooking ||
      item.IsTackBooking ||
      item.isForTack ||
      item.IsForTack ||
      false,

    startDate: item.startDate || item.StartDate || "",

    endDate: item.endDate || item.EndDate || "",

    totalAmount: Number(item.totalAmount || item.TotalAmount || 0) || 0,

    isPaid: item.isPaid || item.IsPaid || false,
  };
}

function normalizeShavingsOrder(item) {
  if (!item) {
    return null;
  }

  return {
    shavingsOrderId: item.shavingsOrderId || item.ShavingsOrderId || null,

    deliveryStatus: item.deliveryStatus || item.DeliveryStatus || "",

    bagQuantity: item.bagQuantity || item.BagQuantity || 0,
  };
}

function normalizeShavingsDetail(item) {
  if (!item) {
    return null;
  }

  return {
    shavingsOrderId: item.shavingsOrderId || item.ShavingsOrderId || null,

    stallBookingId: item.stallBookingId || item.StallBookingId || null,

    bagQuantityPerStall:
      item.bagQuantityPerStall || item.BagQuantityPerStall || 0,
  };
}

export default function useAdminCompetitionStallsOverview(params) {
  var competitionId = params.competitionId;

  var activeRole = params.activeRole;

  var [loading, setLoading] = useState(false);

  var [screenError, setScreenError] = useState("");

  var [stallBookings, setStallBookings] = useState([]);

  var [shavingsOrders, setShavingsOrders] = useState([]);

  var [shavingsDetails, setShavingsDetails] = useState([]);

  var loadData = useCallback(
    async function () {
      if (!competitionId || !activeRole?.ranchId) {
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

          getShavingsOrdersForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),

          getAllShavingsOrderDetailsForCompetitionAndRanch(
            competitionId,
            activeRole.ranchId,
          ),
        ]);

        setStallBookings(
          (Array.isArray(results[0]?.data) ? results[0].data : [])
            .map(normalizeBooking)
            .filter(Boolean),
        );

        setShavingsOrders(
          (Array.isArray(results[1]?.data) ? results[1].data : [])
            .map(normalizeShavingsOrder)
            .filter(Boolean),
        );

        setShavingsDetails(
          (Array.isArray(results[2]?.data) ? results[2].data : [])
            .map(normalizeShavingsDetail)
            .filter(Boolean),
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

      var safeOrders = Array.isArray(shavingsOrders) ? shavingsOrders : [];

      var safeDetails = Array.isArray(shavingsDetails) ? shavingsDetails : [];

      return safeBookings.map(function (booking) {
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

            return {
              ...order,

              bagQuantityPerStall: detail.bagQuantityPerStall,
            };
          })
          .filter(Boolean);

        return {
          ...booking,

          shavingsOrders: relatedOrders,
        };
      });
    },
    [stallBookings, shavingsOrders, shavingsDetails],
  );

  return {
    loading,
    screenError,

    cards,

    reload: loadData,
  };
}
