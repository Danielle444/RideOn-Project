import { getPaidTimeIdentityLines } from "./PaidTimeBookingLabel.utils";

export default function PaidTimeBookingLabel({ item, lineClassName }) {
  if (!item) return null;

  var lines = getPaidTimeIdentityLines(item);
  var extra = lineClassName ? " " + lineClassName : "";

  return (
    <>
      <p className={"text-sm font-bold text-[#3F312B]" + extra}>{lines[0]}</p>
      <p className={"text-xs text-[#7A655C]" + extra}>{lines[1]}</p>
      <p className={"mt-0.5 text-xs font-medium text-[#7B5A4D]" + extra}>
        {lines[2]}
      </p>
    </>
  );
}
