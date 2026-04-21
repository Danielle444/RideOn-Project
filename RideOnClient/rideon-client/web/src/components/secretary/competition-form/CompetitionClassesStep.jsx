import { useEffect, useMemo, useState } from "react";
import { Copy, Plus } from "lucide-react";
import SectionCard from "./SectionCard";
import ClassesInCompetitionSection from "../ClassesInCompetitionSection";

function buildCompetitionDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return [];
  }

  var start = new Date(startDate);
  var end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  var days = [];
  var current = new Date(start);

  while (current <= end) {
    var year = current.getFullYear();
    var month = String(current.getMonth() + 1).padStart(2, "0");
    var day = String(current.getDate()).padStart(2, "0");
    var key = year + "-" + month + "-" + day;

    days.push({
      key: key,
      label: current.toLocaleDateString("he-IL", { weekday: "long" }),
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getDateKey(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

export default function CompetitionClassesStep(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var classTypes = Array.isArray(props.classTypes) ? props.classTypes : [];
  var judges = Array.isArray(props.judges) ? props.judges : [];
  var arenas = Array.isArray(props.arenas) ? props.arenas : [];

  var competitionDays = useMemo(
    function () {
      return buildCompetitionDays(
        props.competitionStartDate,
        props.competitionEndDate,
      );
    },
    [props.competitionStartDate, props.competitionEndDate],
  );

  var [selectedDayKey, setSelectedDayKey] = useState(
    competitionDays.length > 0 ? competitionDays[0].key : "",
  );

  useEffect(
    function () {
      if (competitionDays.length === 0) {
        setSelectedDayKey("");
        return;
      }

      var exists = competitionDays.some(function (day) {
        return day.key === selectedDayKey;
      });

      if (!exists) {
        setSelectedDayKey(competitionDays[0].key);
      }
    },
    [competitionDays, selectedDayKey],
  );

  var itemsByDay = useMemo(
    function () {
      return items.filter(function (item) {
        return getDateKey(item.classDateTime) === selectedDayKey;
      });
    },
    [items, selectedDayKey],
  );

  function getDayTitle(day) {
    var dayItems = items.filter(function (item) {
      return getDateKey(item.classDateTime) === day.key;
    });

    if (dayItems.length === 0) {
      return day.label + " — אין מקצים";
    }

    var times = dayItems
      .map(function (item) {
        return formatTime(item.startTime);
      })
      .filter(Boolean)
      .sort();

    if (times.length > 0) {
      return day.label + " — מתחילים " + times[0];
    }

    return day.label + " — " + dayItems.length + " מקצים";
  }

  var selectedDay = competitionDays.find(function (day) {
    return day.key === selectedDayKey;
  });

  return (
    <SectionCard
      title="2. מקצים"
      isOpen={props.isOpen}
      isDisabled={props.isDisabled}
      onToggle={props.onToggle}
      statusText={props.competitionId ? "זמין" : "לא נשמר"}
    >
      <div className="space-y-6">
        {competitionDays.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end gap-6 border-b border-[#E8DDD7] pb-2">
              {competitionDays.map(function (day) {
                var isActive = day.key === selectedDayKey;

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={function () {
                      setSelectedDayKey(day.key);
                    }}
                    className={
                      "border-b-2 px-3 pb-3 text-[1.1rem] font-bold transition-colors " +
                      (isActive
                        ? "border-[#8B6352] text-[#8B6352]"
                        : "border-transparent text-[#6D4C41] hover:text-[#8B6352]")
                    }
                  >
                    {getDayTitle(day)}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-[2rem] font-bold text-[#5A3E36]">
                {selectedDay ? "מקצים ל" + selectedDay.label : "מקצים"}
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={function () {
                    props.onAdd(selectedDayKey);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
                >
                  <Plus size={18} />
                  הוספת מקצה
                </button>

                <button
                  type="button"
                  disabled={true}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#7B655C] opacity-60"
                  title="שכפול מקצים יתחבר בהמשך"
                >
                  <Copy size={18} />
                  שכפל מקצים
                </button>
              </div>
            </div>

            <ClassesInCompetitionSection
              competitionId={props.competitionId}
              items={itemsByDay}
              loading={props.loading}
              classTypes={classTypes}
              judges={judges}
              arenas={arenas}
              onAdd={function () {
                props.onAdd(selectedDayKey);
              }}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-[#E8DDD7] bg-[#FFFCFA] px-5 py-6 text-right text-[#6D4C41]">
            כדי להציג מקצים לפי ימים, יש להגדיר קודם תאריך התחלה ותאריך סיום לתחרות.
          </div>
        )}

        {props.competitionId ? (
          <div className="flex flex-wrap items-center justify-start gap-3 border-t border-[#EFE5DF] pt-4">
            {props.shouldShowPaidTimeStep ? (
              <button
                type="button"
                onClick={props.onFinishStep}
                className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
              >
                שמור והמשך לפייד־טיים
              </button>
            ) : null}

            <button
              type="button"
              onClick={props.onSaveDraft}
              className="rounded-xl border border-[#D7CCC8] px-5 py-3 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
            >
              שמור כטיוטה
            </button>

            <button
              type="button"
              onClick={props.onPublish}
              disabled={!props.canPublishCompetition}
              className="rounded-xl bg-[#5D7C67] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#4E6B58] disabled:cursor-not-allowed disabled:opacity-50"
              title={
                props.canPublishCompetition
                  ? "פרסום התחרות"
                  : "אפשר לפרסם רק אחרי שהוגדר לפחות מקצה אחד"
              }
            >
              פרסום תחרות
            </button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}