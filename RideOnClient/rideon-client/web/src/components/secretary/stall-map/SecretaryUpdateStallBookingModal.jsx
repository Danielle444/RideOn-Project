import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getHorsesForStallBooking } from "../../../services/stallBookingsService";

function toInputDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

// Secretary edit modal for an existing stall booking. Updates dates, notes,
// horse, and tack flag. Posts via parent's onSubmit(stallBookingId, payload).
export default function SecretaryUpdateStallBookingModal(props) {
  var isOpen = !!props.isOpen;
  var booking = props.booking || null;
  var competitionId = props.competitionId;
  var ranchId = props.ranchId;

  var [horses, setHorses] = useState([]);
  var [loadingHorses, setLoadingHorses] = useState(false);

  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [notes, setNotes] = useState("");
  var [isForTack, setIsForTack] = useState(false);
  var [horseId, setHorseId] = useState("");

  var [error, setError] = useState("");
  var [saving, setSaving] = useState(false);

  useEffect(
    function () {
      if (!isOpen || !booking) return;

      setStartDate(toInputDate(booking.startDate));
      setEndDate(toInputDate(booking.endDate));
      setNotes(booking.notes || "");
      setIsForTack(!!booking.isForTack);
      setHorseId(booking.horseId ? String(booking.horseId) : "");
      setError("");

      setLoadingHorses(true);
      getHorsesForStallBooking(competitionId, ranchId)
        .then(function (res) {
          setHorses(Array.isArray(res.data) ? res.data : []);
        })
        .catch(function () {
          setHorses([]);
        })
        .finally(function () {
          setLoadingHorses(false);
        });
    },
    [isOpen, booking, competitionId, ranchId],
  );

  function validate() {
    if (!startDate || !endDate) return "יש לבחור תאריכי התחלה וסיום";
    if (new Date(endDate) < new Date(startDate))
      return "תאריך סיום חייב להיות אחרי תאריך התחלה";
    if (!isForTack && !horseId) return "יש לבחור סוס (או לסמן 'תא ציוד')";
    return "";
  }

  async function handleSubmit() {
    var msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await props.onSubmit(booking.stallBookingId, {
        newStartDate: startDate,
        newEndDate: endDate,
        notes: notes ? notes.trim() : null,
        isForTack: isForTack,
        horseId: isForTack ? null : Number(horseId),
      });

      props.onClose();
    } catch (err) {
      setError(String(err?.response?.data || err?.message || "שגיאה בעדכון תא"));
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen || !booking) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#3F312B]">עריכת תא</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-1.5 text-[#6B574F] hover:bg-[#FAF5F1]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-right">
          <label className="flex items-center justify-end gap-2 text-sm">
            <span>תא ציוד (ללא סוס)</span>
            <input
              type="checkbox"
              checked={isForTack}
              onChange={function (e) {
                setIsForTack(e.target.checked);
                if (e.target.checked) setHorseId("");
              }}
              className="h-4 w-4 accent-[#8B5E4C]"
            />
          </label>

          {!isForTack ? (
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                סוס
              </label>
              <select
                value={horseId}
                onChange={function (e) {
                  setHorseId(e.target.value);
                }}
                disabled={loadingHorses}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              >
                <option value="">
                  {loadingHorses ? "טוען סוסים..." : "בחר סוס"}
                </option>
                {horses.map(function (h) {
                  return (
                    <option key={h.horseId} value={h.horseId}>
                      {h.horseName}
                      {h.barnName ? " (" + h.barnName + ")" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                מתאריך
              </label>
              <input
                type="date"
                value={startDate}
                onChange={function (e) {
                  setStartDate(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#5D4037] mb-1">
                עד תאריך
              </label>
              <input
                type="date"
                value={endDate}
                onChange={function (e) {
                  setEndDate(e.target.value);
                }}
                className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#5D4037] mb-1">
              הערות
            </label>
            <textarea
              value={notes}
              onChange={function (e) {
                setNotes(e.target.value);
              }}
              rows={2}
              className="w-full rounded-xl border border-[#E2D5CE] bg-white px-3 py-2 text-right text-sm"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex justify-start gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-2xl bg-[#7B5A4D] px-5 py-2 text-sm font-black text-white hover:bg-[#6B4D42] disabled:opacity-60"
            >
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
            <button
              type="button"
              onClick={props.onClose}
              disabled={saving}
              className="rounded-2xl border border-[#E2D5CE] bg-white px-5 py-2 text-sm font-bold text-[#6B574F] hover:bg-[#FAF5F1]"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
