import { useEffect, useState } from "react";
import FormModal from "../common/form/FormModal";
import FormField from "../common/form/FormField";
import TextInput from "../common/form/TextInput";

export default function CreateSuperUserModal(props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (props.isOpen) {
      setEmail("");
      setPassword("");
    }
  }, [props.isOpen]);

  if (!props.isOpen) {
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    props.onSubmit({
      email: email.trim(),
      password,
    });
  }

  return (
    <FormModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      onSubmit={handleSubmit}
      title="יצירת משתמש מערכת"
      error={props.errorMessage}
      maxWidthClassName="max-w-lg"
      isSaving={props.loading}
      submitLabel="יצירת משתמש"
    >
      <div className="space-y-5">
        <FormField label="אימייל" required>
          <TextInput
            type="email"
            value={email}
            onChange={function (e) {
              setEmail(e.target.value);
            }}
            placeholder="admin@example.com"
            required
          />
        </FormField>

        <FormField label="סיסמה זמנית" required>
          <TextInput
            type="password"
            value={password}
            onChange={function (e) {
              setPassword(e.target.value);
            }}
            placeholder="הקלידי סיסמה זמנית"
            required
          />
          <p className="mt-2 text-sm leading-6 text-[#8A746A]">
            המשתמש החדש יידרש להחליף את הסיסמה בכניסה הראשונה.
          </p>
        </FormField>

        {props.successMessage ? (
          <div className="rounded-2xl border border-[#B9D9C0] bg-[#F4FBF5] px-4 py-3 text-sm text-[#2F6B3B]">
            {props.successMessage}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
