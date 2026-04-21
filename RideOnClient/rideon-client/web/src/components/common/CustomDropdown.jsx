import { useEffect, useRef, useState } from "react";

export default function CustomDropdown(props) {
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [searchText, setSearchText] = useState("");

  const isOpen = props.openDropdownKey === props.dropdownKey;

  useEffect(
    function () {
      function handleDocumentClick(event) {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target) &&
          props.openDropdownKey === props.dropdownKey
        ) {
          props.setOpenDropdownKey("");
          setSearchText("");
        }
      }

      document.addEventListener("mousedown", handleDocumentClick);

      return function () {
        document.removeEventListener("mousedown", handleDocumentClick);
      };
    },
    [props.openDropdownKey, props.dropdownKey, props.setOpenDropdownKey]
  );

  useEffect(
    function () {
      if (isOpen && props.searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
      if (!isOpen) {
        setSearchText("");
      }
    },
    [isOpen, props.searchable]
  );

  function getSelectedOption() {
    for (let i = 0; i < props.options.length; i++) {
      if (
        String(props.getOptionValue(props.options[i])) === String(props.value)
      ) {
        return props.options[i];
      }
    }
    return null;
  }

  function handleToggle() {
    if (props.disabled) {
      return;
    }

    if (props.openDropdownKey === props.dropdownKey) {
      props.setOpenDropdownKey("");
    } else {
      props.setOpenDropdownKey(props.dropdownKey);
    }
  }

  function handleSelect(optionValue) {
    props.onChange({
      target: {
        value: String(optionValue),
      },
    });

    props.setOpenDropdownKey("");
    setSearchText("");
  }

  const selectedOption = getSelectedOption();

  const visibleOptions = props.searchable && searchText.trim()
    ? props.options.filter(function (option) {
        return props
          .getOptionLabel(option)
          .toLowerCase()
          .includes(searchText.trim().toLowerCase());
      })
    : props.options;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={props.disabled}
        className={
          props.disabled
            ? "w-full px-4 py-2.5 rounded-xl border-2 border-[#E5D7CF] bg-[#F3ECE8] text-right text-[#6D4C41] cursor-not-allowed text-sm flex items-center justify-between"
            : "w-full px-4 py-2.5 rounded-xl border-2 border-[#D7CCC8] bg-white text-right text-[#212121] hover:border-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:ring-2 focus:ring-[#795548]/15 transition-all text-sm flex items-center justify-between"
        }
      >
        <span className="truncate">
          {selectedOption
            ? props.getOptionLabel(selectedOption)
            : props.placeholder}
        </span>
        <span className="mr-3 text-xs text-[#8D6E63]">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && !props.disabled && (
        <div className="absolute right-0 left-0 top-full mt-2 z-50 rounded-xl border border-[#D7CCC8] bg-white shadow-lg">
          {props.searchable && (
            <div className="p-2 border-b border-[#F5EBE4]">
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={function (e) {
                  setSearchText(e.target.value);
                }}
                placeholder="חיפוש..."
                dir="rtl"
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D7CCC8] bg-[#FAF5F1] text-right text-[#212121] placeholder-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548]/20"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#8D6E63] text-right">
                {searchText.trim() ? "לא נמצאו תוצאות" : "אין אפשרויות להצגה"}
              </div>
            ) : (
              visibleOptions.map(function (option) {
                const optionValue = props.getOptionValue(option);
                const isSelected = String(optionValue) === String(props.value);

                return (
                  <button
                    key={String(optionValue)}
                    type="button"
                    onClick={function () {
                      handleSelect(optionValue);
                    }}
                    className={
                      "w-full px-4 py-3 text-sm text-right transition-colors border-b border-[#F5EBE4] last:border-b-0 " +
                      (isSelected
                        ? "bg-[#F5EDE8] text-[#4E342E] font-semibold"
                        : "bg-white text-[#212121] hover:bg-[#FAF5F1]")
                    }
                  >
                    {props.getOptionLabel(option)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}