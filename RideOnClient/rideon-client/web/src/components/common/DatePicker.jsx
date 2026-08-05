import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  HEBREW_MONTH_NAMES,
  HEBREW_WEEKDAY_LABELS,
  parseDateOnly,
  formatDateOnly,
  getLocalToday,
  compareDateOnly,
  isDateWithinRange,
  shiftMonth,
  buildMonthCells,
} from "./DatePicker.utils";

// Shared RTL date-only picker (CAP-10). Replaces every native
// `<input type="date">` in the web app with one calendar dropdown so the
// popup can be styled -- native date-input chrome is OS/browser rendered and
// can't be restyled. Contract mirrors CustomDropdown.jsx: onChange fires
// with a native-like `{ target: { value } }` event so every existing call
// site (`onChange={(e) => ...e.target.value...}`) keeps working unchanged.
export default function DatePicker(props) {
  var value = props.value || "";
  var parsedValue = parseDateOnly(value);
  var today = getLocalToday();
  var minParts = parseDateOnly(props.min);
  var maxParts = parseDateOnly(props.max);

  var [isOpen, setIsOpen] = useState(false);
  var [viewYear, setViewYear] = useState((parsedValue || today).year);
  var [viewMonth, setViewMonth] = useState((parsedValue || today).month);
  var [popupPosition, setPopupPosition] = useState(null);

  var wrapperRef = useRef(null);
  var popupRef = useRef(null);

  useEffect(
    function () {
      if (!isOpen) {
        return;
      }

      var base = parsedValue || today;
      setViewYear(base.year);
      setViewMonth(base.month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [isOpen],
  );

  useLayoutEffect(
    function () {
      if (!isOpen) {
        return undefined;
      }

      function updatePosition() {
        if (!wrapperRef.current) {
          return;
        }

        var rect = wrapperRef.current.getBoundingClientRect();

        setPopupPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return function () {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    },
    [isOpen],
  );

  useEffect(
    function () {
      if (!isOpen) {
        return undefined;
      }

      function handleDocumentMouseDown(event) {
        if (wrapperRef.current && wrapperRef.current.contains(event.target)) {
          return;
        }

        if (popupRef.current && popupRef.current.contains(event.target)) {
          return;
        }

        setIsOpen(false);
      }

      function handleKeyDown(event) {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }

      document.addEventListener("mousedown", handleDocumentMouseDown);
      document.addEventListener("keydown", handleKeyDown);

      return function () {
        document.removeEventListener("mousedown", handleDocumentMouseDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    },
    [isOpen],
  );

  function emit(nextValue) {
    if (props.onChange) {
      props.onChange({ target: { value: nextValue } });
    }
  }

  function isDayDisabled(parts) {
    return !isDateWithinRange(parts, minParts, maxParts);
  }

  function handleTriggerClick() {
    if (props.disabled || props.readOnly) {
      return;
    }

    setIsOpen(function (prev) {
      return !prev;
    });
  }

  function handleSelectDay(parts) {
    if (isDayDisabled(parts)) {
      return;
    }

    emit(formatDateOnly(parts));
    setIsOpen(false);
  }

  function handleClear() {
    emit("");
    setIsOpen(false);
  }

  function handleToday() {
    if (isDayDisabled(today)) {
      return;
    }

    emit(formatDateOnly(today));
    setIsOpen(false);
  }

  function handlePrevMonth() {
    var next = shiftMonth(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function handleNextMonth() {
    var next = shiftMonth(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  var cells = buildMonthCells(viewYear, viewMonth);
  var canOpen = !props.disabled && !props.readOnly;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        id={props.id}
        name={props.name}
        disabled={props.disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={props["aria-label"] || "בחירת תאריך"}
        aria-describedby={props["aria-describedby"]}
        aria-required={props.required || undefined}
        onClick={handleTriggerClick}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        style={props.style}
        className={props.className}
      >
        {parsedValue ? (
          formatDateOnly(parsedValue)
        ) : (
          <span className="text-[#BCAAA4]">
            {props.placeholder || "בחרי תאריך"}
          </span>
        )}
      </button>

      {isOpen && canOpen && popupPosition
        ? createPortal(
            <div
              ref={popupRef}
              dir="rtl"
              role="dialog"
              aria-label="לוח שנה"
              style={{
                position: "fixed",
                top: popupPosition.top,
                left: popupPosition.left,
                minWidth: popupPosition.width,
                zIndex: 1000,
              }}
              className="w-64 rounded-xl border border-[#D7CCC8] bg-white p-3 shadow-lg"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="חודש קודם"
                  onClick={handlePrevMonth}
                  className="rounded-lg p-1.5 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8]"
                >
                  <ChevronRight size={18} />
                </button>

                <div className="text-sm font-semibold text-[#4E342E]">
                  {HEBREW_MONTH_NAMES[viewMonth - 1]} {viewYear}
                </div>

                <button
                  type="button"
                  aria-label="חודש הבא"
                  onClick={handleNextMonth}
                  className="rounded-lg p-1.5 text-[#6D4C41] transition-colors hover:bg-[#F5EDE8]"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 text-center text-xs text-[#8D6E63]">
                {HEBREW_WEEKDAY_LABELS.map(function (label, index) {
                  return <div key={index}>{label}</div>;
                })}
              </div>

              <div className="grid grid-cols-7 gap-y-1">
                {cells.map(function (day, index) {
                  if (day === null) {
                    return <div key={index} />;
                  }

                  var parts = { year: viewYear, month: viewMonth, day: day };
                  var isSelected =
                    !!parsedValue && compareDateOnly(parts, parsedValue) === 0;
                  var isToday = compareDateOnly(parts, today) === 0;
                  var disabledDay = isDayDisabled(parts);

                  var dayClassName =
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ";

                  if (disabledDay) {
                    dayClassName += "cursor-not-allowed text-[#D7CCC8]";
                  } else if (isSelected) {
                    dayClassName += "bg-[#8B6352] font-semibold text-white";
                  } else if (isToday) {
                    dayClassName += "border border-[#8B6352] text-[#4E342E]";
                  } else {
                    dayClassName += "text-[#3F312B] hover:bg-[#F5EDE8]";
                  }

                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={disabledDay}
                      aria-label={formatDateOnly(parts)}
                      aria-pressed={isSelected}
                      onClick={function () {
                        handleSelectDay(parts);
                      }}
                      className={dayClassName}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[#F0E6E0] pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-[#8B6352] hover:underline"
                >
                  ניקוי
                </button>

                <button
                  type="button"
                  onClick={handleToday}
                  className="text-xs font-semibold text-[#8B6352] hover:underline"
                >
                  היום
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
