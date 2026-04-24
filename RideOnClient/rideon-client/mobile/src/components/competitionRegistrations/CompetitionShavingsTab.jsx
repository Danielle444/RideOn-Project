import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import styles from "../../styles/adminCompetitionRegistrationsStyles";

function SectionButton(props) {
  return (
    <Pressable
      style={[
        styles.optionButton,
        props.active ? styles.optionButtonActive : null,
      ]}
      onPress={props.onPress}
    >
      <Text
        style={[
          styles.optionButtonText,
          props.active ? styles.optionButtonTextActive : null,
        ]}
      >
        {props.children}
      </Text>
    </Pressable>
  );
}

export default function CompetitionShavingsTab(props) {
  if (props.loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>טוען נתוני נסורת...</Text>
      </View>
    );
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>הזמנת נסורת</Text>

      {props.screenError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{props.screenError}</Text>
        </View>
      ) : null}

      <View style={styles.dropdownBlock}>
        <Text style={styles.fieldLabel}>מחיר נסורת</Text>

        {props.priceCatalogItems.length === 0 ? (
          <Text style={styles.helperText}>לא נמצא מחיר פעיל לנסורת</Text>
        ) : null}

        {props.priceCatalogItems.map(function (item) {
          var active =
            props.selectedPriceCatalog &&
            props.selectedPriceCatalog.priceCatalogId === item.priceCatalogId;

          return (
            <Pressable
              key={String(item.priceCatalogId)}
              style={[
                styles.selectableRow,
                active ? styles.selectableRowActive : null,
              ]}
              onPress={function () {
                props.setSelectedPriceCatalog(item);
              }}
            >
              <Text style={styles.selectableRowText}>
                {props.formatPriceCatalogLabel(item)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.dropdownBlock}>
        <Text style={styles.fieldLabel}>מועד אספקה</Text>

        <View style={styles.twoButtonsRow}>
          <SectionButton
            active={props.deliveryMode === "now"}
            onPress={function () {
              props.setDeliveryMode("now");
            }}
          >
            אספקה כעת
          </SectionButton>

          <SectionButton
            active={props.deliveryMode === "later"}
            onPress={function () {
              props.setDeliveryMode("later");
            }}
          >
            אספקה במועד מאוחר יותר
          </SectionButton>
        </View>

        {props.deliveryMode === "later" ? (
          <View style={styles.twoInputsRow}>
            <TextInput
              style={styles.textInput}
              value={props.deliveryDate}
              onChangeText={props.setDeliveryDate}
              placeholder="YYYY-MM-DD"
              textAlign="right"
            />

            <TextInput
              style={styles.textInput}
              value={props.deliveryTime}
              onChangeText={props.setDeliveryTime}
              placeholder="HH:MM"
              textAlign="right"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.dropdownBlock}>
        <Text style={styles.fieldLabel}>בחר סוסים</Text>

        {props.availableStalls.length === 0 ? (
          <Text style={styles.helperText}>
            לא נמצאו סוסים עם תאי סוסים מוזמנים לתחרות הזו.
          </Text>
        ) : null}

        <View style={styles.limitedListBox}>
          <ScrollView nestedScrollEnabled={true}>
            {props.availableStalls.map(function (stall) {
              var selected = props.selectedStallIds.includes(
                stall.stallBookingId,
              );

              return (
                <Pressable
                  key={String(stall.stallBookingId)}
                  style={[
                    styles.selectableRow,
                    selected ? styles.selectableRowActive : null,
                  ]}
                  onPress={function () {
                    props.toggleStallSelection(stall);
                  }}
                >
                  <Text style={styles.selectableRowText}>
                    {selected ? "✓ " : ""}
                    {props.formatStallLabel(stall)}
                  </Text>

                  {stall.payerNames ? (
                    <Text style={styles.helperText}>
                      משלמים: {stall.payerNames}
                    </Text>
                  ) : (
                    <Text style={styles.helperText}>
                      לא נמצאו משלמים להזמנת התא
                    </Text>
                  )}

                  {selected ? (
                    <Text style={styles.helperText}>
                      עלות לתא זה: {props.getStallPrice(stall.stallBookingId)} ₪
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.dropdownBlock}>
        <Text style={styles.fieldLabel}>אופן חלוקה</Text>

        <View style={styles.twoButtonsRow}>
          <SectionButton
            active={props.quantityMode === "equal"}
            onPress={function () {
              props.setQuantityMode("equal");
            }}
          >
            כמות שווה לכל סוס
          </SectionButton>

          <SectionButton
            active={props.quantityMode === "custom"}
            onPress={function () {
              props.setQuantityMode("custom");
            }}
          >
            כמות שונה לכל סוס
          </SectionButton>
        </View>
      </View>

      {props.quantityMode === "equal" ? (
        <View style={styles.dropdownBlock}>
          <Text style={styles.fieldLabel}>שקים לסוס</Text>
          <TextInput
            style={styles.textInput}
            value={props.equalBagQuantity}
            onChangeText={props.setEqualBagQuantity}
            placeholder="לדוגמה: 4"
            keyboardType="numeric"
            textAlign="right"
          />
        </View>
      ) : null}

      {props.quantityMode === "custom" ? (
        <View style={styles.dropdownBlock}>
          <Text style={styles.fieldLabel}>כמות לפי סוס</Text>

          {props.selectedStalls.map(function (item) {
            return (
              <View
                key={String(item.stallBookingId)}
                style={styles.quantityRow}
              >
                <View style={styles.quantityDetails}>
                  <Text style={styles.quantityHorseName}>{item.horseName}</Text>

                  {item.payerNames ? (
                    <Text style={styles.helperText}>
                      משלמים: {item.payerNames}
                    </Text>
                  ) : null}

                  <Text style={styles.helperText}>
                    עלות לתא זה: {props.getStallPrice(item.stallBookingId)} ₪
                  </Text>
                </View>

                <TextInput
                  style={styles.quantityInput}
                  value={String(item.bagQuantity || "")}
                  onChangeText={function (value) {
                    props.setStallBagQuantity(item.stallBookingId, value);
                  }}
                  placeholder="כמות"
                  keyboardType="numeric"
                  textAlign="right"
                />
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.dropdownBlock}>
        <Text style={styles.fieldLabel}>הערות</Text>
        <TextInput
          style={styles.textInput}
          value={props.notes}
          onChangeText={props.setNotes}
          placeholder="הערות להזמנה"
          textAlign="right"
        />
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>סה״כ שקים: {props.totalBags}</Text>
        <Text style={styles.summaryText}>סה״כ מחיר: {props.totalPrice} ₪</Text>
        <Text style={styles.helperText}>
          החיוב יתבצע לפי המשלמים של הזמנת התא הספציפית.
        </Text>
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          props.isSaving ? styles.primaryButtonDisabled : null,
        ]}
        disabled={props.isSaving}
        onPress={props.onSubmit}
      >
        <Text style={styles.primaryButtonText}>
          {props.isSaving ? "שומר..." : "שליחת הזמנת נסורת"}
        </Text>
      </Pressable>
    </View>
  );
}
