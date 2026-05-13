import { useCallback, useEffect, useMemo, useState } from "react";

import { getStallBookingsForCompetitionAndRanch } from "../services/stallBookingsService";

import { getShavingsOrdersForCompetitionAndRanch } from "../services/shavingsOrdersService";

import { getAllShavingsOrderDetailsForCompetitionAndRanch } from "../services/shavingsOrdersService";

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
          Array.isArray(results[0]?.data) ? results[0].data : [],
        );

        setShavingsOrders(
          Array.isArray(results[1]?.data) ? results[1].data : [],
        );

        setShavingsDetails(
          Array.isArray(results[2]?.data) ? results[2].data : [],
        );
      } catch (error) {
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
      return stallBookings.map(function (booking) {
        var relatedDetails = shavingsDetails.filter(function (detail) {
          return (
            Number(detail.stallBookingId) === Number(booking.stallBookingId)
          );
        });

        var relatedOrders = relatedDetails
          .map(function (detail) {
            var order = shavingsOrders.find(function (item) {
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
