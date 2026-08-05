import {
  WINDOW_STATUS_ON_TRACK,
  WINDOW_STATUS_URGENT,
} from "../../../utils/registrationWindow.utils";
import { REGISTRATION_WINDOW_COPY } from "./classesViewCopy";

function getPanelStyle(status) {
  if (status === WINDOW_STATUS_URGENT) {
    return "border-[#F0C9BC] bg-[#FDF1EC] text-[#8A4A32]";
  }

  if (status === WINDOW_STATUS_ON_TRACK) {
    return "border-[#CBE3D1] bg-[#F2FAF4] text-[#2F6B3B]";
  }

  return "border-[#EFDCA8] bg-[#FDF8E8] text-[#7A6320]";
}

// Two bars on one axis: how much of the window has elapsed, and how far toward the forecast
// registration has got. The gap between them IS the message -- a raw percentage cannot show
// it, which is why the panel is denominated this way.
function ProgressBars(props) {
  var analysis = props.analysis;

  var rows = [
    { label: props.windowLabel, ratio: analysis.windowElapsed, tone: "bg-[#B99C8D]" },
    { label: props.entriesLabel, ratio: analysis.forecastProgress, tone: "bg-[#7B5A4D]" },
  ];

  return (
    <div className="mt-3 space-y-2">
      {rows.map(function (row) {
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs font-semibold opacity-80">
              {row.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/70">
              <div
                className={"h-full rounded-full " + row.tone}
                style={{ width: Math.round(row.ratio * 100) + "%" }}
              />
            </div>
            <span className="w-10 shrink-0 text-xs font-bold">
              {Math.round(row.ratio * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function RegistrationWindowPanel(props) {
  var analysis = props.analysis;

  if (!analysis || !analysis.isOpen) {
    return null;
  }

  var statusCopy = REGISTRATION_WINDOW_COPY.statuses[analysis.status];

  if (!statusCopy) {
    return null;
  }

  return (
    <section className={"rounded-3xl border px-5 py-4 " + getPanelStyle(analysis.status)}>
      <p className="text-xs font-semibold opacity-80">
        {REGISTRATION_WINDOW_COPY.panelTitle}
      </p>

      <h3 className="mt-1 text-lg font-bold">{statusCopy.title}</h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed">{statusCopy.detail}</p>

      <p className="mt-2 text-xs font-semibold opacity-90">
        {REGISTRATION_WINDOW_COPY.progressLine(analysis)}
      </p>

      <ProgressBars
        analysis={analysis}
        windowLabel={props.windowLabel || "תקופת ההרשמה"}
        entriesLabel={props.entriesLabel || "הרשמות בפועל אל מול התחזית"}
      />
    </section>
  );
}
