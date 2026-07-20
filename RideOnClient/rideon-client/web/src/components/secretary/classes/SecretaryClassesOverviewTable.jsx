import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";

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

function renderScheduleCell(cell, onApplySuggestion, applyingSuggestionClassId) {
  if (!cell) {
    return <span className="text-[#8D6E63]">-</span>;
  }

  if (!cell.hasClockTime) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[#4A3A34]">{cell.durationMinutes} דק׳</span>
        {cell.isFirstOfDay ? (
          <span className="text-[10px] text-[#9A5B00]">
            יש להזין שעת התחלה למקצה הראשון כדי להציג לוח הזמנים
          </span>
        ) : null}
      </div>
    );
  }

  var tierClass = cell.isLastOfDay ? getTierClass(cell.tier) : "";
  var isApplying =
    !!cell.suggestion && applyingSuggestionClassId === cell.suggestion.targetClassId;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={
          "inline-block w-fit rounded px-2 py-0.5 font-semibold text-[#4A3A34] " + tierClass
        }
      >
        {cell.startTime}
        {" – "}
        {cell.finishTime}
      </span>

      {cell.isLastOfDay && cell.tier === "yellow" ? (
        <span className="text-[10px] text-[#8A6D1D]">שעת הסיום המשוערת גבולית</span>
      ) : null}

      {cell.isLastOfDay && (cell.tier === "orange" || cell.tier === "red") ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[#9A5216]">
            שעת הסיום צפויה להיות מאוחרת מאוד
          </span>
          {cell.suggestion ? (
            <button
              type="button"
              disabled={isApplying}
              onClick={function () {
                if (onApplySuggestion) {
                  onApplySuggestion(
                    cell.suggestion.targetClassId,
                    cell.suggestion.newStartTime,
                  );
                }
              }}
              className="w-fit rounded-full border border-[#E3D5CC] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8] disabled:opacity-50"
            >
              {"הקדם את שעת ההתחלה ל-" + cell.suggestion.newStartTime}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

var SCHEDULE_VIEW_MODES = [
  { key: "avg", label: "רגיל" },
  { key: "min", label: "מינימום" },
  { key: "max", label: "מקסימום" },
];

export default function SecretaryClassesOverviewTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var [predictionViewMode, setPredictionViewMode] = useState("value");
  var showScheduleColumns = !!props.showScheduleColumns;
  var columnCount = showScheduleColumns ? 16 : 14;

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
                  <span>לוח זמנים משוער</span>
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
              <th className="px-4 py-3">לוח זמנים בפועל</th>
            ) : null}

            <th className="px-4 py-3">מס׳</th>
            <th className="px-4 py-3">שם מקצה</th>
            <th className="px-4 py-3">סטטוס</th>
            <th className="px-4 py-3">כניסות</th>
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
                    מספר
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
            <th className="px-4 py-3">מסלול</th>
            <th className="px-4 py-3">שופטים</th>
            <th className="px-4 py-3">מגרש</th>
            <th className="px-4 py-3">שעה</th>
            <th className="px-4 py-3">עלות מארגן</th>
            <th className="px-4 py-3">עלות התאחדות</th>
            <th className="px-4 py-3">סה״כ מחיר</th>
            <th className="px-4 py-3">פרסים</th>
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
                        {renderScheduleCell(
                          schedule ? schedule.predicted : null,
                          props.onApplyStartTimeSuggestion,
                          props.applyingSuggestionClassId,
                        )}
                      </td>
                    ) : null}

                    {showScheduleColumns ? (
                      <td className="px-4 py-3">
                        {renderScheduleCell(
                          schedule ? schedule.live : null,
                          props.onApplyStartTimeSuggestion,
                          props.applyingSuggestionClassId,
                        )}
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

                    <td className="px-4 py-3">
                      {getPatternNumber(item)
                        ? "מסלול " + getPatternNumber(item)
                        : "-"}
                    </td>

                    <td className="px-4 py-3">{getJudgesDisplay(item)}</td>

                    <td className="px-4 py-3">{getArenaName(item)}</td>

                    <td className="px-4 py-3">
                      {formatTime(getStartTime(item))}
                    </td>

                    <td className="px-4 py-3">
                      {formatMoney(getOrganizerCost(item))}
                    </td>

                    <td className="px-4 py-3">
                      {formatMoney(getFederationCost(item))}
                    </td>

                    <td className="px-4 py-3 font-bold">
                      {formatMoney(getTotalCost(item))}
                    </td>

                    <td className="px-4 py-3">{getPrizesDisplay(item)}</td>

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
