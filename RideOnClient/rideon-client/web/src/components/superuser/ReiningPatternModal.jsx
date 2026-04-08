import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

export default function ReiningPatternModal(props) {
  var allManeuvers = Array.isArray(props.allManeuvers) ? props.allManeuvers : [];
  var isEdit = !!props.initialItem;

  var [patternNumber, setPatternNumber] = useState("");
  var [assignedManeuvers, setAssignedManeuvers] = useState([]);
  var [selectedManeuverId, setSelectedManeuverId] = useState("");

  var [inlineManeuverOpen, setInlineManeuverOpen] = useState(false);
  var [inlineManeuverSaving, setInlineManeuverSaving] = useState(false);
  var [inlineManeuverError, setInlineManeuverError] = useState("");
  var [inlineManeuverForm, setInlineManeuverForm] = useState({
    maneuverName: "",
    maneuverDescription: "",
  });

  useEffect(
    function () {
      if (!props.isOpen) {
        return;
      }

      setPatternNumber(
        props.initialItem?.patternNumber !== null &&
          props.initialItem?.patternNumber !== undefined
          ? String(props.initialItem.patternNumber)
          : "",
      );

      setAssignedManeuvers(
        Array.isArray(props.initialItem?.maneuvers)
          ? props.initialItem.maneuvers.map(function (item, index) {
              return {
                patternNumber: props.initialItem.patternNumber,
                maneuverId: item.maneuverId,
                maneuverOrder:
                  item.maneuverOrder !== null && item.maneuverOrder !== undefined
                    ? item.maneuverOrder
                    : index + 1,
                maneuverName: item.maneuverName,
                maneuverDescription: item.maneuverDescription,
              };
            })
          : [],
      );

      setSelectedManeuverId("");
      setInlineManeuverOpen(false);
      setInlineManeuverSaving(false);
      setInlineManeuverError("");
      setInlineManeuverForm({
        maneuverName: "",
        maneuverDescription: "",
      });
    },
    [props.isOpen, props.initialItem],
  );

  var availableManeuvers = useMemo(
    function () {
      return allManeuvers.filter(function (maneuver) {
        return !assignedManeuvers.some(function (item) {
          return String(item.maneuverId) === String(maneuver.maneuverId);
        });
      });
    },
    [allManeuvers, assignedManeuvers],
  );

  if (!props.isOpen) {
    return null;
  }

  function renumberItems(items) {
    return items.map(function (item, index) {
      return {
        ...item,
        maneuverOrder: index + 1,
      };
    });
  }

  function handleAddExistingManeuver() {
    if (!selectedManeuverId) {
      return;
    }

    var selected = allManeuvers.find(function (maneuver) {
      return String(maneuver.maneuverId) === String(selectedManeuverId);
    });

    if (!selected) {
      return;
    }

    var next = [
      ...assignedManeuvers,
      {
        patternNumber: patternNumber ? Number(patternNumber) : 0,
        maneuverId: selected.maneuverId,
        maneuverOrder: assignedManeuvers.length + 1,
        maneuverName: selected.maneuverName,
        maneuverDescription: selected.maneuverDescription,
      },
    ];

    setAssignedManeuvers(renumberItems(next));
    setSelectedManeuverId("");
  }

  function handleRemoveManeuver(indexToDelete) {
    var next = assignedManeuvers.filter(function (_, index) {
      return index !== indexToDelete;
    });

    setAssignedManeuvers(renumberItems(next));
  }

  function handleMoveUp(indexToMove) {
    if (indexToMove === 0) {
      return;
    }

    var next = [...assignedManeuvers];
    var temp = next[indexToMove - 1];
    next[indexToMove - 1] = next[indexToMove];
    next[indexToMove] = temp;

    setAssignedManeuvers(renumberItems(next));
  }

  function handleMoveDown(indexToMove) {
    if (indexToMove === assignedManeuvers.length - 1) {
      return;
    }

    var next = [...assignedManeuvers];
    var temp = next[indexToMove + 1];
    next[indexToMove + 1] = next[indexToMove];
    next[indexToMove] = temp;

    setAssignedManeuvers(renumberItems(next));
  }

  function handleInlineManeuverChange(fieldName, value) {
    setInlineManeuverError("");

    setInlineManeuverForm(function (prev) {
      return {
        ...prev,
        [fieldName]: value,
      };
    });
  }

  async function handleCreateInlineManeuver() {
    if (!inlineManeuverForm.maneuverName.trim()) {
      setInlineManeuverError("יש להזין קיצור מנברה");
      return;
    }

    try {
      setInlineManeuverSaving(true);
      setInlineManeuverError("");

      var created = await props.onCreateInlineManeuver({
        maneuverName: inlineManeuverForm.maneuverName.trim(),
        maneuverDescription: inlineManeuverForm.maneuverDescription.trim(),
      });

      if (created) {
        var next = [
          ...assignedManeuvers,
          {
            patternNumber: patternNumber ? Number(patternNumber) : 0,
            maneuverId: created.maneuverId,
            maneuverOrder: assignedManeuvers.length + 1,
            maneuverName: created.maneuverName,
            maneuverDescription: created.maneuverDescription,
          },
        ];

        setAssignedManeuvers(renumberItems(next));
      }

      setInlineManeuverForm({
        maneuverName: "",
        maneuverDescription: "",
      });
      setInlineManeuverOpen(false);
    } catch (error) {
      setInlineManeuverError(error?.message || "שגיאה בשמירת המנברה");
    } finally {
      setInlineManeuverSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    props.onSubmit({
      oldPatternNumber: isEdit ? Number(props.initialItem.patternNumber) : null,
      patternNumber: Number(patternNumber),
      maneuvers: assignedManeuvers.map(function (item, index) {
        return {
          patternNumber: Number(patternNumber),
          maneuverId: item.maneuverId,
          maneuverOrder: index + 1,
          maneuverName: item.maneuverName,
          maneuverDescription: item.maneuverDescription,
        };
      }),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[#E6DCD5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EFE5DF] px-6 py-5">
          <h2 className="text-2xl font-bold text-[#3F312B]">
            {isEdit ? "עריכת מסלול ריינינג" : "הוספת מסלול ריינינג"}
          </h2>

          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-2 text-[#7E675E] transition-colors hover:bg-[#F6F1EE]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                  מספר מסלול
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={patternNumber}
                  onChange={function (e) {
                    setPatternNumber(e.target.value);
                  }}
                  className="h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                />
              </div>

              <div className="rounded-2xl border border-[#E6DCD5] bg-[#FBF8F6] p-4">
                <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                  שיוך מנברה קיימת
                </label>

                <select
                  value={selectedManeuverId}
                  onChange={function (e) {
                    setSelectedManeuverId(e.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                >
                  <option value="">בחרי מנברה</option>
                  {availableManeuvers.map(function (maneuver) {
                    return (
                      <option key={maneuver.maneuverId} value={maneuver.maneuverId}>
                        {maneuver.maneuverName} - {maneuver.maneuverDescription}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={handleAddExistingManeuver}
                  className="mt-3 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-2.5 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                >
                  הוספה למסלול
                </button>
              </div>

              <div className="rounded-2xl border border-[#E6DCD5] bg-[#FBF8F6] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#5D4037]">
                    הוספת מנברה חדשה
                  </div>

                  <button
                    type="button"
                    onClick={function () {
                      setInlineManeuverOpen(function (prev) {
                        return !prev;
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8B6352] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547]"
                  >
                    <Plus size={16} />
                    הוספת מנברה
                  </button>
                </div>

                {inlineManeuverOpen ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                        קיצור מנברה
                      </label>
                      <input
                        type="text"
                        value={inlineManeuverForm.maneuverName}
                        onChange={function (e) {
                          handleInlineManeuverChange("maneuverName", e.target.value);
                        }}
                        className="h-11 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#5D4037]">
                        תיאור מנברה
                      </label>
                      <textarea
                        rows={3}
                        value={inlineManeuverForm.maneuverDescription}
                        onChange={function (e) {
                          handleInlineManeuverChange(
                            "maneuverDescription",
                            e.target.value,
                          );
                        }}
                        className="w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-3 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]"
                      />
                    </div>

                    {inlineManeuverError ? (
                      <div className="rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
                        {inlineManeuverError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleCreateInlineManeuver}
                      disabled={inlineManeuverSaving}
                      className="w-full rounded-xl border border-[#D8CBC3] bg-white px-4 py-2.5 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2] disabled:opacity-70"
                    >
                      {inlineManeuverSaving ? "שומר..." : "שמירת מנברה חדשה"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E6DCD5] bg-white">
              <div className="border-b border-[#EFE5DF] bg-[#FAF7F5] px-5 py-4 text-right text-lg font-bold text-[#3F312B]">
                מנברות המסלול לפי סדר
              </div>

              {assignedManeuvers.length === 0 ? (
                <div className="px-5 py-10 text-right text-[#8B6A5A]">
                  עדיין לא שויכו מנברות למסלול.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-[90px_140px_1fr_190px] gap-3 border-b border-[#EFE5DF] bg-[#FAF7F5] px-5 py-4 text-center text-sm font-bold text-[#4E342E]">
                      <div>סדר</div>
                      <div>קיצור</div>
                      <div>תיאור</div>
                      <div>פעולות</div>
                    </div>

                    {assignedManeuvers.map(function (item, index) {
                      return (
                        <div
                          key={item.maneuverId + "-" + item.maneuverOrder}
                          className={
                            "grid grid-cols-[90px_140px_1fr_190px] items-center gap-3 border-b border-[#F1E8E3] px-5 py-4 text-center text-[#3F312B] " +
                            (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                          }
                        >
                          <div className="font-semibold">{item.maneuverOrder}</div>
                          <div>{item.maneuverName}</div>
                          <div className="text-right">
                            {item.maneuverDescription || "-"}
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={function () {
                                handleMoveUp(index);
                              }}
                              className="rounded-lg border border-[#D8CBC3] px-3 py-1.5 text-sm text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                            >
                              למעלה
                            </button>

                            <button
                              type="button"
                              onClick={function () {
                                handleMoveDown(index);
                              }}
                              className="rounded-lg border border-[#D8CBC3] px-3 py-1.5 text-sm text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
                            >
                              למטה
                            </button>

                            <button
                              type="button"
                              onClick={function () {
                                handleRemoveManeuver(index);
                              }}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50"
                            >
                              הסרה
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {props.error ? (
            <div className="mt-5 rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]">
              {props.error}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-xl border border-[#D8CBC3] bg-white px-5 py-2.5 font-semibold text-[#5D4037] transition-colors hover:bg-[#F8F5F2]"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={props.saving}
              className="rounded-xl bg-[#8B6352] px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-[#7A5547] disabled:opacity-70"
            >
              {props.saving ? "שומר..." : "שמירת מסלול"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}