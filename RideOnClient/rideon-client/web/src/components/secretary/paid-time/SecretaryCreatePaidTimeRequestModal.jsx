// HostSecretary Paid-Time creation (Slice B). Lets the secretary create a
// paid-time request on behalf of ANY participating ranch's horse/rider/
// coach/payer, not just her own -- there was previously no HostSecretary-
// facing create flow at all (only assign/unassign/transfer of already-
// existing requests). Candidates are entry-derived tuples (one dropdown
// picks horse+rider+coach+payer together, mirroring the existing mobile
// candidate-based flow) so there is no separate horse/rider/coach/payer
// selection to get wrong. Price is fetched from the competition's HOST
// ranch (ranch-model convention, matching the Shavings fix) -- pricing
// always belongs to the host ranch regardless of which ranch the
// candidate's horse comes from.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  getPaidTimeCandidatesForCompetition,
  createPaidTimeRequest,
} from "../../../services/paidTimeRequestService";
import { getServicePricesDashboard } from "../../../services/servicePricesService";
import { getErrorMessage } from "../../../utils/competitionForm.utils";

const PAID_TIME_CATEGORY_ID = 1;

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

function normalizeCandidate(item) {
  return {
    entryId: readKey(item, "entryId", "EntryId", null),
    horseId: readKey(item, "horseId", "HorseId", null),
    horseName: readKey(item, "horseName", "HorseName", "") || "",
    barnName: readKey(item, "barnName", "BarnName", "") || "",
    ranchId: readKey(item, "ranchId", "RanchId", null),
    ranchName: readKey(item, "ranchName", "RanchName", "") || "",
    coachFederationMemberId: readKey(
      item,
      "coachFederationMemberId",
      "CoachFederationMemberId",
      null,
    ),
    coachName: readKey(item, "coachName", "CoachName", "") || "",
    riderFederationMemberId: readKey(
      item,
      "riderFederationMemberId",
      "RiderFederationMemberId",
      null,
    ),
    riderName: readKey(item, "riderName", "RiderName", "") || "",
    paidByPersonId: readKey(item, "paidByPersonId", "PaidByPersonId", null),
    payerName: readKey(item, "payerName", "PayerName", "") || "",
  };
}

function candidateKey(candidate) {
  return [
    candidate.horseId,
    candidate.coachFederationMemberId,
    candidate.riderFederationMemberId,
    candidate.paidByPersonId,
  ].join("-");
}

function dedupeCandidates(list) {
  const seen = new Set();
  const result = [];

  list.forEach(function (candidate) {
    const key = candidateKey(candidate);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(candidate);
  });

  return result;
}

// Pull the active paid-time prices out of the host-ranch-scoped dashboard.
function extractPaidTimePrices(dashboardData) {
  const sections = Array.isArray(dashboardData)
    ? dashboardData
    : Array.isArray(dashboardData?.sections)
      ? dashboardData.sections
      : Array.isArray(dashboardData?.categories)
        ? dashboardData.categories
        : [];

  const result = [];

  sections.forEach(function (section) {
    const categoryId = Number(readKey(section, "categoryId", "CategoryId", -1));

    if (categoryId !== PAID_TIME_CATEGORY_ID) {
      return;
    }

    const items = Array.isArray(section?.items)
      ? section.items
      : Array.isArray(section?.products)
        ? section.products
        : [];

    items.forEach(function (item) {
      const priceCatalogId = readKey(item, "priceCatalogId", "PriceCatalogId", null);
      const isActive = readKey(item, "isActive", "IsActive", false);

      if (isActive && priceCatalogId) {
        result.push({
          priceCatalogId: priceCatalogId,
          productName: readKey(item, "productName", "ProductName", "") || "",
          itemPrice: Number(readKey(item, "itemPrice", "ItemPrice", 0)),
        });
      }
    });
  });

  return result;
}

function getSlotId(slot) {
  return readKey(slot, "paidTimeSlotInCompId", "PaidTimeSlotInCompId", null);
}

function getSlotDate(slot) {
  return readKey(slot, "slotDate", "SlotDate", "");
}

function getSlotStartTime(slot) {
  return readKey(slot, "startTime", "StartTime", "");
}

function getSlotEndTime(slot) {
  return readKey(slot, "endTime", "EndTime", "");
}

function getSlotArenaName(slot) {
  return readKey(slot, "arenaName", "ArenaName", "") || "";
}

export default function SecretaryCreatePaidTimeRequestModal(props) {
  const competitionId = props.competitionId;
  const hostRanchId = props.hostRanchId;
  const slots = Array.isArray(props.slots) ? props.slots : [];

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState("");

  const [priceItems, setPriceItems] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState("");

  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      setSelectedCandidateKey("");
      setSelectedPriceId("");
      setSelectedSlotId("");
      setNotes("");
      setError("");
    },
    [props.isOpen],
  );

  useEffect(
    function () {
      if (!props.isOpen || !competitionId || !hostRanchId) {
        setCandidates([]);
        setPriceItems([]);
        return;
      }

      let cancelled = false;

      setLoadingCandidates(true);
      getPaidTimeCandidatesForCompetition(competitionId, hostRanchId)
        .then(function (res) {
          if (cancelled) {
            return;
          }

          const list = dedupeCandidates(
            (Array.isArray(res.data) ? res.data : []).map(normalizeCandidate),
          );

          setCandidates(list);
        })
        .catch(function () {
          if (!cancelled) {
            setCandidates([]);
          }
        })
        .finally(function () {
          if (!cancelled) {
            setLoadingCandidates(false);
          }
        });

      setLoadingPrices(true);
      getServicePricesDashboard(hostRanchId)
        .then(function (res) {
          if (cancelled) {
            return;
          }

          const prices = extractPaidTimePrices(res.data);
          setPriceItems(prices);

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
    [props.isOpen, competitionId, hostRanchId],
  );

  const selectedCandidate = useMemo(
    function () {
      return candidates.find(function (c) {
        return candidateKey(c) === selectedCandidateKey;
      });
    },
    [candidates, selectedCandidateKey],
  );

  function validate() {
    if (!selectedCandidateKey || !selectedCandidate) {
      return "יש לבחור סוס/רוכב/מאמן/משלם";
    }

    if (!selectedPriceId) {
      return "לא נמצא מחיר פעיל לפייד-טיים";
    }

    if (!selectedSlotId) {
      return "יש לבחור סלוט";
    }

    return "";
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
        // Requesting/home ranch derived from the selected candidate's own
        // horse -- NOT hostRanchId. usp_InsertPaidTimeRequest validates
        // this equals horse.ranchid and prices against the competition's
        // host ranch independently.
        ranchId: Number(selectedCandidate.ranchId),
        horseId: Number(selectedCandidate.horseId),
        riderFederationMemberId: Number(selectedCandidate.riderFederationMemberId),
        coachFederationMemberId: Number(selectedCandidate.coachFederationMemberId),
        paidByPersonId: Number(selectedCandidate.paidByPersonId),
        priceCatalogId: Number(selectedPriceId),
        requestedCompSlotId: Number(selectedSlotId),
        notes: notes ? notes.trim() : null,
      };

      await createPaidTimeRequest(payload);

      if (props.onCreated) {
        await props.onCreated();
      }
    } catch (err) {
      setError(getErrorMessage(err, "אירעה שגיאה ביצירת בקשת פייד-טיים"));
    } finally {
      setSaving(false);
    }
  }

  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-xl font-black text-[#3F312B]">
            הוספת בקשת פייד-טיים
          </h2>
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

          {/* Candidate (horse + rider + coach + payer, required) */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              סוס / רוכב / מאמן / משלם
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            {loadingCandidates ? (
              <p className="text-sm text-[#8A7268]">טוען מועמדים...</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-[#C62828]">
                לא נמצאו סוסים רשומים למקצים בתחרות זו
              </p>
            ) : (
              <select
                value={selectedCandidateKey}
                onChange={function (e) {
                  setSelectedCandidateKey(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E3D7D0] bg-white px-4 py-2.5 text-right text-sm text-[#3F312B]"
              >
                <option value="">בחרי סוס</option>
                {candidates.map(function (candidate) {
                  const key = candidateKey(candidate);
                  return (
                    <option key={key} value={key}>
                      {candidate.horseName +
                        (candidate.barnName ? " (" + candidate.barnName + ")" : "") +
                        " · " +
                        candidate.riderName +
                        " · " +
                        candidate.ranchName}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              מחיר פייד-טיים
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            {loadingPrices ? (
              <p className="text-sm text-[#8A7268]">טוען מחירים...</p>
            ) : priceItems.length === 0 ? (
              <p className="text-sm text-[#C62828]">לא נמצא מחיר פעיל לפייד-טיים</p>
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

          {/* Slot */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[#5D4037]">
              סלוט
              <span className="text-red-500 mr-0.5">*</span>
            </label>
            {slots.length === 0 ? (
              <p className="text-sm text-[#C62828]">
                לא נמצאו סלוטי פייד-טיים לתחרות זו
              </p>
            ) : (
              <select
                value={selectedSlotId}
                onChange={function (e) {
                  setSelectedSlotId(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E3D7D0] bg-white px-4 py-2.5 text-right text-sm text-[#3F312B]"
              >
                <option value="">בחרי סלוט</option>
                {slots.map(function (slot) {
                  const slotId = getSlotId(slot);
                  return (
                    <option key={slotId} value={slotId}>
                      {getSlotDate(slot) +
                        " · " +
                        String(getSlotStartTime(slot)).substring(0, 5) +
                        "–" +
                        String(getSlotEndTime(slot)).substring(0, 5) +
                        (getSlotArenaName(slot) ? " · " + getSlotArenaName(slot) : "")}
                    </option>
                  );
                })}
              </select>
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
            {saving ? "שומר..." : "שמור בקשה"}
          </button>
        </div>
      </div>
    </div>
  );
}
