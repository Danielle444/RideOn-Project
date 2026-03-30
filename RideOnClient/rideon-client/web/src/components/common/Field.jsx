import { useEffect, useRef } from "react";

export default function Field(props) {
  var infoRef = useRef(null);

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
    [props.showInfoPopup, props.onCloseInfo]
  );

  return (
    <div>
      <label className="flex items-center justify-start gap-1 text-xs font-semibold text-[#4E342E] mb-1.5 text-right">
        <span>{props.label}</span>

        {props.required && <span className="text-red-500 mr-0.5">*</span>}

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
    </div>
  );
}