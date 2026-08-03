import { useEffect, useRef } from "react";

export default function FormField(props) {
  const infoRef = useRef(null);

  useEffect(
    function () {
      if (!props.showInfoPopup) {
        return;
      }

      function handleClickOutside(event) {
        if (infoRef.current && !infoRef.current.contains(event.target)) {
          if (props.onCloseInfo) {
            props.onCloseInfo();
          }
        }
      }

      document.addEventListener("mousedown", handleClickOutside);

      return function () {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    },
    [props.showInfoPopup, props.onCloseInfo],
  );

  return (
    <div className={props.className}>
      <label className="mb-2 flex items-center justify-start gap-1 text-sm font-semibold text-[#5D4037]">
        <span>
          {props.label}
          {props.required && <span className="text-red-500 mr-0.5">*</span>}
        </span>

        {props.info && (
          <span ref={infoRef} className="relative inline-flex items-center">
            <button
              type="button"
              onClick={props.onInfoClick}
              className="text-[#8D6E63] hover:text-[#5D4037] transition-colors"
              title="הצגת דרישות"
            >
              {props.info}
            </button>

            {props.infoPopup}
          </span>
        )}
      </label>

      {props.children}

      {props.error ? (
        <div className="mt-1.5 text-right text-xs text-red-600">
          {props.error}
        </div>
      ) : null}
    </div>
  );
}
