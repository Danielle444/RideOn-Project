import FormModal from "../../common/form/FormModal";
import FormField from "../../common/form/FormField";
import Textarea from "../../common/form/Textarea";

// Reuses the existing FormModal/FormField/Textarea shell (same pieces
// FineModal.jsx builds on) rather than introducing a new modal/notification
// system, per the locked rejection-workflow UX rules.
export default function HealthCertificateRejectModal(props) {
  if (!props.isOpen) {
    return null;
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      title="דחיית תעודת בריאות"
      error={props.error}
      isSaving={props.isSaving}
      submitLabel={props.isSaving ? "דוחה..." : "דחיית תעודה"}
      cancelLabel="ביטול"
    >
      <div className="space-y-5">
        <p className="text-sm text-[#6E5A52]">
          {props.horseName
            ? `דחיית תעודת הבריאות של ${props.horseName}. יש לציין סיבת דחייה - הרישום יעודכן והאדמין יידרש להעלות תעודה חלופית.`
            : "יש לציין סיבת דחייה - הרישום יעודכן והאדמין יידרש להעלות תעודה חלופית."}
        </p>

        <FormField label="סיבת דחייה" required>
          <Textarea
            rows={4}
            value={props.reason}
            onChange={function (event) {
              props.onReasonChange(event.target.value);
            }}
            placeholder="לדוגמה: התעודה לא קריאה / פג תוקף"
          />
        </FormField>
      </div>
    </FormModal>
  );
}
