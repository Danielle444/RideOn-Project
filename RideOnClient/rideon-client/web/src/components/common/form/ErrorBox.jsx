export default function ErrorBox(props) {
  if (!props.children) {
    return null;
  }

  return (
    <div
      className={
        "rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848] " +
        (props.className || "")
      }
    >
      {props.children}
    </div>
  );
}
