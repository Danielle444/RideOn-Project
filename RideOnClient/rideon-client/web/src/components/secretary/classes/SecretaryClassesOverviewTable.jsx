import { useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import {
  CLASSES_VIEW_PLANNING,
  CLASSES_VIEW_ACTUALS,
  isColumnVisible,
} from "../../../utils/classesView.utils";
import { compareClassToPrediction } from "../../../utils/plannedVsActual.utils";
import { SCHEDULE_COPY, ACTUAL_ENTRIES_TOOLTIP_COPY } from "./classesViewCopy";

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

  // The predicted and live schedule cells used to share one flag. Actuals keeps only the
  // live cell -- the forecast is over, so the predicted-schedule cell retires with the rest
  // of the forecast columns (CAP-1).
  var showLiveSchedule = showColumn("schedule");
  var showPredictedSchedule = showLiveSchedule && activeView === CLASSES_VIEW_PLANNING;

  // Counted rather than hardcoded: the old fixed 13/14/16 had to be hand-edited on every
  // column change, and a stale colSpan silently breaks the empty and loading rows. The two
  // schedule cells are counted directly via their own booleans rather than through this list,
  // since they no longer show/hide together.
  var VISIBLE_COLUMN_KEYS = [
    "orderInDay",
    "className",
    "status",
    "entries",
    "predictedEntries",
    "pattern",
    "judges",
    "arena",
    "startTime",
    "organizerCost",
    "federationCost",
    "prizes",
    "actions",
  ];

  var columnCount =
    (showPredictedSchedule ? 1 : 0) +
    (showLiveSchedule ? 1 : 0) +
    VISIBLE_COLUMN_KEYS.filter(showColumn).length;

  return (
    <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#3F312B]">מקצים בתחרות</h2>
        </div>
      </div>

      <DataTableShell>
        <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
          <tr>
            {showPredictedSchedule ? (
              <th className="px-4 py-3">{SCHEDULE_COPY.planning.columnHeader}</th>
            ) : null}

            {showLiveSchedule ? (
              <th className="px-4 py-3">{SCHEDULE_COPY.actuals.columnHeader}</th>
            ) : null}

            <th className="px-4 py-3">מס׳</th>
            <th className="px-4 py-3">שם מקצה</th>
            {showColumn("status") ? <th className="px-4 py-3">סטטוס</th> : null}
            {showColumn("entries") ? (
              <th className="px-4 py-3">כניסות בפועל</th>
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
                var status = props.getClassStatus
                  ? props.getClassStatus(item)
                  : { key: "empty", label: "אין כניסות" };

                var schedule = showLiveSchedule && props.getScheduleForClass
                  ? props.getScheduleForClass(item)
                  : null;

                // Colors the actual number in actuals only -- driven by the same band math
                // as the (now-parked) planned-vs-actual diagnostic. Null in planning/financial
                // and for any class with no prediction, which renders neutral (CAP-2).
                var actualsComparison =
                  activeView === CLASSES_VIEW_ACTUALS
                    ? compareClassToPrediction(
                        classEntriesCount,
                        props.getPredictionForClass
                          ? props.getPredictionForClass(item)
                          : null,
                      )
                    : null;

                return (
                  <tr
                    key={getClassId(item)}
                    className="border-t border-[#F1E7E1] text-sm text-[#4A3A34]"
                  >
                    {showPredictedSchedule ? (
                      <td className="px-4 py-3">
                        {renderScheduleCell(schedule ? schedule.predicted : null)}
                      </td>
                    ) : null}

                    {showLiveSchedule ? (
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
                          <span
                            className={
                              actualsComparison
                                ? "w-fit rounded-full px-2 py-0.5 text-xs font-semibold " +
                                  (actualsComparison.isWithinBand
                                    ? "bg-[#EEF8F0] text-[#2F6B3B]"
                                    : getTierClass("yellow"))
                                : "font-bold text-[#3F312B]"
                            }
                            title={
                              actualsComparison
                                ? (actualsComparison.isWithinBand
                                    ? ACTUAL_ENTRIES_TOOLTIP_COPY.withinBand
                                    : ACTUAL_ENTRIES_TOOLTIP_COPY.outsideBand)(
                                    Math.round(actualsComparison.minPredicted),
                                    Math.round(actualsComparison.maxPredicted),
                                  )
                                : undefined
                            }
                          >
                            {classEntriesCount}
                          </span>
                        </div>
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

                    {showColumn("prizes") ? (
                      <td className="px-4 py-3">{getPrizesDisplay(item)}</td>
                    ) : null}

                    <td className="px-4 py-3">
                      {/* Three equal squares, mirroring CompetitionsTable.jsx:298 (CAP-4) --
                          the view button keeps its handler but drops its wide label for an
                          ArrowLeft icon with the label on hover via title. */}
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={function () {
                            props.onOpenClassEntries(item);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#BCAAA4] bg-white text-[#5D4037] shadow-sm transition-colors hover:bg-[#F8F5F2]"
                          title="צפייה בכניסות"
                        >
                          <ArrowLeft size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={function () {
                            if (props.onEditClass) {
                              props.onEditClass(item);
                            }
                          }}
                          disabled={!props.onEditClass}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DDD1CA] bg-white text-[#6B574F] shadow-sm transition-colors hover:bg-[#F8F5F2] disabled:cursor-not-allowed disabled:opacity-50"
                          title="עריכת מקצה"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={function () {
                            if (props.onDeleteClass) {
                              props.onDeleteClass(item);
                            }
                          }}
                          disabled={!props.onDeleteClass}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E4C1C1] bg-white text-[#A54848] shadow-sm transition-colors hover:bg-[#FFF6F6] disabled:cursor-not-allowed disabled:opacity-50"
                          title="מחיקת מקצה"
                        >
                          <Trash2 size={17} />
                        </button>
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
