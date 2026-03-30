function validateLoginForm(username, password) {
  if (!username.trim()) {
    return "יש למלא שם משתמש";
  }

  if (!password) {
    return "יש למלא סיסמה";
  }

  return null;
}

export { validateLoginForm };