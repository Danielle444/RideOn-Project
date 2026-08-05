import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/competitionsFilterBarStyles";
import CompetitionDateField from "../competitionRegistrations/CompetitionDateField";
import {
  emptyFilters,
  toSafeFilters,
  toggleValueInArray,
} from "../../utils/competitionsFilterSheetState";

// CAP-1: the resting board now shows a compact "סינון ▾" button instead of
// this whole card. Tapping it opens this component's own bottom sheet,
// which owns an applied-vs-draft split: opening seeds the draft from the
// currently APPLIED filters (props.appliedFilters), editing chips/search/
// dates only changes the draft, and only "החל" (Apply) commits the draft
// back up to the board via props.onApply. "איפוס" only clears the draft -
// it does not touch the board until "החל" is pressed afterward. Dismissing
// the sheet any other way (backdrop tap, the X button, hardware back)
// discards the draft and leaves the board's applied filters untouched.
//
// Mirrors the secretary web board's search + host-ranch + field + date-range
// + status filter SET (CompetitionsBoardPage.jsx / CompetitionsSearchBar.jsx)
// client-side over the already-fetched board list - not ported, since the
// web version is a single-select desktop layout and this is a mobile
// multi-select sheet.

function FilterChip(props) {
  return (
    <Pressable
      onPress={props.onPress}
      style={[styles.chip, props.selected ? styles.chipSelected : null]}
    >
      <Text style={[styles.chipText, props.selected ? styles.chipTextSelected : null]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function ChipFacet(props) {
  var options = Array.isArray(props.options) ? props.options : [];

  if (options.length === 0) {
    return null;
  }

  var hasSelection = props.selectedValues.length > 0;

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{props.label}</Text>

      <View style={styles.chipWrap}>
        {options.map(function (option) {
          var selected = props.selectedValues.some(function (value) {
            return String(value) === String(option.value);
          });

          return (
            <FilterChip
              key={String(option.value)}
              label={option.label}
              selected={selected}
              onPress={function () {
                props.onToggle(option.value);
              }}
            />
          );
        })}
      </View>

      {/* No chip selected = no filtering for this facet ("show all"). */}
      {!hasSelection && props.emptyLabel ? (
        <Text style={styles.chipEmptyText}>{props.emptyLabel}</Text>
      ) : null}
    </View>
  );
}

export default function CompetitionsFilterBar(props) {
  var hostRanchOptions = Array.isArray(props.hostRanchOptions)
    ? props.hostRanchOptions
    : [];
  var fieldOptions = Array.isArray(props.fieldOptions) ? props.fieldOptions : [];
  var statusOptions = Array.isArray(props.statusOptions)
    ? props.statusOptions
    : [];

  var appliedFilters = toSafeFilters(props.appliedFilters);

  var [isSheetOpen, setIsSheetOpen] = useState(false);
  var [draftFilters, setDraftFilters] = useState(appliedFilters);

  function openSheet() {
    // Opening always starts from the current applied filters, never from
    // whatever was left over in the draft from a previous cancelled edit.
    setDraftFilters(appliedFilters);
    setIsSheetOpen(true);
  }

  function closeWithoutApplying() {
    setIsSheetOpen(false);
  }

  function handleApplyPress() {
    if (typeof props.onApply === "function") {
      props.onApply(draftFilters);
    }

    setIsSheetOpen(false);
  }

  function handleResetPress() {
    setDraftFilters(emptyFilters());
  }

  function setDraftSearchText(nextValue) {
    setDraftFilters(function (prev) {
      return { ...prev, searchText: nextValue };
    });
  }

  function toggleDraftHostRanch(value) {
    setDraftFilters(function (prev) {
      return { ...prev, hostRanchIds: toggleValueInArray(prev.hostRanchIds, value) };
    });
  }

  function toggleDraftField(value) {
    setDraftFilters(function (prev) {
      return { ...prev, fieldIds: toggleValueInArray(prev.fieldIds, value) };
    });
  }

  function toggleDraftStatus(value) {
    setDraftFilters(function (prev) {
      return { ...prev, statusValues: toggleValueInArray(prev.statusValues, value) };
    });
  }

  function setDraftDateFrom(nextValue) {
    setDraftFilters(function (prev) {
      return { ...prev, dateFrom: nextValue };
    });
  }

  function setDraftDateTo(nextValue) {
    setDraftFilters(function (prev) {
      return { ...prev, dateTo: nextValue };
    });
  }

  return (
    <>
      <Pressable style={styles.filterButton} onPress={openSheet}>
        <Text style={styles.filterButtonText}>סינון ▾</Text>
      </Pressable>

      <Modal
        visible={isSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={closeWithoutApplying}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeWithoutApplying} />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeaderRow}>
            <Pressable onPress={closeWithoutApplying} hitSlop={8}>
              <Ionicons name="close-outline" size={26} color="#4F3B31" />
            </Pressable>

            <Text style={styles.sheetTitle}>סינון תחרויות</Text>

            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={styles.sheetScrollContent}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>חיפוש לפי שם תחרות</Text>
              <TextInput
                value={draftFilters.searchText}
                onChangeText={setDraftSearchText}
                placeholder="חיפוש לפי שם תחרות"
                placeholderTextColor="#BCAAA4"
                style={styles.textInput}
              />
            </View>

            <ChipFacet
              label="סטטוס"
              emptyLabel="כל הסטטוסים"
              options={statusOptions}
              selectedValues={draftFilters.statusValues}
              onToggle={toggleDraftStatus}
            />

            <ChipFacet
              label="חווה מארחת"
              emptyLabel="כל החוות"
              options={hostRanchOptions}
              selectedValues={draftFilters.hostRanchIds}
              onToggle={toggleDraftHostRanch}
            />

            <ChipFacet
              label="ענף"
              emptyLabel="כל הענפים"
              options={fieldOptions}
              selectedValues={draftFilters.fieldIds}
              onToggle={toggleDraftField}
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>טווח תאריכים</Text>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <CompetitionDateField
                    label="מתאריך"
                    value={draftFilters.dateFrom}
                    onChange={setDraftDateFrom}
                    maximumDate={draftFilters.dateTo}
                  />
                </View>

                <View style={styles.dateField}>
                  <CompetitionDateField
                    label="עד תאריך"
                    value={draftFilters.dateTo}
                    onChange={setDraftDateTo}
                    minimumDate={draftFilters.dateFrom}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* CAP-1: the footer row is its own section below the ScrollView,
              never sharing a row with the date fields above - Clear/Apply
              stay visually separate from the date range. */}
          <View style={styles.sheetFooter}>
            <Pressable style={styles.resetButton} onPress={handleResetPress}>
              <Text style={styles.resetButtonText}>איפוס</Text>
            </Pressable>

            <Pressable style={styles.applyButton} onPress={handleApplyPress}>
              <Text style={styles.applyButtonText}>החל</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
