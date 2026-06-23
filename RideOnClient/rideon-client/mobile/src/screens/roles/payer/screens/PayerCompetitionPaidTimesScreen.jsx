import PayerCompetitionAccountScreen from "./PayerCompetitionAccountScreen";

export default function PayerCompetitionPaidTimesScreen(props) {
  var routeWithTab = Object.assign({}, props.route || {}, {
    params: Object.assign({}, props.route?.params || {}, {
      initialTab: "paidTimes",
    }),
  });

  return <PayerCompetitionAccountScreen {...props} route={routeWithTab} />;
}
