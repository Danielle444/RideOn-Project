export default function Select(props) {
  const { className, heightClassName, children, ...rest } = props;

  return (
    <select
      {...rest}
      className={
        (heightClassName || "h-12") +
        " w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7] " +
        (className || "")
      }
    >
      {children}
    </select>
  );
}
