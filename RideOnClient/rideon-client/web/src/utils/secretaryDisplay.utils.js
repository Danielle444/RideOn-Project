export function getSecretaryDisplayName(user) {
  const fullNameFromParts = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    user?.fullName ||
    fullNameFromParts ||
    user?.username ||
    user?.userName ||
    "משתמשת"
  );
}