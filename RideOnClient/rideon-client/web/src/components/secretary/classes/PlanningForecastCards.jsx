import { PLANNING_FORECAST_COPY } from "./classesViewCopy";

function formatMoney(value) {
  return "₪" + Math.round(Number(value) || 0).toLocaleString("he-IL");
}

// Forecast counterparts to the actuals summary cards. The paid/unpaid split those carry is
// meaningless before registration closes -- there is nothing to have paid yet -- so the
// planning view answers the two questions that ARE forecastable: how many riders are
// expected, and what the day is expected to bring in.
//
// Income is GROSS: predicted entries x cost, with no prize deduction. Prizes are excluded
// deliberately (product decision) -- netting them off needs per-class prize amounts the
// classes query does not carry, and the jackpot type scales with entry count, so a "net"
// figure would move with the forecast on both sides and read as more precise than it is.
export default function PlanningForecastCards(props) {
  var forecast = props.forecast;

  if (!forecast) {
    return null;
  }

  var cards = [
    {
      label: PLANNING_FORECAST_COPY.predictedEntries,
      value: Math.round(forecast.predictedEntries),
      tone: "text-[#3F312B]",
    },
    {
      label: PLANNING_FORECAST_COPY.totalIncome,
      value: formatMoney(forecast.totalIncome),
      tone: "text-[#3F312B]",
    },
    {
      label: PLANNING_FORECAST_COPY.ranchIncome,
      value: formatMoney(forecast.ranchIncome),
      tone: "text-[#2F6B3B]",
    },
    {
      label: PLANNING_FORECAST_COPY.federationIncome,
      value: formatMoney(forecast.federationIncome),
      tone: "text-[#7A6320]",
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(function (card) {
          return (
            <div
              key={card.label}
              className="rounded-3xl border border-[#EFE5DF] bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold text-[#8D6E63]">{card.label}</p>
              <p className={"mt-2 text-2xl font-bold " + card.tone}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Says plainly that these are forecasts and that income is gross. */}
      <p className="mt-2 text-xs text-[#8D6E63]">{PLANNING_FORECAST_COPY.caveat}</p>
    </section>
  );
}
