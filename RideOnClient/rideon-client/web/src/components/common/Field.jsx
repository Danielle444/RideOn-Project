export default function Field(props) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#4E342E] mb-1.5 text-right">
        {props.label}
        {props.required && <span className="text-red-500 mr-0.5">*</span>}
      </label>
      {props.children}
    </div>
  );
}