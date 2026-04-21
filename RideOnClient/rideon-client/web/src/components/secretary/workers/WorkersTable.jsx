import { Check, Pencil, Trash2, X } from "lucide-react";

export default function WorkersTable(props) {
  function renderStatusPill(roleStatus) {
    if (roleStatus === "Approved") {
      return (
        <span className="inline-flex rounded-full border border-[#CFE6D8] bg-[#F7FBF8] px-3 py-1 text-sm font-semibold text-[#2F6F4F]">
          מאושר
        </span>
      );
    }

    if (roleStatus === "Pending") {
      return (
        <span className="inline-flex rounded-full border border-[#E9D8B5] bg-[#FFF9ED] px-3 py-1 text-sm font-semibold text-[#9A6A00]">
          ממתין
        </span>
      );
    }

    if (roleStatus === "Rejected") {
      return (
        <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
          נדחה
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-[#E1D6D0] bg-[#FAF7F5] px-3 py-1 text-sm font-semibold text-[#8A7268]">
        {roleStatus || "לא ידוע"}
      </span>
    );
  }

  function renderActionButton(config) {
    return (
      <button
        type="button"
        disabled={config.disabled}
        onClick={config.onClick}
        className={
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 " +
          config.className
        }
      >
        {config.icon}
        {config.label}
      </button>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] text-right">
        <thead>
          <tr className="bg-[#FAF7F5] border-b border-[#E8DDD6] text-[#6A5248] text-sm">
            <th className="px-5 py-4 font-bold">שם</th>
            <th className="px-5 py-4 font-bold">ת"ז</th>
            <th className="px-5 py-4 font-bold">אימייל</th>
            <th className="px-5 py-4 font-bold">טלפון</th>
            <th className="px-5 py-4 font-bold">שם משתמש</th>
            <th className="px-5 py-4 font-bold">סטטוס</th>
            <th className="px-5 py-4 font-bold text-center">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {props.loading ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-12 text-center text-[#8A7268]"
              >
                טוענת עובדים...
              </td>
            </tr>
          ) : null}

          {!props.loading && props.workers.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-12 text-center text-[#8A7268]"
              >
                לא נמצאו עובדים להצגה
              </td>
            </tr>
          ) : null}

          {!props.loading &&
            props.workers.map(function (item, index) {
              const currentStatus = item.roleStatus;
              const editLoading =
                props.actionLoadingKey === props.getActionKey(item, "edit");
              const approveLoading =
                props.actionLoadingKey === props.getActionKey(item, "approve");
              const rejectLoading =
                props.actionLoadingKey === props.getActionKey(item, "reject");
              const removeLoading =
                props.actionLoadingKey === props.getActionKey(item, "remove");

              return (
                <tr
                  key={String(item.personId) + "-" + String(item.ranchId)}
                  className={
                    "border-b border-[#F1E8E3] text-[#3F312B] transition-colors hover:bg-[#FCFAF8] " +
                    (index % 2 === 0 ? "bg-white" : "bg-[#FFFEFD]")
                  }
                >
                  <td className="px-5 py-5 font-medium">{item.fullName}</td>
                  <td className="px-5 py-5">{item.nationalId}</td>
                  <td className="px-5 py-5">{item.email || "-"}</td>
                  <td className="px-5 py-5">{item.cellPhone || "-"}</td>
                  <td className="px-5 py-5">{item.username || "-"}</td>
                  <td className="px-5 py-5">
                    {renderStatusPill(currentStatus)}
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {renderActionButton({
                        label: "עריכה",
                        icon: <Pencil size={15} />,
                        disabled: editLoading,
                        onClick: function () {
                          props.onEdit(item);
                        },
                        className:
                          "border border-[#D8CBC3] bg-white text-[#5D4037] hover:bg-[#F8F5F2]",
                      })}

                      {currentStatus === "Pending"
                        ? renderActionButton({
                            label: "אישור",
                            icon: <Check size={15} />,
                            disabled: approveLoading,
                            onClick: function () {
                              props.onApprove(item);
                            },
                            className:
                              "bg-[#E8F3EC] text-[#2F6F4F] hover:bg-[#DCEEE3]",
                          })
                        : null}

                      {currentStatus === "Pending"
                        ? renderActionButton({
                            label: "דחייה",
                            icon: <X size={15} />,
                            disabled: rejectLoading,
                            onClick: function () {
                              props.onReject(item);
                            },
                            className:
                              "bg-[#FBEAEA] text-[#A14A4A] hover:bg-[#F5DEDE]",
                          })
                        : null}

                      {currentStatus === "Approved"
                        ? renderActionButton({
                            label: "ביטול אישור",
                            icon: <X size={15} />,
                            disabled: rejectLoading,
                            onClick: function () {
                              props.onUndoApprove(item);
                            },
                            className:
                              "bg-[#FBEAEA] text-[#A14A4A] hover:bg-[#F5DEDE]",
                          })
                        : null}

                      {currentStatus === "Rejected"
                        ? renderActionButton({
                            label: "אישור מחדש",
                            icon: <Check size={15} />,
                            disabled: approveLoading,
                            onClick: function () {
                              props.onApproveRejected(item);
                            },
                            className:
                              "bg-[#E8F3EC] text-[#2F6F4F] hover:bg-[#DCEEE3]",
                          })
                        : null}

                      {renderActionButton({
                        label: "הסרת שיוך",
                        icon: <Trash2 size={15} />,
                        disabled: removeLoading,
                        onClick: function () {
                          props.onRemoveAssignment(item);
                        },
                        className:
                          "bg-[#F6F1EE] text-[#8B6352] hover:bg-[#EEE5E0]",
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}