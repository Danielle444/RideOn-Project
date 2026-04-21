import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

export default function MultiSelectPicker(props) {
  var options = Array.isArray(props.options) ? props.options : [];
  var selectedValues = Array.isArray(props.selectedValues)
    ? props.selectedValues
    : [];

  var [search, setSearch] = useState("");

  useEffect(
    function () {
      if (!props.isOpen) {
        setSearch("");
      }
    },
    [props.isOpen],
  );

  function isSelected(optionValue) {
    return selectedValues.some(function (value) {
      return String(value) === String(optionValue);
    });
  }

  var filteredOptions = useMemo(
    function () {
      var s = normalizeText(search);

      if (!s) {
        return options;
      }

      return options.filter(function (option) {
        var mainLabel = normalizeText(props.getOptionLabel(option));
        var searchText = normalizeText(
          props.getOptionSearchText ? props.getOptionSearchText(option) : "",
        );

        return mainLabel.includes(s) || searchText.includes(s);
      });
    },
    [options, search, props.getOptionLabel, props.getOptionSearchText],
  );

  var selectedOptions = useMemo(
    function () {
      return options.filter(function (option) {
        return isSelected(props.getOptionValue(option));
      });
    },
    [options, selectedValues, props.getOptionValue],
  );

  return (
    <div className="rounded-2xl border border-[#D7CCC8] bg-[#FFFCFA] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#8B6A5A]">
          {selectedValues.length > 0
            ? "נבחרו " + selectedValues.length + " פריטים"
            : props.emptySelectionText || "לא נבחרו פריטים"}
        </div>

        {props.actionButtonLabel && props.onActionButtonClick ? (
          <button
            type="button"
            onClick={props.onActionButtonClick}
            disabled={props.disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D7CCC8] bg-white px-4 py-2.5 text-sm font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {props.actionButtonLabel}
          </button>
        ) : null}
      </div>

      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8D6E63]"
        />
        <input
          type="text"
          value={search}
          onChange={function (e) {
            setSearch(e.target.value);
          }}
          placeholder={props.searchPlaceholder || "חיפוש"}
          disabled={props.disabled}
          className="h-11 w-full rounded-xl border border-[#D7CCC8] bg-white pr-10 pl-4 text-right text-[#212121] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {selectedOptions.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedOptions.map(function (option) {
            var optionValue = props.getOptionValue(option);

            return (
              <button
                key={String(optionValue)}
                type="button"
                onClick={function () {
                  if (props.onToggleValue) {
                    props.onToggleValue(optionValue);
                  }
                }}
                disabled={props.disabled}
                className="rounded-full border border-[#D9C9C1] bg-white px-3 py-1.5 text-sm font-medium text-[#5D4037] transition-colors hover:bg-[#F8F5F2] disabled:cursor-not-allowed disabled:opacity-60"
                title="לחצי להסרה"
              >
                {props.getOptionLabel(option)} ✕
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#E8DDD7] bg-white">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-6 text-right text-sm text-[#8B6A5A]">
            {props.noResultsText || "לא נמצאו אפשרויות להצגה"}
          </div>
        ) : (
          filteredOptions.map(function (option, index) {
            var optionValue = props.getOptionValue(option);
            var checked = isSelected(optionValue);

            return (
              <label
                key={String(optionValue)}
                className={
                  "flex cursor-pointer items-start justify-between gap-3 px-4 py-3 text-right transition-colors hover:bg-[#FAF5F1] " +
                  (index < filteredOptions.length - 1
                    ? "border-b border-[#F2E9E4]"
                    : "")
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={function () {
                    if (props.onToggleValue) {
                      props.onToggleValue(optionValue);
                    }
                  }}
                  disabled={props.disabled}
                  className="mt-1 h-4 w-4 accent-[#8B6352]"
                />

                <div className="flex-1">
                  <div className="font-medium text-[#4E342E]">
                    {props.getOptionLabel(option)}
                  </div>

                  {props.renderOptionMeta ? (
                    <div className="mt-1 text-xs text-[#A1887F]">
                      {props.renderOptionMeta(option)}
                    </div>
                  ) : null}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}