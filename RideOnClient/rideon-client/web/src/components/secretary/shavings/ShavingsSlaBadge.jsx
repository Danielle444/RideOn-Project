// In-row SLA delay badge — Spec 2 (CAP-4, sla-rules.md + hebrew-labels.md).
// Rule A and Rule B carry distinct badges; the duration is templated from the single threshold
// constant (never a hardcoded number). Uses the summary page's semantic reds.
import {
  SHAVINGS_SLA_THRESHOLD_HOURS,
  getDelayRule,
} from "../../../utils/shavingsSla.utils";

const HOURS = SHAVINGS_SLA_THRESHOLD_HOURS;

const RULE_LABEL = {
  A: "טרם נלקח לטיפול · מעל " + HOURS + " שעות",
  B: "בטיפול · מעל " + HOURS + " שעות ללא אספקה",
};

export default function ShavingsSlaBadge(props) {
  const rule = props.rule || getDelayRule(props.order);

  if (!rule) {
    return null;
  }

  return (
    <span className="inline-block rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-bold text-[#C62828]">
      {RULE_LABEL[rule]}
    </span>
  );
}
