import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  getPaidTimeSlotRegistrations,
  transferPaidTimeRequestToSlot,
} from "../../../services/paidTimeRequestService";

// Secretary "click on slot" modal. Shows everyone registered for that slot
// (assigned + pending requests) and exposes per-row actions:
//   - Unassign (clears slot, status back to Pending)
//   - Transfer (move to a different slot via a dropdown of competition slots)
//
// Props:
//   isOpen           : bool
//   slotInCompId     : id of the clicked slot
//   ranchId          : current host ranch
//   slotMeta         : { slotDate, startTime, endTime, arenaName } for header
//   allSlotsInComp   : [{ paidTimeSlotInCompId, slotDate, startTime, arenaName }]
//                      used for the "transfer to" dropdown
//   onClose          : close handler
//   onChanged        : called after a successful transfer/unassign so the
//                      page can reload its schedule grid
export default function PaidTimeSlotRegistrationsModal(props) {
  var isOpen = !!props.isOpen;
  var slotInCompId = props.slotInCompId;
  var ranchId = props.ranchId;
  var slotMeta = props.slotMeta || {};
  var allSlots = Array.isArray(props.allSlotsInComp) ? props.allSlotsInComp : [];

  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [actionBusyId, setActionBusyId] = useState(null);
  var [transferTargets, setTransferTargets] = useState({});

  useEffect(
    function () {
      if (!isOpen || !slotInCompId) return;
      load();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, slotInCompId],
  );

  function load() {
    setLoading(true);
    setError("");
    getPaidTimeSlotRegistrations(slotInCompId, ranchId)
      .then(function (res) {
        setItems(Array.isArray(res.data) ? res.data : []);
      })
      .catch(function (err) {
        setError(String(err?.response?.data || err?.message || "שגיאה בטעינה"));
        setItems([]);
      })
      .finally(function () {
        setLoading(false);
      });
  }

  async function handleUnassign(item) {
    try {
      setActionBusyId(item.paidTimeRequestId);
      await transferPaidTimeRequestToSlot({
        paidTimeRequestId: item.paidTimeRequestId,
        ranchId: ranchId,
        newSlotInCompId: null,
      });
      await load();
      if (props.onChanged) props.onChanged();
    } catch (err) {
      alert(String(err?.response?.data || err?.message || "שגיאה בביטול שיבוץ"));
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleTransfer(item) {
    var target = transferTargets[item.paidTimeRequestId];
    if (!target) {
      alert("בחר סלוט יעד");
      return;
    }

    try {
      setActionBusyId(item.paidTimeRequestId);
      await transferPaidTimeRequestToSlot({
        paidTimeRequestId: item.paidTimeRequestId,
        ranchId: ranchId,
        newSlotInCompId: Number(target),
      });
      await load();
      if (props.onChanged) props.onChanged();
    } catch (err) {
      alert(String(err?.response?.data || err?.message || "שגיאה בהעברה"));
    } finally {
      setActionBusyId(null);
    }
  }

  function setTargetFor(requestId, value) {
    setTransferTargets(function (prev) {
      var next = Object.assign({}, prev);
      next[requestId] = value;
      return next;
    });
  }

  function formatTime(value) {
    if (!value) return "";
    return String(value).substring(0, 5);
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("he-IL");
    } catch {
      return String(value);
    }
  }

  if (!isOpen) return null;

  var assignedRows = items.filter(function (it) {
    return it.isAssignedToThisSlot;
  });
  var pendingRows = items.filter(function (it) {
    return !it.isAssignedToThisSlot && it.isRequestedForThisSlot;
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#3F312B]">סלוט פייד טיים</h2>
            <p className="text-xs text-[#8D6E63]">
              {formatDate(slotMeta.slotDate)} · {formatTime(slotMeta.startTime)}-
              {formatTime(slotMeta.endTime)}
              {slotMeta.arenaName ? " · " + slotMeta.arenaName : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-1.5 text-[#6B574F] hover:bg-[#FAF5F1]"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[#8D6E63]">טוען...</div>
        ) : null}

        {error ? (
          <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-5 text-right">
            <SectionList
              title="שובצו לסלוט זה"
              rows={assignedRows}
              emptyMessage="עדיין אין שיבוצים"
              renderActions={function (item) {
                return (
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      type="button"
                      onClick={function () {
                        handleUnassign(item);
                      }}
                      disabled={actionBusyId === item.paidTimeRequestId}
                      className="rounded-lg border border-[#E7BABA] bg-white px-3 py-1 text-xs font-bold text-[#A54848] hover:bg-[#F9E5E5] disabled:opacity-50"
                    >
                      בטל שיבוץ
                    </button>

                    <div className="flex items-center gap-1">
                      <select
                        value={transferTargets[item.paidTimeRequestId] || ""}
                        onChange={function (e) {
                          setTargetFor(item.paidTimeRequestId, e.target.value);
                        }}
                        className="rounded-lg border border-[#E2D5CE] bg-white px-2 py-1 text-xs"
                      >
                        <option value="">העבר ל...</option>
                        {allSlots
                          .filter(function (s) {
                            return s.paidTimeSlotInCompId !== slotInCompId;
                          })
                          .map(function (s) {
                            return (
                              <option
                                key={s.paidTimeSlotInCompId}
                                value={s.paidTimeSlotInCompId}
                              >
                                {formatDate(s.slotDate)}{" "}
                                {formatTime(s.startTime)}
                                {s.arenaName ? " · " + s.arenaName : ""}
                              </option>
                            );
                          })}
                      </select>
                      <button
                        type="button"
                        onClick={function () {
                          handleTransfer(item);
                        }}
                        disabled={actionBusyId === item.paidTimeRequestId}
                        className="rounded-lg bg-[#7B5A4D] px-2 py-1 text-xs font-bold text-white hover:bg-[#6B4D42] disabled:opacity-50"
                      >
                        העבר
                      </button>
                    </div>
                  </div>
                );
              }}
            />

            <SectionList
              title="ביקשו את הסלוט הזה (טרם שובצו)"
              rows={pendingRows}
              emptyMessage="אין בקשות ממתינות"
              renderActions={function (item) {
                return (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={function () {
                        // assign this pending request to current slot
                        setTargetFor(item.paidTimeRequestId, String(slotInCompId));
                        setTimeout(function () {
                          handleTransfer({
                            paidTimeRequestId: item.paidTimeRequestId,
                          });
                        }, 0);
                      }}
                      disabled={actionBusyId === item.paidTimeRequestId}
                      className="rounded-lg bg-[#7B5A4D] px-3 py-1 text-xs font-bold text-white hover:bg-[#6B4D42] disabled:opacity-50"
                    >
                      שבץ כאן
                    </button>
                  </div>
                );
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionList(props) {
  var rows = Array.isArray(props.rows) ? props.rows : [];

  return (
    <section className="rounded-2xl border border-[#EFE5DF] bg-[#FFFDFB] p-4">
      <h3 className="mb-2 text-sm font-black text-[#5D4037]">{props.title}</h3>

      {rows.length === 0 ? (
        <p className="text-xs text-[#8D6E63]">{props.emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {rows.map(function (item) {
            return (
              <div
                key={item.paidTimeRequestId}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#EFE5DF] bg-white p-3"
              >
                <div className="text-sm text-[#3F312B]">
                  <div className="font-bold">
                    {item.barnName || item.horseName || "סוס"}
                    <span className="text-xs font-normal text-[#8D6E63]">
                      {" "}· {item.riderName}
                      {item.coachName ? " · מאמן: " + item.coachName : ""}
                    </span>
                  </div>
                  <div className="text-xs text-[#8D6E63]">
                    משלם: {item.payerName}
                    {item.productName ? " · " + item.productName : ""}
                  </div>
                  {item.notes ? (
                    <div className="text-xs text-[#A1887F] italic">
                      {item.notes}
                    </div>
                  ) : null}
                </div>
                <div>{props.renderActions(item)}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
