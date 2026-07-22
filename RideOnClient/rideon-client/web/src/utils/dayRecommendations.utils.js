// Staffing recommendations for a long competition day.
//
// These are advice about things the system does NOT track -- judge rotations and worker
// shifts live outside the app entirely. The recommendation exists to put the thought in
// front of the secretary at the moment the schedule says the day will run long, and then to
// get out of the way once she has answered it.
//
// Trigger: the day's late-finish tier is anything other than "none" -- i.e. the day is
// already flagged as finishing late (yellow 23:00 and up, read live from smartconfig).
// Deliberately reuses the existing tier rather than introducing a second threshold, so the
// advice always accompanies a warning the secretary can already see, and one config change
// moves both.

var RECOMMENDATION_JUDGES = "judges";
var RECOMMENDATION_SHIFTS = "shifts";

var RESPONSE_PENDING = "pending";
var RESPONSE_WILL_DO = "willDo";
var RESPONSE_LATER = "later";
var RESPONSE_NOT_NEEDED = "notNeeded";

// Above this many judges on a day, the relief problem is assumed already solved.
//
// NOTE: no day in the live database has ever had more than 2 distinct judges (verified
// 2026-07-21), so today this threshold never suppresses anything and the judge advice
// reduces to "the day runs late". It is kept as an explicit rule rather than dropped
// because the intent -- do not nag when cover already exists -- outlives the current data.
var JUDGES_ALREADY_COVERED = 2;

function getJudgeIds(item) {
  var ids = item.judgeIds;

  if (!ids) {
    ids = item.JudgeIds;
  }

  return Array.isArray(ids) ? ids : [];
}

/**
 * Distinct judges rostered across a day's classes.
 */
function countDistinctJudges(dayClasses) {
  var seen = {};
  var total = 0;

  (dayClasses || []).forEach(function (item) {
    getJudgeIds(item).forEach(function (judgeId) {
      if (judgeId === null || judgeId === undefined) {
        return;
      }

      if (!seen[judgeId]) {
        seen[judgeId] = true;
        total += 1;
      }
    });
  });

  return total;
}

/**
 * Which recommendations a day earns. Returns [] when the day does not finish late.
 *
 * @param {object|null} dayResult the day-level schedule result (carries `tier`)
 * @param {Array<object>} dayClasses
 */
function getDayRecommendations(dayResult, dayClasses) {
  if (!dayResult || !dayResult.tier || dayResult.tier === "none") {
    return [];
  }

  var recommendations = [];
  var judgeCount = countDistinctJudges(dayClasses);

  if (judgeCount > 0 && judgeCount <= JUDGES_ALREADY_COVERED) {
    recommendations.push({
      key: RECOMMENDATION_JUDGES,
      judgeCount: judgeCount,
      dayFinishTime: dayResult.dayFinishTime || null,
    });
  }

  recommendations.push({
    key: RECOMMENDATION_SHIFTS,
    dayFinishTime: dayResult.dayFinishTime || null,
  });

  return recommendations;
}

export {
  RECOMMENDATION_JUDGES,
  RECOMMENDATION_SHIFTS,
  RESPONSE_PENDING,
  RESPONSE_WILL_DO,
  RESPONSE_LATER,
  RESPONSE_NOT_NEEDED,
  JUDGES_ALREADY_COVERED,
  countDistinctJudges,
  getDayRecommendations,
};
