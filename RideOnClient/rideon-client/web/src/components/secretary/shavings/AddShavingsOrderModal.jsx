// Add-order form with mandatory Ranch — Spec 2 (CAP-5, add-order-form.md).
//
// Mirrors the mobile admin add-order FLOW/field semantics (not the RN components). The web delta
// is a REQUIRED Ranch dropdown that scopes three coupled reads: the stall picker
// (getStallBookingsForShavings), the price (getServicePricesDashboard → נסורת section), and the
// create auth/write. Changing ranch resets stalls + price. Backend already authorizes HostSecretary.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  getStallBookingsForShavings,
  createShavingsOrder,
} from "../../../services/shavingsOrderService";
import { getServicePricesDashboard } from "../../../services/servicePricesService";
import { getErrorMessage } from "../../../utils/competitionForm.utils";

function readKey(item, camel, pascal, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camel] !== null && item[camel] !== undefined) {
    return item[camel];
  }

  if (item[pascal] !== null && item[pascal] !== undefined) {
    return item[pascal];
  }

  return fallback;
}

function normalizeStall(item) {
  return {
    stallBookingId: readKey(item, "stallBookingId", "StallBookingId", null),
    horseName: readKey(item, "horseName", "HorseName", "") || "",
    compoundId: readKey(item, "compoundId", "CompoundId", null),
    stallId: readKey(item, "stallId", "StallId", null),
    payerNames: readKey(item, "payerNames", "PayerNames", "") || "",
  };
}

// Pull the active shavings prices out of the ranch-scoped dashboard (נסורת section).
function extractShavingsPrices(dashboardData) {
  const sections = Array.isArray(dashboardData)
    ? dashboardData
    : Array.isArray(dashboardData?.sections)
      ? dashboardData.sections
      : Array.isArray(dashboardData?.categories)
        ? dashboardData.categories
        : [];

  const result = [];

  sections.forEach(function (section) {
    const categoryName = String(
      readKey(section, "categoryName", "CategoryName", ""),
    );
    const items = Array.isArray(section?.items)
      ? section.items
      : Array.isArray(section?.products)
        ? section.products
        : [];

    items.forEach(function (item) {
      const productName = String(readKey(item, "productName", "ProductName", ""));
      const isShavings =
        productName.includes("נסורת") ||
        categoryName.includes("נסורת") ||
        productName.toLowerCase().includes("shavings") ||
        categoryName.toLowerCase().includes("shavings");

      const priceCatalogId = readKey(item, "priceCatalogId", "PriceCatalogId", null);
      const isActive = readKey(item, "isActive", "IsActive", false);

      if (isShavings && isActive && priceCatalogId) {
        result.push({
          priceCatalogId: priceCatalogId,
          productName: productName,
          itemPrice: Number(readKey(item, "itemPrice", "ItemPrice", 0)),
        });
      }
    });
  });

  return result;
}

function formatNow() {
  const now = new Date();
  const pad = function (n) {
    return String(n).padStart(2, "0");
  };

  return {
    date:
      now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()),
    time: pad(now.getHours()) + ":" + pad(now.getMinutes()),
  };
}

export default function AddShavingsOrderModal(props) {
  const competitionId = props.competitionId;
  const ranchOptions = Array.isArray(props.ranchOptions) ? props.ranchOptions : [];

  const [ranchId, setRanchId] = useState("");
  const [stalls, setStalls] = useState([]);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [priceItems, setPriceItems] = useState([]);
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [deliveryMode, setDeliveryMode] = useState("now");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  const [quantityMode, setQuantityMode] = useState("equal");
  const [equalBagQuantity, setEqualBagQuantity] = useState("");
  const [selectedStalls, setSelectedStalls] = useState([]);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset all form state whenever the modal is (re)opened.
  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      setRanchId("");
      setStalls([]);
      setPriceItems([]);
      setSelectedPriceId("");
      setDeliveryMode("now");
      setDeliveryDate("");
      setDeliveryTime("");
      setQuantityMode("equal");
      setEqualBagQuantity("");
      setSelectedStalls([]);
      setNotes("");
      setError("");
    },
    [props.isOpen],
  );

  // Ranch change → refetch + reset stalls and price (the #32 coupling).
  useEffect(
    function () {
      if (!props.isOpen || !ranchId || !competitionId) {
        setStalls([]);
        setPriceItems([]);
        setSelectedPriceId("");
        setSelectedStalls([]);
        return;
      }

      let cancelled = false;

      setSelectedStalls([]);
      setSelectedPriceId("");

      setLoadingStalls(true);
      getStallBookingsForShavings(competitionId, ranchId)
        .then(function (res) {
          if (cancelled) {
            return;
          }

          const list = (Array.isArray(res.data) ? res.data : [])
            .map(normalizeStall)
            .filter(function (s) {
              return s.stallBookingId !== null;
            });

          setStalls(list);
        })
        .catch(function () {
          if (!cancelled) {
            setStalls([]);
          }
        })
        .finally(function () {
          if (!cancelled) {
            setLoadingStalls(false);
          }
        });

      setLoadingPrices(true);
      getServicePricesDashboard(ranchId)
        .then(function (res) {
          if (cancelled) {
            return;
          }

          const prices = extractShavingsPrices(res.data);
          setPriceItems(prices);

          // Auto-select when exactly one active shavings price exists (mirrors mobile).
          if (prices.length === 1) {
            setSelectedPriceId(String(prices[0].priceCatalogId));
          }
        })
        .catch(function () {
          if (!cancelled) {
            setPriceItems([]);
          }
        })
        .finally(function () {
          if (!cancelled) {
            setLoadingPrices(false);
          }
        });

      return function () {
        cancelled = true;
      };
    },
    [props.isOpen, ranchId, competitionId],
  );

  const selectedPrice = useMemo(
    function () {
      return priceItems.find(function (p) {
        return String(p.priceCatalogId) === String(selectedPriceId);
      });
    },
    [priceItems, selectedPriceId],
  );

  function toggleStall(stall) {
    setSelectedStalls(function (prev) {
      const exists = prev.some(function (s) {
        return s.stallBookingId === stall.stallBookingId;
      });

      if (exists) {
        return prev.filter(function (s) {
          return s.stallBookingId !== stall.stallBookingId;
        });
      }

      return prev.concat([
        {
          stallBookingId: stall.stallBookingId,
          horseName: stall.horseName,
          bagQuantity: "",
        },
      ]);
    });
  }

  function setStallBags(stallBookingId, value) {
    setSelectedStalls(function (prev) {
      return prev.map(function (s) {
        return s.stallBookingId === stallBookingId
          ? { ...s, bagQuantity: value }
          : s;
      });
    });
  }

  const totalBags = useMemo(
    function () {
      if (quantityMode === "equal") {
        return selectedStalls.length * Number(equalBagQuantity || 0);
      }

      return selectedStalls.reduce(function (sum, s) {
        return sum + Number(s.bagQuantity || 0);
      }, 0);
    },
    [quantityMode, selectedStalls, equalBagQuantity],
  );

  const totalPrice = useMemo(
    function () {
      return totalBags * Number(selectedPrice?.itemPrice || 0);
    },
    [totalBags, selectedPrice],
  );

  function validate() {
    if (!ranchId) {
      return "יש לבחור חווה";
    }

    if (!selectedPriceId) {
      return "לא נמצא מחיר פעיל לנסורת";
    }

    if (selectedStalls.length === 0) {
      return "יש לבחור לפחות תא אחד";
    }

    if (deliveryMode === "later" && (!deliveryDate || !deliveryTime)) {
      return "יש לבחור תאריך ושעה לאספקה";
    }

    if (quantityMode === "equal") {
      if (Number(equalBagQuantity || 0) <= 0) {
        return "יש להזין כמות שקים תקינה";
      }
    } else {
      const invalid = selectedStalls.some(function (s) {
        return Number(s.bagQuantity || 0) <= 0;
      });

      if (invalid) {
        return "יש להזין כמות שקים תקינה לכל תא שנבחר";
      }
    }

    return "";
  }

  function buildRequestedDeliveryTime() {
    if (deliveryMode === "now") {
      const now = formatNow();
      return now.date + "T" + now.time + ":00";
    }

    return deliveryDate + "T" + deliveryTime + ":00";
  }

  async function handleSubmit() {
    const message = validate();

    if (message) {
      setError(message);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        competitionId: competitionId,
        priceCatalogId: Number(selectedPriceId),
        // Ranch-model fix: the server derives both the requesting ranch
        // (from the selected stalls' requestingranchid) and the host ranch
        // (from competitionId) itself -- it never trusts a client-supplied
        // ranchId for this endpoint, so it is intentionally not sent. The
        // ranchId state above is still needed to scope the stall picker and
        // price-catalog fetch, which remain per-ranch reads.
        notes: notes ? notes.trim() : null,
        requestedDeliveryTime: buildRequestedDeliveryTime(),
        stalls: selectedStalls.map(function (s) {
          return {
            stallBookingId: s.stallBookingId,
            bagQuantity:
              quantityMode === "equal"
                ? Number(equalBagQuantity)
                : Number(s.bagQuantity),
          };
        }),
      };

      await createShavingsOrder(payload);

      if (props.onCreated) {
        await props.onCreated();
      }
    } catch (err) {
      setError(getErrorMessage(err, "אירעה שגיאה ביצירת הזמנת הנסורת"));
    } finally {
      setSaving(false);
    }
  }

  if (!props.isOpen) {
    return null;
  }

  const selectedIds = selectedStalls.map(function (s) {
    return s.stallBookingId;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-xl font-black text-[#3F312B]">הוספת הזמנת נסורת</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Ranch (required) */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              חווה
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            <select
              value={ranchId}
              onChange={function (e) {
                setRanchId(e.target.value);
              }}
              className="w-full rounded-xl border border-[#E3D7D0] bg-white px-4 py-2.5 text-right text-sm text-[#3F312B]"
            >
              <option value="">בחרי חווה</option>
              {ranchOptions.map(function (option) {
                return (
                  <option key={option.ranchId} value={option.ranchId}>
                    {option.ranchName || "חווה " + option.ranchId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              מחיר נסורת
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            {loadingPrices ? (
              <p className="text-sm text-[#8A7268]">טוען מחירים...</p>
            ) : priceItems.length === 0 ? (
              <p className="text-sm text-[#C62828]">
                {ranchId ? "לא נמצא מחיר פעיל לנסורת" : "יש לבחור חווה תחילה"}
              </p>
            ) : (
              <select
                value={selectedPriceId}
                onChange={function (e) {
                  setSelectedPriceId(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E3D7D0] bg-white px-4 py-2.5 text-right text-sm text-[#3F312B]"
              >
                <option value="">בחרי מחיר</option>
                {priceItems.map(function (p) {
                  return (
                    <option key={p.priceCatalogId} value={p.priceCatalogId}>
                      {p.productName + " · ₪" + p.itemPrice}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Delivery mode */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              אספקה
            </label>
            <div className="inline-flex rounded-full border border-[#E3D7D0] bg-[#F7F1EC] p-1">
              {[
                { key: "now", label: "עכשיו" },
                { key: "later", label: "במועד מאוחר" },
              ].map(function (option) {
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={function () {
                      setDeliveryMode(option.key);
                    }}
                    className={
                      "rounded-full px-4 py-1.5 text-sm font-bold transition-colors " +
                      (deliveryMode === option.key
                        ? "bg-white text-[#3F312B] shadow-sm"
                        : "text-[#8A7268]")
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {deliveryMode === "later" ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={function (e) {
                    setDeliveryDate(e.target.value);
                  }}
                  className="rounded-xl border border-[#E3D7D0] px-4 py-2.5 text-sm text-[#3F312B]"
                />
                <input
                  type="time"
                  value={deliveryTime}
                  onChange={function (e) {
                    setDeliveryTime(e.target.value);
                  }}
                  className="rounded-xl border border-[#E3D7D0] px-4 py-2.5 text-sm text-[#3F312B]"
                />
              </div>
            ) : null}
          </div>

          {/* Bag quantity mode */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              כמות שקים
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            <div className="mb-3 inline-flex rounded-full border border-[#E3D7D0] bg-[#F7F1EC] p-1">
              {[
                { key: "equal", label: "כמות זהה לכל תא" },
                { key: "perStall", label: "כמות לכל תא" },
              ].map(function (option) {
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={function () {
                      setQuantityMode(option.key);
                    }}
                    className={
                      "rounded-full px-4 py-1.5 text-sm font-bold transition-colors " +
                      (quantityMode === option.key
                        ? "bg-white text-[#3F312B] shadow-sm"
                        : "text-[#8A7268]")
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            {quantityMode === "equal" ? (
              <input
                type="number"
                min="1"
                value={equalBagQuantity}
                onChange={function (e) {
                  setEqualBagQuantity(e.target.value);
                }}
                placeholder="שקים לכל תא"
                className="w-40 rounded-xl border border-[#E3D7D0] px-4 py-2.5 text-right text-sm text-[#3F312B]"
              />
            ) : null}
          </div>

          {/* Stalls */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              תאים
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            {loadingStalls ? (
              <p className="text-sm text-[#8A7268]">טוען תאים...</p>
            ) : !ranchId ? (
              <p className="text-sm text-[#8A7268]">יש לבחור חווה תחילה</p>
            ) : stalls.length === 0 ? (
              <p className="text-sm text-[#C62828]">אין תאים זמינים לחווה שנבחרה</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-[#E3D7D0] p-3">
                {stalls.map(function (stall) {
                  const isSelected =
                    selectedIds.indexOf(stall.stallBookingId) !== -1;
                  const selectedEntry = selectedStalls.find(function (s) {
                    return s.stallBookingId === stall.stallBookingId;
                  });

                  return (
                    <div
                      key={stall.stallBookingId}
                      className={
                        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 " +
                        (isSelected
                          ? "border-[#C8AD9E] bg-[#FCF8F5]"
                          : "border-[#EFE5DF] bg-white")
                      }
                    >
                      <label className="flex flex-1 items-center gap-2 text-sm text-[#3F312B]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={function () {
                            toggleStall(stall);
                          }}
                        />
                        <span className="font-bold">
                          {stall.horseName || "תא"}
                        </span>
                        {stall.compoundId || stall.stallId ? (
                          <span className="text-xs text-[#8A7268]">
                            {"תא " +
                              (stall.compoundId || "-") +
                              "/" +
                              (stall.stallId || "-")}
                          </span>
                        ) : null}
                      </label>

                      {isSelected && quantityMode === "perStall" ? (
                        <input
                          type="number"
                          min="1"
                          value={selectedEntry ? selectedEntry.bagQuantity : ""}
                          onChange={function (e) {
                            setStallBags(stall.stallBookingId, e.target.value);
                          }}
                          placeholder="שקים"
                          className="w-24 rounded-lg border border-[#E3D7D0] px-2 py-1 text-right text-sm"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              הערות
            </label>
            <textarea
              value={notes}
              onChange={function (e) {
                setNotes(e.target.value);
              }}
              rows={2}
              className="w-full rounded-xl border border-[#E3D7D0] px-4 py-2.5 text-right text-sm text-[#3F312B]"
            />
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between rounded-2xl bg-[#F7F1EC] px-4 py-3 text-sm">
            <span className="font-bold text-[#5D4037]">
              סה״כ שקים: {totalBags}
            </span>
            <span className="font-black text-[#7B5A4D]">
              סה״כ: ₪{Number(totalPrice || 0).toLocaleString("he-IL")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#EFE5DF] px-6 py-4">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-2xl border border-[#E2D5CE] bg-white px-5 py-2.5 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FAF5F1]"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-2xl bg-[#6D4C41] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5D4037] disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמור הזמנה"}
          </button>
        </div>
      </div>
    </div>
  );
}
