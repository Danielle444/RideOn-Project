import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function FieldModal(props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (props.isOpen) {
      setName(props.initialValue || "");
    }
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      fieldId: props.initialItem?.fieldId || 0,
      fieldName: name.trim(),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#3F312B]">
            {props.isEdit ? "עריכת ענף" : "הוספת ענף"}
          </h2>

          <button onClick={props.onClose}>
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={function (e) {
              setName(e.target.value);
            }}
            className="w-full h-12 border rounded-xl px-4"
            placeholder="שם ענף"
            required
          />

          {props.error && (
            <p className="text-red-500 text-sm mt-2">{props.error}</p>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={props.onClose}
              className="border px-4 py-2 rounded-xl"
            >
              ביטול
            </button>

            <button className="bg-[#8B6352] text-white px-4 py-2 rounded-xl">
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
