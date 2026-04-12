import { Text, TouchableOpacity, View } from "react-native";
import competitionBoardStyles from "../../styles/competitionBoardStyles";
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
        competitionBoardStyles.buttonBase,
        isDisabled
          ? competitionBoardStyles.disabledButton
          : props.variant === "secondary"
            ? competitionBoardStyles.secondaryButton
            : competitionBoardStyles.primaryButton,
      ]}
    >
      <Text
        style={
          isDisabled
            ? competitionBoardStyles.disabledButtonText
            : competitionBoardStyles.primaryButtonText
        }
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CompetitionBoardCard(props) {
  var statusVariant = getCompetitionStatusVariant(props.status);
  var statusDisplay = props.status || "";
  var statusStyle = getStatusStyle(statusVariant);

  return (
    <View style={competitionBoardStyles.card}>
      <View style={competitionBoardStyles.cardTopRow}>
        <View
          style={[
            competitionBoardStyles.statusBadgeBase,
            { backgroundColor: statusStyle.backgroundColor },
          ]}
        >
          <Text
            style={[
              competitionBoardStyles.statusText,
              { color: statusStyle.color },
            ]}
          >
            {statusDisplay}
          </Text>
        </View>

        <View style={competitionBoardStyles.titleBlock}>
          <Text style={competitionBoardStyles.title}>{props.title}</Text>
          <Text style={competitionBoardStyles.secondaryText}>
            {props.dateText}
          </Text>
          <Text style={competitionBoardStyles.secondaryText}>
            {props.ranchName}
          </Text>
        </View>
      </View>

      <View style={competitionBoardStyles.buttonsRow}>
        {Array.isArray(props.actions)
          ? props.actions.map(function (action) {
              return (
                <ActionButton
                  key={action.key}
                  label={action.label}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  variant={action.variant}
                />
              );
            })
          : null}
      </View>
    </View>
  );
}
