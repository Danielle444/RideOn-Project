export default function ConfirmDialog(props) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E6DCD5] shadow-lg p-6">
        <h3 className="text-xl font-bold text-[#3F312B] text-center">{props.title}</h3>

        <p className="mt-4 text-center text-[#6E5A52] leading-7">{props.message}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            className="px-5 py-2.5 rounded-2xl border border-[#D8CBC3] text-[#5D4037] bg-white hover:bg-[#F8F5F2] transition-colors"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={props.onConfirm}
            className="px-5 py-2.5 rounded-2xl bg-[#8B6352] text-white hover:bg-[#7A5547] transition-colors"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}