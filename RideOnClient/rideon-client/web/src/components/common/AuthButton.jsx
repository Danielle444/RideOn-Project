import { authTheme } from "../../../../shared/auth/theme/authTheme";

const { palette, radius } = authTheme;

export default function AuthButton(props) {
  const {
    variant,
    style,
    className,
    children,
    fullWidth = true,
    onMouseEnter,
    onMouseLeave,
    ...rest
  } = props;
  const isOutline = variant === "outline";

  const baseStyle = {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    fontWeight: 700,
    borderColor: palette.primary,
  };

  const solidStyle = {
    backgroundColor: palette.primary,
    color: palette.onPrimary,
  };

  const outlineStyle = {
    backgroundColor: "transparent",
    color: palette.primary,
  };

  const computedStyle = {
    ...baseStyle,
    ...(isOutline ? outlineStyle : solidStyle),
    ...style,
  };

  function handleMouseEnter(event) {
    if (!rest.disabled) {
      if (isOutline) {
        event.currentTarget.style.backgroundColor = palette.background;
        event.currentTarget.style.borderColor = palette.primaryHover;
        event.currentTarget.style.color = palette.primaryHover;
      } else {
        event.currentTarget.style.backgroundColor = palette.primaryHover;
        event.currentTarget.style.borderColor = palette.primaryHover;
      }
    }

    if (onMouseEnter) {
      onMouseEnter(event);
    }
  }

  function handleMouseLeave(event) {
    if (!rest.disabled) {
      event.currentTarget.style.backgroundColor = isOutline
        ? "transparent"
        : palette.primary;
      event.currentTarget.style.borderColor = palette.primary;
      event.currentTarget.style.color = isOutline
        ? palette.primary
        : palette.onPrimary;
    }

    if (onMouseLeave) {
      onMouseLeave(event);
    }
  }

  return (
    <button
      {...rest}
      type={rest.type || "button"}
      disabled={rest.disabled}
      className={
        (fullWidth ? "w-full " : "") +
        "py-2.5 px-4 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
        (className || "")
      }
      style={computedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
