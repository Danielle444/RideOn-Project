export default function Textarea(props) {
  const { className, ...rest } = props;

  return (
    <textarea
      {...rest}
      className={
        "w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-3 text-[#3F312B] shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D2B7A7] " +
        (className || "")
      }
    />
  );
}
