import { Loader2, X } from "lucide-react";
import ErrorBox from "./ErrorBox";

export default function FormModal(props) {
  if (!props.isOpen) {
    return null;
  }

  const shellClassName =
    "w-full " +
    (props.maxWidthClassName || "max-w-xl") +
    " rounded-[28px] border border-[#E6DCD5] bg-white shadow-lg overflow-hidden" +
    (props.scrollableBody ? " flex max-h-[90vh] flex-col" : "");

  const formClassName = props.scrollableBody
    ? "overflow-y-auto px-6 py-6"
    : "px-6 py-6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className={shellClassName}>
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">{props.title}</h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] hover:bg-[#F6F1EE] transition-colors"
            title="סגירה"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={props.onSubmit} className={formClassName}>
          {props.children}

          {props.error ? (
            <ErrorBox className="mt-5">{props.error}</ErrorBox>
          ) : null}

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D8CBC3] bg-white px-5 py-2.5 font-semibold text-[#5D4037] hover:bg-[#F8F5F2] transition-colors"
            >
              {props.cancelLabel || "ביטול"}
            </button>

            <button
              type="submit"
              disabled={props.isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#7A5547] disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
            >
              {props.isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {props.submitLabel || "שמירה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
