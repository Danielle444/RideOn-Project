import {
  canAdminRegisterCompetition,
  canAdminEnterCompetition,
} from "../../../../../../shared/auth/utils/competitions/competitionStatus";

async function setCompetitionAndNavigate(context, item, screen) {
  await context.competitionContext.setActiveCompetitionAndPersist({
    competitionId: item.competitionId,
    competitionName: item.competitionName,
    competitionStatus: item.competitionStatus,
    ranchId: context.activeRole.ranchId,
  });

  context.navigation.navigate(screen, {
    competitionId: item.competitionId,
    competitionName: item.competitionName,
  });
}

// context: { navigation, competitionContext, activeRole }
function buildAdminCompetitionActions(item, context) {
  return [
    {
      key: "details",
      label: "פרטי תחרות",
      onPress: function () {
        setCompetitionAndNavigate(context, item, "AdminCompetitionDetails");
      },
      disabled: false,
      variant: "secondary",
    },
    {
      key: "registration",
      label: "הרשמה",
      onPress: function () {
        setCompetitionAndNavigate(
          context,
          item,
          "AdminCompetitionRegistrations",
        );
      },
      disabled: !canAdminRegisterCompetition(item.competitionStatus),
      variant: "secondary",
    },
    {
      key: "enter",
      label: "כניסה",
      onPress: function () {
        setCompetitionAndNavigate(context, item, "AdminCompetitionPayers");
      },
      disabled: !canAdminEnterCompetition(item.competitionStatus),
      variant: "primary",
    },
  ];
}

export { buildAdminCompetitionActions };
