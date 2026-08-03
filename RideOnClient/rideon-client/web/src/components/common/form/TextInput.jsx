export default function TextInput(props) {
  const { className, heightClassName, ...rest } = props;

  return (
    <input
      {...rest}
      className={
        (heightClassName || "h-12") +
        " w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm placeholder:text-[#A08D84] focus:outline-none focus:ring-2 focus:ring-[#D2B7A7] " +
        (className || "")
      }
    />
  );
}
