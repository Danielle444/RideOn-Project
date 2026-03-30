function getPasswordValidationMessage(password) {
  if (!password) {
    return "יש למלא סיסמה";
  }

  if (password.length < 8) {
    return "הסיסמה חייבת להכיל לפחות 8 תווים";
  }

  if (/\s/.test(password)) {
    return "הסיסמה לא יכולה להכיל רווחים";
  }

  if (!/[A-Z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות אנגלית גדולה אחת";
  }

  if (!/[a-z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות אנגלית קטנה אחת";
  }

  if (!/\d/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות ספרה אחת";
  }

  return null;
}

export { getPasswordValidationMessage };