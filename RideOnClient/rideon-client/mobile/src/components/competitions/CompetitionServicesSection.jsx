import React from "react";
import { Text, View } from "react-native";
import competitionInvitationStyles from "../../styles/competitionInvitationStyles";
import CompetitionSectionCard from "./CompetitionSectionCard";

function formatPrice(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  try {
    return "₪" + Number(value).toLocaleString("he-IL");
  } catch (error) {
    return "₪" + String(value);
  }
}

export default function CompetitionServicesSection(props) {
  var sections = Array.isArray(props.sections) ? props.sections : [];

  return (
    <CompetitionSectionCard title="שירותים ומחירים" initialExpanded={false}>
      {sections.length === 0 ? (
        <Text style={competitionInvitationStyles.emptyText}>
          לא נמצאו שירותים לתחרות זו
        </Text>
      ) : (
        sections.map(function (section) {
          return (
            <View
              key={String(section.categoryId)}
              style={competitionInvitationStyles.serviceCategoryWrap}
            >
              <Text style={competitionInvitationStyles.serviceCategoryTitle}>
                {section.categoryName || "קטגוריה"}
              </Text>

              {(section.items || []).map(function (item) {
                return (
                  <View
                    key={String(item.productId)}
                    style={competitionInvitationStyles.serviceRow}
                  >
                    <View style={competitionInvitationStyles.serviceTextWrap}>
                      <Text style={competitionInvitationStyles.serviceName}>
                        {item.productName || "ללא שם שירות"}
                      </Text>

                      {item.durationMinutes ? (
                        <Text style={competitionInvitationStyles.serviceMeta}>
                          {item.durationMinutes} דקות
                        </Text>
                      ) : null}
                    </View>

                    <Text style={competitionInvitationStyles.servicePrice}>
                      {formatPrice(item.itemPrice)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </CompetitionSectionCard>
  );
}