import PayerCompetitionAccountScreen from "./PayerCompetitionAccountScreen";

// Per Q3: payer sees a single tabbed screen. Old per-tab routes redirect
// into the unified account screen by injecting initialTab in the route.
export default function PayerCompetitionClassesScreen(props) {
  var routeWithTab = Object.assign({}, props.route || {}, {
    params: Object.assign({}, props.route?.params || {}, {
      initialTab: "classes",
    }),
  });

  return <PayerCompetitionAccountScreen {...props} route={routeWithTab} />;
}
