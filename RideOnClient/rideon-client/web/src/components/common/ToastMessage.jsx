import { CheckCircle2, AlertCircle, X } from "lucide-react";

export default function ToastMessage(props) {
  if (!props.isOpen) {
    return null;
  }

  const isError = props.type === "error";

  return (
    <div className="fixed top-5 left-1/2 z-[60] -translate-x-1/2 px-4">
      <div
        className={
          "min-w-[320px] max-w-[520px] rounded-2xl border shadow-lg px-4 py-3 flex items-start gap-3 " +
          (isError
            ? "border-[#E7BABA] bg-[#FDF4F4] text-[#A54848]"
            : "border-[#B9D9C0] bg-[#F4FBF5] text-[#2F6B3B]")
        }
      >
        <div className="pt-0.5">
          {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
        </div>

        <div className="flex-1 text-sm font-medium leading-6">
          {props.message}
        </div>

        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full p-1 hover:bg-black/5 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}