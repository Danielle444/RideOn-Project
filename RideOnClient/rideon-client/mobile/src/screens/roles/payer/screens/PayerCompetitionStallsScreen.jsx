import PayerCompetitionAccountScreen from "./PayerCompetitionAccountScreen";

export default function PayerCompetitionStallsScreen(props) {
  var routeWithTab = Object.assign({}, props.route || {}, {
    params: Object.assign({}, props.route?.params || {}, {
      initialTab: "stalls",
    }),
  });

  return <PayerCompetitionAccountScreen {...props} route={routeWithTab} />;
}
