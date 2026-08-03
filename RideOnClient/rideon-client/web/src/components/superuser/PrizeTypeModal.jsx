import { useEffect, useState } from "react";
import FormModal from "../common/form/FormModal";
import FormField from "../common/form/FormField";
import TextInput from "../common/form/TextInput";
import Textarea from "../common/form/Textarea";

export default function PrizeTypeModal(props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setName(props.initialValue?.prizeTypeName || "");
    setDescription(props.initialValue?.prizeDescription || "");
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      prizeTypeId: props.initialValue?.prizeTypeId || 0,
      prizeTypeName: name.trim(),
      prizeDescription: description.trim(),
    });
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title={props.initialValue ? "עריכת פרס" : "הוספת פרס"}
      error={props.error}
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-5">
        <FormField label="שם פרס" required>
          <TextInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>

        <FormField label="תיאור">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
          />
        </FormField>
      </div>
    </FormModal>
  );
}
