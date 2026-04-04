export default function StatusPill(props) {
  const value = props.value;
  const type = props.type || "generic";

  if (type === "request") {
    const config = {
      Pending: {
        label: "ממתין",
        className: "border-[#E8C99A] bg-[#F7E7CF] text-[#9A6700]",
      },
      Approved: {
        label: "מאושר",
        className: "border-[#B9D9C0] bg-[#E7F4EA] text-[#2F6B3B]",
      },
      Rejected: {
        label: "נדחה",
        className: "border-[#E7BABA] bg-[#F9E5E5] text-[#A54848]",
      },
    };

    const current = config[value] || {
      label: value || "",
      className: "border-[#DDD1CA] bg-[#F3EEEA] text-[#6B574F]",
    };

    return (
      <span
        className={
          "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap " +
          current.className
        }
      >
        {current.label}
      </span>
    );
  }

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

  if (type === "password") {
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

  return (
    <span className="inline-flex items-center rounded-full border border-[#DDD1CA] bg-[#F3EEEA] px-3 py-1 text-sm font-semibold text-[#6B574F]">
      {String(value ?? "")}
    </span>
  );
}