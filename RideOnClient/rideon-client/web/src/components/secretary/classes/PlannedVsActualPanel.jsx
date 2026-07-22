import {
  VERDICT_NO_DATA,
  VERDICT_FORECAST_HIGH,
  VERDICT_FORECAST_LOW,
} from "../../../utils/plannedVsActual.utils";
import { PLANNED_VS_ACTUAL_COPY } from "./classesViewCopy";

// The verdict is about the FORECAST, not the competition -- so a systematic forecast miss is
// toned as information, not as a failure the secretary caused. Only the on-target case is
// green; a biased forecast is amber because it is something to know, not something to fix.
function getVerdictStyle(verdict) {
  if (verdict === VERDICT_FORECAST_HIGH || verdict === VERDICT_FORECAST_LOW) {
    return "border-[#EFDCA8] bg-[#FDF8E8] text-[#7A6320]";
  }

  if (verdict === VERDICT_NO_DATA) {
    return "border-[#E3D5CC] bg-[#FBF7F4] text-[#6B574F]";
  }

  return "border-[#CBE3D1] bg-[#F2FAF4] text-[#2F6B3B]";
}

export default function PlannedVsActualPanel(props) {
  var summary = props.summary;

  if (!summary) {
    return null;
  }

  var verdictCopy = PLANNED_VS_ACTUAL_COPY.verdicts[summary.verdict];

  if (!verdictCopy) {
    return null;
  }

  var hasComparisons = summary.comparedClasses > 0;

  return (
    <section
      className={"rounded-3xl border px-5 py-4 " + getVerdictStyle(summary.verdict)}
    >
      <p className="text-xs font-semibold opacity-80">
        {PLANNED_VS_ACTUAL_COPY.panelTitle}
      </p>

      <h3 className="mt-1 text-lg font-bold">{verdictCopy.title}</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed">{verdictCopy.detail}</p>

      {hasComparisons ? (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold opacity-90">
          <span>{PLANNED_VS_ACTUAL_COPY.summaryLine(summary)}</span>
          <span>{PLANNED_VS_ACTUAL_COPY.totalsLine(summary)}</span>
        </div>
      ) : null}
    </section>
  );
}
