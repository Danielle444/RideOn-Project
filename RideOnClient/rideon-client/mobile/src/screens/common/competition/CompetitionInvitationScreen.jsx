import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import MobileScreenLayout from "../../../components/mobile-nav/MobileScreenLayout";
import SideMenuTemplate from "../../../components/mobile-nav/SideMenuTemplate";

import CompetitionInfoSection from "../../../components/competitions/CompetitionInfoSection";
import CompetitionDatesSection from "../../../components/competitions/CompetitionDatesSection";
import CompetitionJudgesSection from "../../../components/competitions/CompetitionJudgesSection";
import CompetitionClassesSection from "../../../components/competitions/CompetitionClassesSection";
import CompetitionPaidTimeSection from "../../../components/competitions/CompetitionPaidTimeSection";
import CompetitionServicesSection from "../../../components/competitions/CompetitionServicesSection";
import CompetitionRegisterButton from "../../../components/competitions/CompetitionRegisterButton";

import competitionInvitationStyles from "../../../styles/competitionInvitationStyles";

import { useUser } from "../../../context/UserContext";
import { useActiveRole } from "../../../context/ActiveRoleContext";
import { useCompetition } from "../../../context/CompetitionContext";

import {
  getAdminBottomNavConfig,
  getPayerBottomNavConfig,
} from "../../../navigation/bottomNavConfigs";

import {
  getAdminMenuItems,
  getPayerMenuItems,
} from "../../../navigation/sideMenuConfigs";

import { getCompetitionInvitationDetails } from "../../../services/competitionService";

function formatWeekdayWithDate(value) {
  if (!value) {
    return "—";
  }

  try {
    var date = new Date(value);

    var weekday = date.toLocaleDateString("he-IL", {
      weekday: "long",
    });

    var shortDate = date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
    });

    return weekday + " " + shortDate;
  } catch (error) {
    return String(value);
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  try {
    var date = new Date(value);

    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return String(value);
  }
}

function formatDateKey(value) {
  if (!value) {
    return "unknown";
  }

  try {
    var date = new Date(value);
    return date.toISOString().slice(0, 10);
  } catch (error) {
    return String(value);
  }
}

function buildDateGroups(items, getDateValue, sortFunction) {
  var sourceItems = Array.isArray(items) ? items.slice() : [];

  if (typeof sortFunction === "function") {
    sourceItems.sort(sortFunction);
  }

  var groupsMap = {};

  sourceItems.forEach(function (item) {
    var rawDate = getDateValue(item);
    var key = formatDateKey(rawDate);

    if (!groupsMap[key]) {
      groupsMap[key] = {
        key: key,
        label: formatWeekdayWithDate(rawDate),
        items: [],
      };
    }

    groupsMap[key].items.push(item);
  });

  return Object.keys(groupsMap)
    .sort()
    .map(function (key) {
      return groupsMap[key];
    });
}

function sortClasses(a, b) {
  var dateA = a?.classDateTime ? new Date(a.classDateTime).getTime() : 0;
  var dateB = b?.classDateTime ? new Date(b.classDateTime).getTime() : 0;

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  var orderA = a?.orderInDay || 0;
  var orderB = b?.orderInDay || 0;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  var startA = String(a?.startTime || "");
  var startB = String(b?.startTime || "");

  return startA.localeCompare(startB);
}

function sortPaidTimeSlots(a, b) {
  var dateA = a?.slotDate ? new Date(a.slotDate).getTime() : 0;
  var dateB = b?.slotDate ? new Date(b.slotDate).getTime() : 0;

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  var startA = String(a?.startTime || "");
  var startB = String(b?.startTime || "");

  return startA.localeCompare(startB);
}

export default function CompetitionInvitationScreen(props) {
  var competitionContext = useCompetition();

  var competitionId =
    props.route?.params?.competitionId ||
    competitionContext?.activeCompetition?.competitionId;

  var competitionNameParam =
    props.route?.params?.competitionName ||
    competitionContext?.activeCompetition?.competitionName;

  var userContext = useUser();
  var activeRoleContext = useActiveRole();

  var user = userContext?.user;
  var activeRole = activeRoleContext?.activeRole;

  var [details, setDetails] = useState(null);
  var [loading, setLoading] = useState(true);
  var [screenError, setScreenError] = useState("");

  var roleName = activeRole?.roleName || "";
  var isAdmin = roleName === "אדמין חווה";
  var isPayer = roleName === "משלם";

  var classGroups = useMemo(
    function () {
      return buildDateGroups(
        details?.classes,
        function (item) {
          return item?.classDateTime;
        },
        sortClasses,
      );
    },
    [details],
  );

  var paidTimeGroups = useMemo(
    function () {
      return buildDateGroups(
        details?.paidTimeSlots,
        function (item) {
          return item?.slotDate;
        },
        sortPaidTimeSlots,
      );
    },
    [details],
  );

  useEffect(
    function () {
      if (!competitionId) {
        setLoading(false);
        setScreenError("מזהה תחרות חסר");
        return;
      }

      loadInvitationDetails();
    },
    [competitionId],
  );

  function loadInvitationDetails() {
    setLoading(true);
    setScreenError("");

    getCompetitionInvitationDetails(
      competitionId,
      activeRole?.roleId,
      activeRole?.ranchId,
    )
      .then(function (response) {
        setDetails(response.data || null);
      })
      .catch(function (error) {
        console.log(
          "CompetitionInvitationScreen load error:",
          error?.response?.data || error,
        );

        setScreenError(
          String(
            error?.response?.data ||
              error?.message ||
              "אירעה שגיאה בטעינת פרטי התחרות",
          ),
        );
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function handleRegisterPress() {
    props.navigation.navigate("AdminCompetitionRegistrations", {
      competitionId: details?.competition?.competitionId || competitionId,
      competitionName:
        details?.competition?.competitionName || competitionNameParam || "",
    });
  }

  function handleLogout() {
    if (props.onLogout) {
      return props.onLogout();
    }

    return Promise.resolve();
  }

  function getBottomNavItems() {
    if (isAdmin) {
      return getAdminBottomNavConfig(props.navigation);
    }

    if (isPayer) {
      return getPayerBottomNavConfig(props.navigation);
    }

    return [];
  }

  function getMenuItems() {
    if (isAdmin) {
      return getAdminMenuItems();
    }

    if (isPayer) {
      return getPayerMenuItems();
    }

    return [];
  }

  function getActiveMenuKey() {
    return "competitions";
  }

  var fullName = (
    (user?.firstName || "") +
    " " +
    (user?.lastName || "")
  ).trim();

  return (
    <MobileScreenLayout
      title="פרטי תחרות"
      subtitle=""
      activeBottomTab="menu"
      bottomNavItems={getBottomNavItems()}
      menuContent={function ({ closeMenu }) {
        return (
          <SideMenuTemplate
            userName={fullName}
            roleName={activeRole?.roleName || ""}
            ranchName={activeRole?.ranchName || ""}
            closeMenu={closeMenu}
            items={getMenuItems()}
            activeKey={getActiveMenuKey()}
            onItemPress={function (item) {
              props.navigation.navigate(item.screen);
            }}
            onSwitchRole={function () {
              props.navigation.replace("SelectActiveRole");
              closeMenu();
            }}
            onLogout={async function () {
              await handleLogout();
              closeMenu();
            }}
          />
        );
      }}
    >
      <ScrollView
        contentContainerStyle={competitionInvitationStyles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={competitionInvitationStyles.heroCard}>
          <Text style={competitionInvitationStyles.heroTitle}>
            {details?.competition?.competitionName ||
              competitionNameParam ||
              "פרטי תחרות"}
          </Text>

          <Text style={competitionInvitationStyles.heroSubTitle}>
            חווה מארחת: {details?.competition?.hostRanchName || "—"}
          </Text>

          <Text style={competitionInvitationStyles.heroSubTitle}>
            ענף: {details?.competition?.fieldName || "—"}
          </Text>

          <Text style={competitionInvitationStyles.heroSubTitle}>
            תאריכים: {formatDate(details?.competition?.competitionStartDate)} -{" "}
            {formatDate(details?.competition?.competitionEndDate)}
          </Text>

          {details?.competition?.competitionStatus ? (
            <View style={competitionInvitationStyles.heroStatusBadge}>
              <Text style={competitionInvitationStyles.heroStatusText}>
                {details.competition.competitionStatus}
              </Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={competitionInvitationStyles.loaderWrap}>
            <ActivityIndicator size="small" />
            <Text style={competitionInvitationStyles.loaderText}>
              טוענת את פרטי התחרות...
            </Text>
          </View>
        ) : null}

        {!loading && screenError ? (
          <View style={competitionInvitationStyles.errorCard}>
            <Text style={competitionInvitationStyles.errorText}>
              {screenError}
            </Text>
          </View>
        ) : null}

        {!loading && !screenError && details ? (
          <>
            <CompetitionInfoSection competition={details.competition} />

            <CompetitionDatesSection competition={details.competition} />

            <CompetitionJudgesSection judges={details.judges} />

            <CompetitionClassesSection groups={classGroups} />

            <CompetitionPaidTimeSection groups={paidTimeGroups} />

            <CompetitionServicesSection
              sections={details.servicePriceSections}
            />

            <CompetitionRegisterButton
              visible={isAdmin}
              onPress={handleRegisterPress}
            />
          </>
        ) : null}
      </ScrollView>
    </MobileScreenLayout>
  );
}
