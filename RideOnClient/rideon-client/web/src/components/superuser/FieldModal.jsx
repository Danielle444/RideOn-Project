import { useEffect, useState } from "react";
import FormModal from "../common/form/FormModal";
import FormField from "../common/form/FormField";
import TextInput from "../common/form/TextInput";

export default function FieldModal(props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (props.isOpen) {
      setName(props.initialValue || "");
    }
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      fieldId: props.initialItem?.fieldId || 0,
      fieldName: name.trim(),
    });
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title={props.isEdit ? "עריכת ענף" : "הוספת ענף"}
      error={props.error}
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-5">
        <FormField label="שם ענף" required>
          <TextInput
            type="text"
            value={name}
            onChange={function (e) {
              setName(e.target.value);
            }}
            placeholder="שם ענף"
            required
          />
        </FormField>
      </div>
    </FormModal>
  );
}
