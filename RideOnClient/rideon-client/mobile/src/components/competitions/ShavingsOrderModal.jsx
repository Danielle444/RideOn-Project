import React from "react";

import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useUser } from "../../context/UserContext";
import { useActiveRole } from "../../context/ActiveRoleContext";
import { useCompetition } from "../../context/CompetitionContext";

import useAdminCompetitionShavings from "../../hooks/useAdminCompetitionShavings";

import CompetitionShavingsTab from "../competitionRegistrations/CompetitionShavingsTab";

import styles from "../../styles/adminCompetitionStallsStyles";

export default function ShavingsOrderModal(props) {
  var userContext = useUser();
  var activeRoleContext = useActiveRole();
  var competitionContext = useCompetition();

  var user = userContext.user;
  var activeRole = activeRoleContext.activeRole;
  var activeCompetition = competitionContext.activeCompetition;

  var competitionId =
    props.competitionId || activeCompetition?.competitionId || null;

  var shavings = useAdminCompetitionShavings({
    user: user,
    activeRole: activeRole,
    competitionId: competitionId,
    isActiveTab: props.visible,
    initialStallBookingId: props.initialStallBookingId,
  });

  async function handleSubmit() {
    var success = await shavings.handleCreateShavingsOrder();

    if (!success) {
      return;
    }

    if (typeof props.onCreated === "function") {
      await props.onCreated();
    }

    if (typeof props.onClose === "function") {
      props.onClose();
    }
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.shavingsModalContainer}>
        <View style={styles.shavingsModalHeader}>
          <Pressable
            onPress={props.onClose}
            style={styles.shavingsModalCloseButton}
          >
            <Ionicons name="close-outline" size={28} color="#4F3B31" />
          </Pressable>

          <Text style={styles.shavingsModalTitle}>הוספת הזמנת נסורת</Text>

          <View style={styles.shavingsModalHeaderSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.shavingsModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CompetitionShavingsTab
            loading={shavings.loading}
            screenError={shavings.screenError}
            availableStalls={shavings.availableStalls}
            existingOrders={shavings.existingOrders}
            priceCatalogItems={shavings.priceCatalogItems}
            selectedPriceCatalog={shavings.selectedPriceCatalog}
            setSelectedPriceCatalog={shavings.setSelectedPriceCatalog}
            deliveryMode={shavings.deliveryMode}
            setDeliveryMode={shavings.setDeliveryMode}
            deliveryDate={shavings.deliveryDate}
            setDeliveryDate={shavings.setDeliveryDate}
            deliveryTime={shavings.deliveryTime}
            setDeliveryTime={shavings.setDeliveryTime}
            quantityMode={shavings.quantityMode}
            setQuantityMode={shavings.setQuantityMode}
            equalBagQuantity={shavings.equalBagQuantity}
            setEqualBagQuantity={shavings.setEqualBagQuantity}
            selectedStalls={shavings.selectedStalls}
            selectedStallIds={shavings.selectedStallIds}
            toggleStallSelection={shavings.toggleStallSelection}
            setStallBagQuantity={shavings.setStallBagQuantity}
            notes={shavings.notes}
            setNotes={shavings.setNotes}
            totalBags={shavings.totalBags}
            totalPrice={shavings.totalPrice}
            getStallPrice={shavings.getStallPrice}
            isSaving={shavings.isSaving}
            onSubmit={handleSubmit}
            formatStallLabel={shavings.formatStallLabel}
            formatPriceCatalogLabel={shavings.formatPriceCatalogLabel}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}