import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/adminCompetitionRegistrationsStyles";

var SEARCH_DEBOUNCE_MS = 300;

function getSafeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function buildRenderKey(props, item, index) {
  var explicitKey = null;

  if (typeof props.getItemKey === "function") {
    explicitKey = props.getItemKey(item);
  }

  if (explicitKey !== null && explicitKey !== undefined && explicitKey !== "") {
    return String(explicitKey);
  }

  var itemId = null;

  if (typeof props.getItemId === "function") {
    itemId = props.getItemId(item);
  }

  var labelText = "";
  if (typeof props.getItemLabel === "function") {
    labelText = getSafeText(props.getItemLabel(item));
  }

  var blockLabel = getSafeText(props.label || "dropdown");

  if (itemId !== null && itemId !== undefined && itemId !== "") {
    return blockLabel + "-id-" + String(itemId) + "-idx-" + String(index);
  }

  return (
    blockLabel +
    "-label-" +
    labelText +
    "-idx-" +
    String(index)
  );
}

export default function CompetitionRegistrationDropdown(props) {
  var [isOpen, setIsOpen] = useState(false);
  var [searchText, setSearchText] = useState("");

  var items = Array.isArray(props.items) ? props.items : [];
  var selectedItem = props.selectedItem || null;
  var disabled = !!props.disabled;
  var isLocked = !!props.isLocked;

  // Opt-in server-side search mode. Pickers that preload a small list leave
  // onSearch undefined and keep the original local-filter behaviour; the horse
  // picker passes it so the list is fetched on open and on every debounced
  // keystroke instead of preloading the whole ranch horse table.
  var onSearch = props.onSearch;
  var isAsyncSearch = typeof onSearch === "function";
  var isLoading = !!props.isLoading;

  useEffect(
    function () {
      if (!isAsyncSearch || !isOpen) {
        return;
      }

      var trimmedSearch = getSafeText(searchText);

      if (!trimmedSearch) {
        // Opening the picker (or clearing the box) fetches the bounded default
        // list straight away — the list must never look empty on open.
        onSearch("");
        return;
      }

      var timeoutId = setTimeout(function () {
        onSearch(trimmedSearch);
      }, SEARCH_DEBOUNCE_MS);

      return function () {
        clearTimeout(timeoutId);
      };
    },
    // onSearch is deliberately out of the dependency list: call sites may pass
    // an inline lambda, and re-firing on every parent render would defeat the
    // debounce.
    [isAsyncSearch, isOpen, searchText],
  );

  var filteredItems = useMemo(
    function () {
      // In server-search mode the results are already filtered by the search
      // argument, so filtering again locally would drop legitimate matches
      // (e.g. a hit on federation number, which is not part of the label).
      var normalizedSearch = isAsyncSearch
        ? ""
        : getSafeText(searchText).toLowerCase();

      return items
        .map(function (item, index) {
          var label = "";

          try {
            label = getSafeText(props.getItemLabel(item));
          } catch (error) {
            label = "";
          }

          var isItemDisabled =
            typeof props.getItemDisabled === "function" &&
            !!props.getItemDisabled(item);

          var disabledLabel = isItemDisabled
            ? getSafeText(
                typeof props.getItemDisabledLabel === "function"
                  ? props.getItemDisabledLabel(item)
                  : "",
              )
            : "";

          return {
            item: item,
            label: label,
            isDisabled: isItemDisabled,
            disabledLabel: disabledLabel,
            renderKey: buildRenderKey(props, item, index),
          };
        })
        .filter(function (entry) {
          if (!normalizedSearch) {
            return true;
          }

          return entry.label.toLowerCase().includes(normalizedSearch);
        });
    },
    [
      items,
      searchText,
      isAsyncSearch,
      props.getItemLabel,
      props.getItemId,
      props.getItemKey,
      props.label,
      props.getItemDisabled,
      props.getItemDisabledLabel,
    ],
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

    return getSafeText(props.getItemLabel(selectedItem) || props.placeholder || "");
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
            {isLoading && filteredItems.length === 0 ? (
              <View style={styles.dropdownEmptyWrap}>
                <ActivityIndicator size="small" color="#7B5A4D" />
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.dropdownEmptyWrap}>
                <Text style={styles.dropdownEmptyText}>לא נמצאו תוצאות</Text>
              </View>
            ) : (
              filteredItems.map(function (entry) {
                return (
                  <Pressable
                    key={entry.renderKey}
                    style={[
                      styles.dropdownItem,
                      entry.isDisabled ? styles.dropdownItemDisabled : null,
                    ]}
                    disabled={entry.isDisabled}
                    onPress={function () {
                      if (entry.isDisabled) {
                        return;
                      }

                      handleSelect(entry.item);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        entry.isDisabled ? styles.dropdownItemTextDisabled : null,
                      ]}
                    >
                      {entry.label}
                    </Text>

                    {entry.isDisabled && entry.disabledLabel ? (
                      <Text style={styles.dropdownItemBadgeText}>
                        {entry.disabledLabel}
                      </Text>
                    ) : null}
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