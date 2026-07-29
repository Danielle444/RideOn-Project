// Maps a competition status variant (from shared getCompetitionStatusVariant)
// to the badge colors. Same palette the board and home cards use in their own
// local getStatusStyle helpers.
export default function getCompetitionStatusBadgeStyle(variant) {
  if (variant === "now") {
    return {
      backgroundColor: "#DDEEDB",
      color: "#2E7D32",
    };
  }

  if (variant === "open") {
    return {
      backgroundColor: "#DDEBFA",
      color: "#1976D2",
    };
  }

  if (variant === "future") {
    return {
      backgroundColor: "#FBEACF",
      color: "#F57C00",
    };
  }

  if (variant === "past") {
    return {
      backgroundColor: "#EFEFEF",
      color: "#7A7A7A",
    };
  }

  if (variant === "draft") {
    return {
      backgroundColor: "#EFEFEF",
      color: "#7A7A7A",
    };
  }

  return {
    backgroundColor: "#F3ECE8",
    color: "#6D4C41",
  };
}
