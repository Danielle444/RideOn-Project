import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/adminCompetitionRegistrationsStyles";

export default function CompetitionRegistrationDropdown(props) {
  var [isOpen, setIsOpen] = useState(false);
  var [searchText, setSearchText] = useState("");

  var items = Array.isArray(props.items) ? props.items : [];
  var selectedItem = props.selectedItem || null;
  var disabled = !!props.disabled;
  var isLocked = !!props.isLocked;

  var filteredItems = useMemo(
    function () {
      var normalizedSearch = String(searchText || "").trim().toLowerCase();

      if (!normalizedSearch) {
        return items;
      }

      return items.filter(function (item) {
        var label = "";

        try {
          label = String(props.getItemLabel(item) || "");
        } catch (error) {
          label = "";
        }

        return label.toLowerCase().includes(normalizedSearch);
      });
    },
    [items, props, searchText],
  );

  function handleToggleOpen() {
    if (disabled) {
      return;
    }

    setIsOpen(function (prevValue) {
      return !prevValue;
    });
  }

  function handleSelect(item) {
    if (props.onSelect) {
      props.onSelect(item);
    }

    setSearchText("");
    setIsOpen(false);
  }

  function handleClearSelection() {
    if (disabled) {
      return;
    }

    if (props.onSelect) {
      props.onSelect(null);
    }

    setSearchText("");
  }

  function getSelectedLabel() {
    if (!selectedItem) {
      return props.placeholder || "בחרי ערך";
    }

    return String(props.getItemLabel(selectedItem) || props.placeholder || "");
  }

  return (
    <View style={styles.dropdownBlock}>
      <View style={styles.dropdownHeaderRow}>
        <Text style={styles.fieldLabel}>{props.label}</Text>

        <View style={styles.dropdownHeaderActions}>
          {selectedItem ? (
            <Pressable onPress={handleClearSelection} hitSlop={8}>
              <Text style={styles.clearText}>נקה</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={props.onToggleLock}
            hitSlop={8}
            style={styles.inlineLockIconButton}
          >
            <Ionicons
              name={isLocked ? "lock-closed-outline" : "lock-open-outline"}
              size={18}
              color="#7B5A4D"
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[
          styles.dropdownTrigger,
          disabled ? styles.dropdownTriggerDisabled : null,
          isOpen ? styles.dropdownTriggerOpen : null,
        ]}
        onPress={handleToggleOpen}
      >
        <Ionicons
          name={isOpen ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color="#6F5647"
        />

        <Text
          style={[
            styles.dropdownTriggerText,
            !selectedItem ? styles.dropdownPlaceholderText : null,
          ]}
        >
          {getSelectedLabel()}
        </Text>
      </Pressable>

      {isOpen ? (
        <View style={styles.dropdownPanel}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={props.searchPlaceholder || "חיפוש"}
            placeholderTextColor="#9E8A7F"
            style={styles.dropdownSearchInput}
            textAlign="right"
          />

          <ScrollView
            style={styles.dropdownList}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredItems.length === 0 ? (
              <View style={styles.dropdownEmptyWrap}>
                <Text style={styles.dropdownEmptyText}>לא נמצאו תוצאות</Text>
              </View>
            ) : (
              filteredItems.map(function (item) {
                var itemId = String(props.getItemId(item));

                return (
                  <Pressable
                    key={itemId}
                    style={styles.dropdownItem}
                    onPress={function () {
                      handleSelect(item);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>
                      {props.getItemLabel(item)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}