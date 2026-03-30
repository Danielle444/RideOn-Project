import { getPasswordValidationMessage } from "./passwordValidation";

function validateRegisterForm(form, existingSystemUserFound) {
  var nationalId = form.nationalId;
  var firstName = form.firstName;
  var lastName = form.lastName;
  var dateOfBirth = form.dateOfBirth;
  var cellPhone = form.cellPhone;
  var email = form.email;
  var username = form.username;
  var password = form.password;
  var confirmPassword = form.confirmPassword;
  var gender = form.gender;

  if (
    !nationalId ||
    !firstName ||
    !lastName ||
    !dateOfBirth ||
    !cellPhone ||
    !email ||
    !username ||
    !password ||
    !confirmPassword ||
    !gender
  ) {
    return "יש למלא את כל השדות המסומנים ב-*";
  }

  if (!/^\d{9}$/.test(nationalId)) {
    return "תעודת זהות חייבת להכיל 9 ספרות בדיוק";
  }

  var passwordValidationMessage = getPasswordValidationMessage(password);

  if (passwordValidationMessage) {
    return passwordValidationMessage;
  }

  if (password !== confirmPassword) {
    return "הסיסמאות אינן תואמות";
  }

  if (!email.includes("@")) {
    return "כתובת אימייל לא תקינה";
  }

  if (existingSystemUserFound) {
    return "לא ניתן להירשם עם תעודת זהות שכבר משויכת למשתמש קיים";
  }

  return null;
}

function validatePersonalSection(form, nationalIdChecked, existingSystemUserFound) {
  if (!form.nationalId.trim()) {
    return "יש למלא תעודת זהות";
  }

  if (!/^\d{9}$/.test(form.nationalId)) {
    return "תעודת זהות חייבת להכיל 9 ספרות בדיוק";
  }

  if (!nationalIdChecked) {
    return "יש לבצע קודם בדיקת תעודת זהות";
  }

  if (existingSystemUserFound) {
    return "לא ניתן להמשיך עם תעודת זהות שכבר משויכת למשתמש קיים";
  }

  if (!form.firstName.trim()) {
    return "יש למלא שם פרטי";
  }

  if (!form.lastName.trim()) {
    return "יש למלא שם משפחה";
  }

  if (!form.gender) {
    return "יש לבחור מגדר";
  }

  if (!form.dateOfBirth) {
    return "יש לבחור תאריך לידה";
  }

  if (!form.cellPhone.trim()) {
    return "יש למלא טלפון נייד";
  }

  if (!form.email.trim()) {
    return "יש למלא אימייל";
  }

  if (!form.email.includes("@")) {
    return "כתובת אימייל לא תקינה";
  }

  return null;
}

function validateUserSection(form) {
  if (!form.username.trim()) {
    return "יש למלא שם משתמש";
  }

  if (!form.password) {
    return "יש למלא סיסמה";
  }

  var passwordValidationMessage = getPasswordValidationMessage(form.password);

  if (passwordValidationMessage) {
    return passwordValidationMessage;
  }

  if (!form.confirmPassword) {
    return "יש למלא אימות סיסמה";
  }

  if (form.password !== form.confirmPassword) {
    return "הסיסמאות אינן תואמות";
  }

  return null;
}

export {
  validateRegisterForm,
  validatePersonalSection,
  validateUserSection
};