import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
import {
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
  isColumnVisible,
} from "../../../utils/classesView.utils";
import { SCHEDULE_COPY, PLANNED_VS_ACTUAL_COPY } from "./classesViewCopy";

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return "₪" + Number(value).toLocaleString("he-IL");
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).substring(0, 5);
}

function getClassId(item) {
  return item.classInCompId || item.ClassInCompId;
}

function getOrderInDay(item) {
  return item.orderInDay || item.OrderInDay;
}

function getClassName(item) {
  return item.className || item.ClassName || "-";
}

function getArenaName(item) {
  return item.arenaName || item.ArenaName || "-";
}

function getJudgesDisplay(item) {
  return item.judgesDisplay || item.JudgesDisplay || "-";
}

function getPatternNumber(item) {
  return item.patternNumber || item.PatternNumber;
}

function getPrizesDisplay(item) {
  return item.prizesDisplay || item.PrizesDisplay || "-";
}

function getOrganizerCost(item) {
  var value = item.organizerCost;

  if (value === null || value === undefined) {
    value = item.OrganizerCost;
  }

  return value || 0;
}

function getFederationCost(item) {
  var value = item.federationCost;

  if (value === null || value === undefined) {
    value = item.FederationCost;
  }

  return value || 0;
}

function getStartTime(item) {
  return item.startTime || item.StartTime;
}

function getTotalCost(item) {
  return (
    Number(getOrganizerCost(item) || 0) + Number(getFederationCost(item) || 0)
  );
}

function formatPredictionNumber(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Math.round(Number(value));
}

function getStatusClass(statusKey) {
  if (statusKey === "drawn") {
    return "bg-[#EEF8F0] text-[#2F6B3B]";
  }

  if (statusKey === "hasEntries") {
    return "bg-[#FFF4E5] text-[#9A5B00]";
  }

  return "bg-[#F4F0ED] text-[#7A655C]";
}

function getTierClass(tier) {
  if (tier === "red") {
    return "bg-[#FBE4E2] text-[#A23B32]";
  }

  if (tier === "orange") {
    return "bg-[#FCE7D6] text-[#9A5216]";
  }

  if (tier === "yellow") {
    return "bg-[#FDF3D0] text-[#8A6D1D]";
  }

  return "";
}

// The cell shows the times and nothing else. Every warning, caveat and offered correction
// that used to be crammed in here at text-[10px] now lives in ScheduleDayNotices above the
// table -- they are day-level facts, and a table cell is the wrong place to say 40 words.
function renderScheduleCell(cell) {
  if (!cell) {
    return <span className="text-[#8D6E63]">-</span>;
  }

  if (!cell.hasClockTime) {
    return <span className="text-[#4A3A34]">{cell.durationMinutes} דק׳</span>;
  }

  var tierClass = cell.isLastOfDay ? getTierClass(cell.tier) : "";

  // whitespace-nowrap keeps "HH:MM – HH:MM" on one line. Without it the predicted and live
  // columns wrapped differently from each other purely on available width, which read as a
  // meaningful difference between the two schedules when it was only layout.
  return (
    <span
      className={
        "inline-block w-fit whitespace-nowrap rounded px-2 py-0.5 font-semibold text-[#4A3A34] " +
        tierClass
      }
    >
      {cell.startTime}
      {" – "}
      {cell.finishTime}
      {cell.finishesAfterMidnight ? SCHEDULE_COPY.nextDaySuffix : ""}
    </span>
  );
}

// Actual against forecast, for one class. Renders nothing when the class has no prediction --
// same convention as the תחזית כניסות column beside it.
function renderPlannedVsActualCell(comparison) {
  if (!comparison) {
    return null;
  }

  var toneClass = comparison.isWithinBand
    ? "bg-[#EEF8F0] text-[#2F6B3B]"
    : "bg-[#FDF1EC] text-[#8A4A32]";

  var label = comparison.isWithinBand
    ? PLANNED_VS_ACTUAL_COPY.withinBand
    : comparison.isBelowBand
      ? PLANNED_VS_ACTUAL_COPY.belowBand
      : PLANNED_VS_ACTUAL_COPY.aboveBand;

  var difference = Math.round(comparison.difference);
  var sign = difference > 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-1">
      <span className={"w-fit rounded-full px-2 py-0.5 text-xs font-semibold " + toneClass}>
        {sign + difference}
      </span>
      <span className="text-xs text-[#8D6E63]">{label}</span>
    </div>
  );
}

var SCHEDULE_VIEW_MODES = [
  { key: "avg", label: "ממוצע" },
  { key: "min", label: "מינימום" },
  { key: "max", label: "מקסימום" },
];

export default function SecretaryClassesOverviewTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var [predictionViewMode, setPredictionViewMode] = useState("value");
  var activeView = props.activeView || CLASSES_VIEW_PLANNING;

  // A column shows when its view wants it AND its data exists. The schedule additionally
  // depends on the field having minutesPerEntry bounds configured at all.
  function showColumn(columnKey) {
    if (!isColumnVisible(columnKey, activeView)) {
      return false;
    }

    if (columnKey === "schedule") {
      return !!props.showScheduleColumns;
    }

    // Patterns (מסלול) are a reining concept. Every other field leaves patternNumber null,
    // so the column was a full column of dashes for cutting, extreme and all-around.
    if (columnKey === "pattern") {
      return !!props.isReiningField;
    }

    return true;
  }

  var showScheduleColumns = showColumn("schedule");

  // Counted rather than hardcoded: the old fixed 13/14/16 had to be hand-edited on every
  // column change, and a stale colSpan silently breaks the empty and loading rows.
  var VISIBLE_COLUMN_KEYS = [
    "schedule",
    "schedule",
    "orderInDay",
    "className",
    "status",
    "entries",
    "predictedEntries",
    "plannedVsActual",
    "pattern",
    "judges",
    "arena",
    "startTime",
    "organizerCost",
    "federationCost",
    "totalCost",
    "prizes",
    "actions",
  ];

  var columnCount = VISIBLE_COLUMN_KEYS.filter(showColumn).length;

  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">מקצים בתחרות</h2>
          <p className="text-xs text-[#8D6E63]">
            לחצי על שם מקצה לצפייה בכניסות שלו, או על המס׳ לצפייה בכל המקצים
            באותו מספר.
          </p>
        </div>
      </div>

      <DataTableShell>
        <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
          <tr>
            {showScheduleColumns ? (
              <th className="px-4 py-3">
                <div className="flex flex-col items-center gap-1">
                  <span>{SCHEDULE_COPY.planning.columnHeader}</span>
                  <div className="flex overflow-hidden rounded-full border border-[#E3D5CC] text-[10px]">
                    {SCHEDULE_VIEW_MODES.map(function (mode) {
                      return (
                        <button
                          key={mode.key}
                          type="button"
                          onClick={function () {
                            if (props.onScheduleViewModeChange) {
                              props.onScheduleViewModeChange(mode.key);
                            }
                          }}
                          className={
                            "px-2 py-0.5 transition-colors " +
                            (props.scheduleViewMode === mode.key
                              ? "bg-[#7B5A4D] text-white"
                              : "bg-transparent text-[#7B5A4D]")
                          }
                          title="הצגת לוח הזמנים לפי משך ממוצע / מינימלי / מקסימלי למקצה"
                        >
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </th>
            ) : null}

            {showScheduleColumns ? (
              <th className="px-4 py-3">{SCHEDULE_COPY.actuals.columnHeader}</th>
            ) : null}

            <th className="px-4 py-3">מס׳</th>
            <th className="px-4 py-3">שם מקצה</th>
            {showColumn("status") ? <th className="px-4 py-3">סטטוס</th> : null}
            {showColumn("entries") ? (
              <th className="px-4 py-3">כניסות בפועל</th>
            ) : null}
            {showColumn("plannedVsActual") ? (
              <th className="px-4 py-3">{PLANNED_VS_ACTUAL_COPY.columnHeader}</th>
            ) : null}
            {showColumn("predictedEntries") ? (
            <th className="px-4 py-3">
              <div className="flex flex-col items-center gap-1">
                <span>תחזית כניסות</span>
                <div className="flex overflow-hidden rounded-full border border-[#E3D5CC] text-[10px]">
                  <button
                    type="button"
                    onClick={function () {
                      setPredictionViewMode("value");
                    }}
                    className={
                      "px-2 py-0.5 transition-colors " +
                      (predictionViewMode === "value"
                        ? "bg-[#7B5A4D] text-white"
                        : "bg-transparent text-[#7B5A4D]")
                    }
                    title="הצגת התחזית כמספר בודד"
                  >
                    ממוצע
                  </button>
                  <button
                    type="button"
                    onClick={function () {
                      setPredictionViewMode("band");
                    }}
                    className={
                      "px-2 py-0.5 transition-colors " +
                      (predictionViewMode === "band"
                        ? "bg-[#7B5A4D] text-white"
                        : "bg-transparent text-[#7B5A4D]")
                    }
                    title="הצגת התחזית כטווח (מינימום–מקסימום)"
                  >
                    טווח
                  </button>
                </div>
              </div>
            </th>
            ) : null}
            {showColumn("pattern") ? <th className="px-4 py-3">מסלול</th> : null}
            {showColumn("judges") ? <th className="px-4 py-3">שופטים</th> : null}
            {showColumn("arena") ? <th className="px-4 py-3">מגרש</th> : null}
            {showColumn("startTime") ? <th className="px-4 py-3">שעה</th> : null}
            {showColumn("organizerCost") ? (
              <th className="px-4 py-3">עלות מארגן</th>
            ) : null}
            {showColumn("federationCost") ? (
              <th className="px-4 py-3">עלות התאחדות</th>
            ) : null}
            {showColumn("totalCost") ? (
              <th className="px-4 py-3">סה״כ מחיר</th>
            ) : null}
            {showColumn("prizes") ? <th className="px-4 py-3">פרסים</th> : null}
            <th className="px-4 py-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <DataTableLoadingState colSpan={columnCount} message="טוען מקצים..." />
          ) : null}

          {!props.loading && items.length === 0 ? (
            <DataTableEmptyState colSpan={columnCount} message="לא נמצאו מקצים להצגה" />
          ) : null}

          {!props.loading
            ? items.map(function (item) {
                var orderInDay = getOrderInDay(item);
                var classEntriesCount = props.getEntriesCountForClass(item);
                var groupEntriesCount = props.getEntriesCountForGroup(item);
                var status = props.getClassStatus
                  ? props.getClassStatus(item)
                  : { key: "empty", label: "אין כניסות" };

                var schedule = showScheduleColumns && props.getScheduleForClass
                  ? props.getScheduleForClass(item)
                  : null;

                return (
                  <tr
                    key={getClassId(item)}
                    className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                  >
                    {showScheduleColumns ? (
                      <td className="px-4 py-3">
                        {renderScheduleCell(schedule ? schedule.predicted : null)}
                      </td>
                    ) : null}

                    {showScheduleColumns ? (
                      <td className="px-4 py-3">
                        {renderScheduleCell(schedule ? schedule.live : null)}
                      </td>
                    ) : null}

                    <td className="px-4 py-3 font-bold">
                      <button
                        type="button"
                        onClick={function () {
                          props.onOpenGroupEntries(item);
                        }}
                        className="rounded-full px-3 py-1 font-bold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8]"
                        title="צפייה בכל הכניסות של אותו מספר מקצה ביום זה"
                      >
                        {orderInDay || "-"}
                      </button>
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        onClick={function () {
                          props.onOpenClassEntries(item);
                        }}
                        className="font-bold text-[#3F312B] underline-offset-4 transition-colors hover:text-[#8B6352] hover:underline"
                      >
                        {getClassName(item)}
                      </button>
                    </td>

                    {showColumn("status") ? (
                      <td className="px-4 py-3">
                        <span
                          className={
                            "rounded-full px-3 py-1 text-xs font-semibold " +
                            getStatusClass(status.key)
                          }
                        >
                          {status.label}
                        </span>
                      </td>
                    ) : null}

                    {showColumn("entries") ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#3F312B]">
                            {classEntriesCount}
                          </span>

                          <span className="text-xs text-[#8D6E63]">
                            {groupEntriesCount} במס׳ זה
                          </span>
                        </div>
                      </td>
                    ) : null}

                    {showColumn("plannedVsActual") ? (
                      <td className="px-4 py-3">
                        {renderPlannedVsActualCell(
                          props.getPlannedVsActualForClass
                            ? props.getPlannedVsActualForClass(item)
                            : null,
                        )}
                      </td>
                    ) : null}

                    {showColumn("predictedEntries") ? (
                    <td className="px-4 py-3">
                      {(function () {
                        var prediction = props.getPredictionForClass
                          ? props.getPredictionForClass(item)
                          : null;

                        if (!prediction) {
                          return null;
                        }

                        if (predictionViewMode === "band") {
                          return (
                            <span className="text-[#6B574F]">
                              {formatPredictionNumber(
                                prediction.minPredictedEntries,
                              )}
                              {" – "}
                              {formatPredictionNumber(
                                prediction.maxPredictedEntries,
                              )}
                            </span>
                          );
                        }

                        return (
                          <span className="font-semibold text-[#3F312B]">
                            {formatPredictionNumber(
                              prediction.predictedEntries,
                            )}
                          </span>
                        );
                      })()}
                    </td>
                    ) : null}

                    {showColumn("pattern") ? (
                      <td className="px-4 py-3">
                        {getPatternNumber(item)
                          ? "מסלול " + getPatternNumber(item)
                          : "-"}
                      </td>
                    ) : null}

                    {showColumn("judges") ? (
                      <td className="px-4 py-3">{getJudgesDisplay(item)}</td>
                    ) : null}

                    {showColumn("arena") ? (
                      <td className="px-4 py-3">{getArenaName(item)}</td>
                    ) : null}

                    {showColumn("startTime") ? (
                      <td className="px-4 py-3">
                        {formatTime(getStartTime(item))}
                      </td>
                    ) : null}

                    {showColumn("organizerCost") ? (
                      <td className="px-4 py-3">
                        {formatMoney(getOrganizerCost(item))}
                      </td>
                    ) : null}

                    {showColumn("federationCost") ? (
                      <td className="px-4 py-3">
                        {formatMoney(getFederationCost(item))}
                      </td>
                    ) : null}

                    {showColumn("totalCost") ? (
                      <td className="px-4 py-3 font-bold">
                        {formatMoney(getTotalCost(item))}
                      </td>
                    ) : null}

                    {showColumn("prizes") ? (
                      <td className="px-4 py-3">{getPrizesDisplay(item)}</td>
                    ) : null}

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <TableActionButton
                          icon={<Pencil size={15} />}
                          iconOnly
                          title="עריכת מקצה"
                          onClick={function () {
                            if (props.onEditClass) {
                              props.onEditClass(item);
                            }
                          }}
                          disabled={!props.onEditClass}
                        />

                        <TableActionButton
                          icon={<Trash2 size={15} />}
                          iconOnly
                          title="מחיקת מקצה"
                          variant="danger"
                          onClick={function () {
                            if (props.onDeleteClass) {
                              props.onDeleteClass(item);
                            }
                          }}
                          disabled={!props.onDeleteClass}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </tbody>
      </DataTableShell>
    </section>
  );
}
