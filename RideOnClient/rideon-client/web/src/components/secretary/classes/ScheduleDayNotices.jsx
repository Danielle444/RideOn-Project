import { CLASSES_VIEW_ACTUALS } from "../../../utils/classesView.utils";
import { SCHEDULE_COPY } from "./classesViewCopy";

// Day-level schedule notices, promoted OUT of the table cells they used to live in.
//
// These are facts about the whole day -- an assumed start hour, a late finish, an offered
// correction -- and they were previously rendered at text-[10px] inside a single cell on the
// day's first and last rows, where 40 words of Hebrew were effectively unreadable. They
// belong above the table, at a legible size, stated once.

function getTierStyle(tier) {
  if (tier === "red" || tier === "orange") {
    return "border-[#F0C9BC] bg-[#FDF1EC] text-[#8A4A32]";
  }

  if (tier === "yellow") {
    return "border-[#EFDCA8] bg-[#FDF8E8] text-[#7A6320]";
  }

  return "border-[#E3D5CC] bg-[#FBF7F4] text-[#6B574F]";
}

function ApplyButton(props) {
  if (!props.suggestion) {
    return null;
  }

  var isApplying = props.applyingSuggestionClassId === props.suggestion.targetClassId;

  return (
    <button
      type="button"
      disabled={isApplying}
      onClick={function () {
        if (props.onApplySuggestion) {
          props.onApplySuggestion(
            props.suggestion.targetClassId,
            props.suggestion.newStartTime,
          );
        }
      }}
      className="w-fit rounded-full border border-[#C9A99A] bg-white px-3 py-1 text-xs font-semibold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8] disabled:opacity-50"
    >
      {props.label}
    </button>
  );
}

// One notice block for one schedule (the forecast one or the actuals one). `dayResult` is
// the day-level object computeScheduleColumn hands back.
function ScheduleNotice(props) {
  var dayResult = props.dayResult;
  var copy = SCHEDULE_COPY[props.viewKey === CLASSES_VIEW_ACTUALS ? "actuals" : "planning"];

  if (!dayResult) {
    return null;
  }

  if (!dayResult.hasOrigin) {
    return (
      <div className={"rounded-2xl border px-4 py-3 text-sm " + getTierStyle("none")}>
        <p className="font-semibold">{copy.columnHeader}</p>
        <p className="mt-1">{copy.noStartTime}</p>
      </div>
    );
  }

  var suggestion = dayResult.suggestion;
  var messages = [];

  if (dayResult.isAssumedOrigin && suggestion && suggestion.kind === "set") {
    messages.push(copy.assumedOrigin(suggestion.newStartTime));
  }

  if (dayResult.tier === "yellow") {
    messages.push(copy.lateFinishYellow);
  }

  if (dayResult.tier === "orange" || dayResult.tier === "red") {
    messages.push(copy.lateFinishHigh);

    if (suggestion && suggestion.isInsufficient) {
      messages.push(copy.insufficient);
    }
  }

  var applyLabel = null;

  if (suggestion && suggestion.kind === "set") {
    applyLabel = copy.applySetLabel(suggestion.newStartTime);
  } else if (suggestion && suggestion.kind === "advance") {
    applyLabel = copy.applyAdvanceLabel(suggestion.newStartTime);
  }

  var dayFinishTime = props.dayFinishTime;

  // Nothing to say: no assumed origin, no late finish. The schedule speaks for itself in
  // the table, so the panel stays quiet rather than restating it.
  if (messages.length === 0 && !dayFinishTime) {
    return null;
  }

  return (
    <div
      className={"rounded-2xl border px-4 py-3 text-sm " + getTierStyle(dayResult.tier)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{copy.columnHeader}</p>
        {dayFinishTime ? (
          <p className="text-sm font-bold">
            {copy.dayFinishLabel +
              ": " +
              dayFinishTime +
              (dayResult.dayFinishesAfterMidnight ? SCHEDULE_COPY.nextDaySuffix : "")}
          </p>
        ) : null}
      </div>

      {messages.map(function (message, index) {
        return (
          <p key={index} className="mt-1 leading-relaxed">
            {message}
          </p>
        );
      })}

      {applyLabel ? (
        <div className="mt-2">
          <ApplyButton
            suggestion={suggestion}
            label={applyLabel}
            onApplySuggestion={props.onApplySuggestion}
            applyingSuggestionClassId={props.applyingSuggestionClassId}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ScheduleDayNotices(props) {
  var notices = props.notices;

  if (!notices) {
    return null;
  }

  // The forecast notice and the actuals notice are both shown, each in its own voice --
  // the table carries both schedule columns, so both days can have something to say.
  var blocks = [
    { key: "predicted", dayResult: notices.predicted, viewKey: "planning" },
    { key: "live", dayResult: notices.live, viewKey: CLASSES_VIEW_ACTUALS },
  ];

  var rendered = blocks
    .map(function (block) {
      return (
        <ScheduleNotice
          key={block.key}
          dayResult={block.dayResult}
          viewKey={block.viewKey}
          dayFinishTime={block.dayResult ? block.dayResult.dayFinishTime : null}
          onApplySuggestion={props.onApplySuggestion}
          applyingSuggestionClassId={props.applyingSuggestionClassId}
        />
      );
    })
    .filter(Boolean);

  if (rendered.length === 0) {
    return null;
  }

  return <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{rendered}</div>;
}
