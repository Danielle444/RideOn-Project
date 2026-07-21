import { useState } from "react";
import {
  WINDOW_STATUS_ON_TRACK,
  WINDOW_STATUS_EARLY_SOFT,
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
  var [isConfirming, setIsConfirming] = useState(false);
  var [wasSent, setWasSent] = useState(false);

  if (!analysis || !analysis.isOpen) {
    return null;
  }

  var statusCopy = REGISTRATION_WINDOW_COPY.statuses[analysis.status];

  if (!statusCopy) {
    return null;
  }

  // The nudge is offered only when there is something to act on. On-track and early-soft
  // deliberately have no button: early in the window the forecast is the unreliable side,
  // and offering a broadcast then trains the secretary to spam.
  var canNotify =
    analysis.status !== WINDOW_STATUS_ON_TRACK &&
    analysis.status !== WINDOW_STATUS_EARLY_SOFT;

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
        entriesLabel={props.entriesLabel || "הרשמות בפועל"}
      />

      {canNotify ? (
        <div className="mt-4">
          {wasSent ? (
            <p className="text-sm font-semibold">
              {REGISTRATION_WINDOW_COPY.notifySent}
            </p>
          ) : isConfirming ? (
            // Sending reaches real people and cannot be recalled, so the "one click" is a
            // click plus a confirmation that names the audience and the competition.
            <div className="rounded-2xl border border-current/20 bg-white/70 px-4 py-3">
              <p className="text-sm font-bold">
                {REGISTRATION_WINDOW_COPY.notifyConfirmTitle}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {REGISTRATION_WINDOW_COPY.notifyConfirmBody(props.competitionName || "")}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={function () {
                    setIsConfirming(false);
                    setWasSent(true);

                    if (props.onNotify) {
                      props.onNotify();
                    }
                  }}
                  className="rounded-full bg-[#8B6352] px-4 py-1 text-xs font-semibold text-white"
                >
                  {REGISTRATION_WINDOW_COPY.notifyConfirm}
                </button>

                <button
                  type="button"
                  onClick={function () {
                    setIsConfirming(false);
                  }}
                  className="rounded-full border border-[#C9A99A] bg-white px-4 py-1 text-xs font-semibold text-[#7B5A4D]"
                >
                  {REGISTRATION_WINDOW_COPY.notifyCancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={function () {
                setIsConfirming(true);
              }}
              className="rounded-full border border-[#C9A99A] bg-white px-4 py-1.5 text-sm font-semibold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8]"
            >
              {REGISTRATION_WINDOW_COPY.notifyButton}
            </button>
          )}

          {/* Stays visible in every state: nothing behind this button actually sends. */}
          <p className="mt-2 text-xs opacity-75">
            {REGISTRATION_WINDOW_COPY.demoNotice}
          </p>
        </div>
      ) : null}
    </section>
  );
}
