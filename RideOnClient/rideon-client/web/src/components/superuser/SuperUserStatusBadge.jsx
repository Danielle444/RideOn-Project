export default function SuperUserStatusBadge(props) {
  const value = props.value;
  const type = props.type || "active";

  if (type === "active") {
    return value ? (
      <span className="inline-flex items-center rounded-full border border-[#B9D9C0] bg-[#E7F4EA] px-3 py-1 text-sm font-semibold text-[#2F6B3B]">
        פעיל
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full border border-[#E7BABA] bg-[#F9E5E5] px-3 py-1 text-sm font-semibold text-[#A54848]">
        לא פעיל
      </span>
    );
  }

  return value ? (
    <span className="inline-flex items-center rounded-full border border-[#E8C99A] bg-[#F7E7CF] px-3 py-1 text-sm font-semibold text-[#9A6700]">
      החלפה נדרשת
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[#DDD1CA] bg-[#F3EEEA] px-3 py-1 text-sm font-semibold text-[#6B574F]">
      תקין
    </span>
  );
}