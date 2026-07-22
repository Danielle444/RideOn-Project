import {
  RECOMMENDATION_JUDGES,
  RESPONSE_WILL_DO,
  RESPONSE_LATER,
  RESPONSE_NOT_NEEDED,
} from "../../../utils/dayRecommendations.utils";
import { DAY_RECOMMENDATIONS_COPY } from "./classesViewCopy";

var RESPONSE_BUTTONS = [
  { key: RESPONSE_WILL_DO, label: DAY_RECOMMENDATIONS_COPY.responses.willDo },
  { key: RESPONSE_LATER, label: DAY_RECOMMENDATIONS_COPY.responses.later },
  { key: RESPONSE_NOT_NEEDED, label: DAY_RECOMMENDATIONS_COPY.responses.notNeeded },
];

function RecommendationCard(props) {
  var recommendation = props.recommendation;
  var isJudges = recommendation.key === RECOMMENDATION_JUDGES;
  var copy = isJudges
    ? DAY_RECOMMENDATIONS_COPY.judges
    : DAY_RECOMMENDATIONS_COPY.shifts;

  var detail = isJudges
    ? copy.detail(recommendation.judgeCount, recommendation.dayFinishTime)
    : copy.detail(recommendation.dayFinishTime);

  var response = props.response;

  return (
    <div className="rounded-2xl border border-[#E3D5CC] bg-white px-4 py-3">
      <p className="text-sm font-bold text-[#3F312B]">{copy.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#6B574F]">{detail}</p>

      {response ? (
        // Answered: state what she chose and offer a way back, rather than hiding the
        // recommendation entirely -- a vanished card reads as a bug.
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-[#2F6B3B]">
            {DAY_RECOMMENDATIONS_COPY.answered[response]}
          </span>
          <button
            type="button"
            onClick={function () {
              props.onRespond(recommendation.key, null);
            }}
            className="text-xs font-semibold text-[#7B5A4D] underline underline-offset-4"
          >
            {DAY_RECOMMENDATIONS_COPY.undo}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {RESPONSE_BUTTONS.map(function (button) {
            return (
              <button
                key={button.key}
                type="button"
                onClick={function () {
                  props.onRespond(recommendation.key, button.key);
                }}
                className="rounded-full border border-[#C9A99A] bg-white px-3 py-1 text-xs font-semibold text-[#7B5A4D] transition-colors hover:bg-[#F5EDE8]"
              >
                {button.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DayRecommendationsPanel(props) {
  var recommendations = props.recommendations || [];

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-[#EFDCA8] bg-[#FDF8E8] px-5 py-4">
      <p className="text-xs font-semibold text-[#7A6320]">
        {DAY_RECOMMENDATIONS_COPY.panelTitle}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {recommendations.map(function (recommendation) {
          return (
            <RecommendationCard
              key={recommendation.key}
              recommendation={recommendation}
              response={props.responses ? props.responses[recommendation.key] : null}
              onRespond={props.onRespond}
            />
          );
        })}
      </div>
    </section>
  );
}
