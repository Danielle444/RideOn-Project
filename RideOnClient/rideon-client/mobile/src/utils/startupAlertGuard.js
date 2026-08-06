// Small, screen-local guard so two independent startup loaders that each
// retry and fail on their own do not stack two Alert.alert calls in a row
// (WorkerHomeScreen fires loadHomeCompetitions and loadShavingsFeed together
// on mount and on refresh - each has its own try/catch/Alert). This is not a
// general alert manager: it only answers "has something in this cycle
// already alerted?" for whoever holds the instance.
//
// A boolean held here (not React state) is the correctness guard, for the
// same reason as inFlightGuard.js: state updates are asynchronous, so two
// catch blocks settling close together could both read "not shown yet"
// before either render reflects the first one. shouldAlert() below is a
// synchronous check-and-set, so only the first caller in a cycle ever gets
// true, regardless of which of the two loaders' promises settles first.

function createStartupAlertGuard() {
  var alerted = false;

  function reset() {
    alerted = false;
  }

  function shouldAlert() {
    if (alerted) {
      return false;
    }

    alerted = true;
    return true;
  }

  return { reset: reset, shouldAlert: shouldAlert };
}

export { createStartupAlertGuard };
