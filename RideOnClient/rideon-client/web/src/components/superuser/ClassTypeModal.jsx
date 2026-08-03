import { useEffect, useState } from "react";
import FormModal from "../common/form/FormModal";
import FormField from "../common/form/FormField";
import TextInput from "../common/form/TextInput";
import Select from "../common/form/Select";
import Textarea from "../common/form/Textarea";

export default function ClassTypeModal(props) {
  const [fieldId, setFieldId] = useState("");
  const [className, setClassName] = useState("");
  const [judgingSheetFormat, setJudgingSheetFormat] = useState("");
  const [qualificationDescription, setQualificationDescription] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setFieldId(props.initialValue?.fieldId?.toString() || "");
    setClassName(props.initialValue?.className || "");
    setJudgingSheetFormat(props.initialValue?.judgingSheetFormat || "");
    setQualificationDescription(props.initialValue?.qualificationDescription || "");
  }, [props.isOpen, props.initialValue]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      classTypeId: props.initialValue?.classTypeId || 0,
      fieldId: Number(fieldId),
      className: className.trim(),
      judgingSheetFormat: judgingSheetFormat.trim(),
      qualificationDescription: qualificationDescription.trim(),
    });
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title={props.initialValue ? "עריכת סוג מקצה" : "הוספת סוג מקצה"}
      error={props.error}
      maxWidthClassName="max-w-2xl"
    >
      <div className="space-y-5">
        <FormField label="ענף" required>
          <Select
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value)}
            required
          >
            <option value="">בחרי ענף</option>
            {(props.fields || []).map(function (field) {
              return (
                <option key={field.fieldId} value={field.fieldId}>
                  {field.fieldName}
                </option>
              );
            })}
          </Select>
        </FormField>

        <FormField label="שם סוג מקצה" required>
          <TextInput
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            required
          />
        </FormField>

        <FormField label="פורמט דף שיפוט">
          <TextInput
            type="text"
            value={judgingSheetFormat}
            onChange={(e) => setJudgingSheetFormat(e.target.value)}
          />
        </FormField>

        <FormField label="תיאור והכשרה">
          <Textarea
            value={qualificationDescription}
            onChange={(e) => setQualificationDescription(e.target.value)}
            rows="4"
          />
        </FormField>
      </div>
    </FormModal>
  );
}
