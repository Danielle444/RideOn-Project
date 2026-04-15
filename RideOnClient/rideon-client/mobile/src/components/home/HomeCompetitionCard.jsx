import { Alert, Text, TouchableOpacity, View } from "react-native";
import homeScreenStyles from "../../styles/homeScreenStyles";
import { formatCompetitionDateRange } from "../../../../shared/auth/utils/competitions/competitionFormatters";
import { getCompetitionStatusVariant } from "../../../../shared/auth/utils/competitions/competitionStatus";

function getStatusStyle(variant) {
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

function ActionButton(props) {
  var isDisabled = !!props.disabled;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={isDisabled}
      onPress={props.onPress}
      style={[
        homeScreenStyles.actionButton,
        isDisabled
          ? homeScreenStyles.disabledActionButton
          : props.variant === "secondary"
            ? homeScreenStyles.secondaryActionButton
            : homeScreenStyles.primaryActionButton,
      ]}
    >
      <Text
        style={
          isDisabled
            ? homeScreenStyles.disabledActionText
            : props.variant === "secondary"
              ? homeScreenStyles.secondaryActionText
              : homeScreenStyles.primaryActionText
        }
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeCompetitionCard(props) {
  var item = props.item;
  var statusVariant = getCompetitionStatusVariant(item.competitionStatus);
  var statusStyle = getStatusStyle(statusVariant);

  return (
    <View style={homeScreenStyles.competitionCard}>
      <View style={homeScreenStyles.competitionTopRow}>
        <View
          style={[
            homeScreenStyles.statusBadgeBase,
            { backgroundColor: statusStyle.backgroundColor },
          ]}
        >
          <Text
            style={[
              homeScreenStyles.statusText,
              { color: statusStyle.color },
            ]}
          >
            {item.competitionStatus || ""}
          </Text>
        </View>

        <View style={homeScreenStyles.competitionTitleWrap}>
          <Text style={homeScreenStyles.competitionTitle}>
            {item.competitionName}
          </Text>
          <Text style={homeScreenStyles.competitionMeta}>
            {formatCompetitionDateRange(
              item.competitionStartDate,
              item.competitionEndDate,
            )}
          </Text>
          <Text style={homeScreenStyles.competitionMeta}>
            {props.ranchName || ""}
          </Text>
        </View>
      </View>

      <View style={homeScreenStyles.competitionButtonsRow}>
        {props.actions.map(function (action) {
          return (
            <ActionButton
              key={action.key}
              label={action.label}
              onPress={action.onPress}
              disabled={action.disabled}
              variant={action.variant}
            />
          );
        })}
      </View>
    </View>
  );
}