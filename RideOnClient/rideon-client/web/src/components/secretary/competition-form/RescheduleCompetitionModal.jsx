import { useState } from "react";

// Postponing a competition is a separate, explicit action from the ordinary
// date-field edit above it on this page — it moves classes, paid time, stall
// bookings and undelivered shavings deliveries as one atomic server-side
// operation, not just the two competition-level date fields. It must never
// be triggered implicitly by editing competitionStartDate/competitionEndDate.
//
// Forward-only by design: the offset input rejects zero, negative and
// non-integer values client-side (the server is authoritative and re-checks
// this and everything else — see usp_RescheduleCompetition).
//
// props.competitionStartDate/competitionEndDate MUST be the persisted
// (server-confirmed) dates — CompetitionFormPage passes
// persistedCompetitionStartDate/persistedCompetitionEndDate from
// useCompetitionDetailsStep, never detailsForm's own fields, so the preview
// anchor can never be an unsaved edit.

function parseIsoDate(value) {
  if (!value) {
    return null;
  }

  var parts = String(value).split("-");

  if (parts.length !== 3) {
    return null;
  }

  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  if (!date) {
    return null;
  }

  var result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatHebrewDate(date) {
  if (!date) {
    return "-";
  }

  var day = String(date.getUTCDate()).padStart(2, "0");
  var month = String(date.getUTCMonth() + 1).padStart(2, "0");
  var year = date.getUTCFullYear();

  return day + "/" + month + "/" + year;
}

function parsePositiveIntegerOffset(rawValue) {
  var trimmed = String(rawValue || "").trim();

  if (!/^[0-9]+$/.test(trimmed)) {
    return null;
  }

  var parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export default function RescheduleCompetitionModal(props) {
  var [offsetDaysInput, setOffsetDaysInput] = useState("");

  if (!props.isOpen) {
    return null;
  }

  var offsetDays = parsePositiveIntegerOffset(offsetDaysInput);
  var oldStart = parseIsoDate(props.competitionStartDate);
  var oldEnd = parseIsoDate(props.competitionEndDate);
  var newStart = offsetDays && oldStart ? addDays(oldStart, offsetDays) : null;
  var newEnd = offsetDays && oldEnd ? addDays(oldEnd, offsetDays) : null;

  var canConfirm = !!offsetDays && !props.saving;

  function handleConfirm() {
    if (!canConfirm) {
      return;
    }

    props.onConfirm(offsetDays);
  }

  function handleClose() {
    if (props.saving) {
      return;
    }

    setOffsetDaysInput("");
    props.onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-[#E6DCD5] shadow-lg p-6">
        <h3 className="text-xl font-bold text-[#3F312B] text-center">
          דחיית התחרות
        </h3>

        <p className="mt-3 text-center text-sm text-[#6E5A52] leading-6">
          פעולה זו דוחה את מועד התחרות קדימה במספר ימים קבוע. כל המקצים,
          זמני הפייד־טיים, הזמנות התאים ומשלוחי הנסורת שטרם סופקו יידחו יחד
          עם התחרות. תשלומים, מועדי הרשמה ורשומות היסטוריות לא ישתנו.
        </p>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-[#6D4C41]">
            מספר ימי דחייה
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={offsetDaysInput}
            disabled={props.saving}
            onChange={function (e) {
              setOffsetDaysInput(e.target.value);
            }}
            className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white px-4 text-right disabled:opacity-60"
            placeholder="לדוגמה: 7"
          />

          {offsetDaysInput && !offsetDays ? (
            <div className="mt-1.5 text-right text-xs text-red-600">
              יש להזין מספר שלם וחיובי של ימים
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] p-4 text-sm">
          <div>
            <p className="text-xs font-bold text-[#8A7268]">תאריכים נוכחיים</p>
            <p className="mt-1 font-black text-[#3F312B]">
              {formatHebrewDate(oldStart)} - {formatHebrewDate(oldEnd)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-[#8A7268]">תאריכים חדשים</p>
            <p className="mt-1 font-black text-[#7B5A4D]">
              {newStart && newEnd
                ? formatHebrewDate(newStart) + " - " + formatHebrewDate(newEnd)
                : "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={props.saving}
            className="px-5 py-2.5 rounded-2xl border border-[#D8CBC3] text-[#5D4037] bg-white hover:bg-[#F8F5F2] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-5 py-2.5 rounded-2xl bg-[#8B6352] text-white hover:bg-[#7A5547] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.saving ? "דוחה..." : "אישור דחיית התחרות"}
          </button>
        </div>
      </div>
    </div>
  );
}
