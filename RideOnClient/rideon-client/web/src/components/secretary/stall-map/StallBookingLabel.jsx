import {
  getStallRanchLine,
  getStallSecondaryLine,
} from "./StallBookingLabel.utils";

export default function StallBookingLabel({ item }) {
  if (!item) return null;

  return (
    <>
      <span className="max-w-full truncate text-center text-[10px] font-extrabold text-[#3F312B]">
        {getStallRanchLine(item)}
      </span>

      <span className="mt-0.5 max-w-full truncate text-center text-[8px] font-semibold text-[#7B5A4D]">
        {getStallSecondaryLine(item)}
      </span>
    </>
  );
}
