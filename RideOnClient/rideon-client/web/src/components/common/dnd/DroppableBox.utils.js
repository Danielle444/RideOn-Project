export function getActiveOverClassName(state) {
  const { isOver, disabled, blocked, overClassName, blockedOverClassName } =
    state;

  if (!isOver || disabled) return "";

  return blocked ? blockedOverClassName || "" : overClassName || "";
}
