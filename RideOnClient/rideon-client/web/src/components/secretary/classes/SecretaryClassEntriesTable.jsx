import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Dice5,
  GripVertical,
  Pencil,
  Save,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";

import DataTableShell from "../../common/table/DataTableShell";
import DataTableEmptyState from "../../common/table/DataTableEmptyState";
import DataTableLoadingState from "../../common/table/DataTableLoadingState";
import TableActionButton from "../../common/table/TableActionButton";
import SecretaryClassEntriesSummaryCards from "./SecretaryClassEntriesSummaryCards";

function getValue(item, camelKey, pascalKey, fallback) {
  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

function getEntryId(item) {
  return getValue(item, "entryId", "EntryId", 0);
}

function getEntryDrawOrder(item) {
  return getValue(item, "drawOrder", "DrawOrder", "");
}

function getFilterButtonClass(isActive) {
  return (
    "rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors " +
    (isActive
      ? "border-[#8B6352] bg-[#8B6352] text-white"
      : "border-[#E2D5CE] bg-white text-[#6B574F] hover:bg-[#FAF5F1]")
  );
}

function getWarningMessage(warning) {
  if (!warning) {
    return "התראת רווח";
  }

  return warning.message || warning.Message || "התראת רווח";
}

function getEntryWarningText(item) {
  var hasRiderWarning =
    item.hasRiderGapWarning || item.HasRiderGapWarning || false;

  var hasHorseWarning =
    item.hasHorseGapWarning || item.HasHorseGapWarning || false;

  var riderGap =
    item.riderGapFromPrevious || item.RiderGapFromPrevious || null;

  var horseGap =
    item.horseGapFromPrevious || item.HorseGapFromPrevious || null;

  var messages = [];

  if (hasRiderWarning) {
    messages.push("רווח רוכב: " + riderGap);
  }

  if (hasHorseWarning) {
    messages.push("רווח סוס: " + horseGap);
  }

  return messages.join(" · ");
}

function getDragId(entryId) {
  return "draw-entry-" + entryId;
}

function getEntryIdFromDragId(value) {
  return String(value || "").replace("draw-entry-", "");
}

function DragHandle(props) {
  var entryId = props.entryId;
  var disabled = !!props.disabled;

  var draggable = useDraggable({
    id: getDragId(entryId),
    data: {
      entryId: entryId,
    },
    disabled: disabled,
  });

  var style = draggable.transform
    ? {
        transform: CSS.Translate.toString(draggable.transform),
      }
    : undefined;

  return (
    <button
      ref={draggable.setNodeRef}
      type="button"
      style={style}
      {...draggable.attributes}
      {...draggable.listeners}
      disabled={disabled}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2D5CE] bg-white text-[#7B5A4D] transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-grab hover:bg-[#FAF5F1] active:cursor-grabbing",
        draggable.isDragging ? "z-50 shadow-lg opacity-80" : "",
      ].join(" ")}
      title="גרירה לשינוי סדר"
    >
      <GripVertical size={17} />
    </button>
  );
}

function SortableEntryRow(props) {
  var item = props.item;
  var index = props.index;
  var drawOrderEditMode = !!props.drawOrderEditMode;
  var canEditEntry = !!props.canEditEntry;
  var savingDrawOrder = !!props.savingDrawOrder;

  var horseName = getValue(item, "horseName", "HorseName", "");
  var barnName = getValue(item, "barnName", "BarnName", "");
  var entryId = getEntryId(item);
  var drawOrder = getEntryDrawOrder(item);
  var warningText = getEntryWarningText(item);

  var droppable = useDroppable({
    id: getDragId(entryId),
    data: {
      entryId: entryId,
    },
    disabled: !drawOrderEditMode || savingDrawOrder,
  });

  return (
    <tr
      ref={droppable.setNodeRef}
      className={[
        "border-t border-[#F1E7E1] text-sm text-[#4A3A34]",
        drawOrderEditMode ? "bg-white" : "",
        droppable.isOver && drawOrderEditMode ? "bg-[#FAF5F1]" : "",
      ].join(" ")}
    >
      <td className="px-4 py-3 font-bold text-[#7B5A4D]">
        {drawOrderEditMode ? (
          <input
            type="number"
            min="1"
            value={drawOrder || ""}
            onChange={function (event) {
              props.onUpdateDraftDrawOrder(entryId, event.target.value);
            }}
            disabled={savingDrawOrder}
            className="h-10 w-20 rounded-xl border border-[#E2D5CE] bg-white px-3 text-center text-sm font-bold text-[#3F312B] outline-none transition-colors focus:border-[#8B6352]"
          />
        ) : (
          drawOrder || "-"
        )}
      </td>

      <td className="px-4 py-3 font-semibold">
        {getValue(item, "className", "ClassName", "-")}
      </td>

      <td className="px-4 py-3 font-semibold">
        {getValue(item, "riderName", "RiderName", "-")}
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{horseName || "-"}</span>

          {barnName ? (
            <span className="text-xs text-[#8D6E63]">{barnName}</span>
          ) : null}
        </div>
      </td>

      <td className="px-4 py-3">
        {getValue(item, "coachName", "CoachName", "-") || "-"}
      </td>

      <td className="px-4 py-3">
        {getValue(item, "payerName", "PayerName", "-")}
      </td>

      <td className="px-4 py-3">
        {getValue(
          item,
          "prizeRecipientName",
          "PrizeRecipientName",
          "-",
        ) || "-"}
      </td>

      {canEditEntry && !drawOrderEditMode ? (
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <TableActionButton
              icon={<Pencil size={15} />}
              iconOnly
              title="עריכת כניסה"
              onClick={function () {
                if (props.onEditEntry) {
                  props.onEditEntry(item);
                }
              }}
              disabled={!props.onEditEntry}
            />

            <TableActionButton
              icon={<Trash2 size={15} />}
              iconOnly
              title="מחיקת כניסה"
              variant="danger"
              onClick={function () {
                if (props.onDeleteEntry) {
                  props.onDeleteEntry(item);
                }
              }}
              disabled={!props.onDeleteEntry}
            />
          </div>
        </td>
      ) : null}

      {drawOrderEditMode ? (
        <>
          <td className="px-4 py-3">
            {warningText ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                {warningText}
              </span>
            ) : (
              <span className="rounded-full bg-[#EEF8F0] px-3 py-1 text-xs font-bold text-[#2F6B3B]">
                תקין
              </span>
            )}
          </td>

          <td className="px-4 py-3">
            <div className="flex justify-end">
              <DragHandle
                entryId={entryId}
                disabled={savingDrawOrder}
                index={index}
              />
            </div>
          </td>
        </>
      ) : null}
    </tr>
  );
}

export default function SecretaryClassEntriesTable(props) {
  var items = Array.isArray(props.items) ? props.items : [];
  var canEditDrawOrder = !!props.canEditDrawOrder;
  var canEditEntry = !!props.canEditEntry;

  var sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  var colSpan = 7;

  if (props.drawOrderEditMode) {
    colSpan += 2;
  }

  if (canEditEntry && !props.drawOrderEditMode) {
    colSpan += 1;
  }

  function handleDragEnd(event) {
    if (!event || !event.active || !event.over) {
      return;
    }

    var activeEntryId = getEntryIdFromDragId(event.active.id);
    var overEntryId = getEntryIdFromDragId(event.over.id);

    if (props.onMoveDrawOrderEntryToEntry) {
      props.onMoveDrawOrderEntryToEntry(activeEntryId, overEntryId);
    }
  }

  return (
    <div className="space-y-4">
      <SecretaryClassEntriesSummaryCards
        summary={props.summary}
        titlePrefix="כניסות"
      />

      <section className="rounded-3xl border border-[#EFE5DF] bg-[#FFFDFB] p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3F312B]">כניסות למקצה</h2>
            <p className="text-xs text-[#8D6E63]">
              {props.drawOrderEditMode
                ? "מצב עריכת סדר פעיל - אפשר לגרור כניסות או להזין מספר הגרלה ידנית"
                : items.length + " כניסות מוצגות כרגע"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditDrawOrder && !props.drawOrderEditMode ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-[#E2D5CE] bg-white px-3 py-2">
                  <label className="text-xs font-bold text-[#6D4C41]">
                    רווח מינ׳
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={props.minimumGap || 7}
                    onChange={function (event) {
                      if (props.onMinimumGapChange) {
                        props.onMinimumGapChange(event.target.value);
                      }
                    }}
                    disabled={
                      props.savingDrawOrder || props.generatingDrawPreview
                    }
                    className="h-8 w-16 rounded-xl border border-[#E2D5CE] bg-white px-2 text-center text-sm font-bold text-[#3F312B] outline-none focus:border-[#8B6352]"
                  />
                </div>

                <TableActionButton
                  label="צור הגרלה חכמה"
                  icon={<Dice5 size={15} />}
                  onClick={props.onGenerateSmartDrawOrderPreview}
                  loading={props.generatingDrawPreview}
                  disabled={props.savingDrawOrder}
                />

                <TableActionButton
                  label="עריכת סדר"
                  icon={<Shuffle size={15} />}
                  onClick={props.onStartDrawOrderEdit}
                  disabled={
                    !props.hasDrawOrder ||
                    props.savingDrawOrder ||
                    props.generatingDrawPreview
                  }
                />

                <TableActionButton
                  label="מחיקת הגרלה"
                  icon={<Trash2 size={15} />}
                  variant="danger"
                  onClick={props.onClearDrawOrder}
                  disabled={
                    !props.hasDrawOrder ||
                    props.savingDrawOrder ||
                    props.generatingDrawPreview
                  }
                />
              </>
            ) : null}

            {props.drawOrderEditMode ? (
              <>
                <TableActionButton
                  label="שמירה ויציאה"
                  icon={<Save size={15} />}
                  onClick={props.onSaveDrawOrder}
                  loading={props.savingDrawOrder}
                />

                <TableActionButton
                  label="ביטול"
                  icon={<X size={15} />}
                  variant="danger"
                  onClick={props.onCancelDrawOrderEdit}
                  disabled={props.savingDrawOrder}
                />
              </>
            ) : null}

            {!props.drawOrderEditMode ? (
              <>
                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("all");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "all",
                  )}
                >
                  הכל
                </button>

                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("paid");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "paid",
                  )}
                >
                  שולם
                </button>

                <button
                  type="button"
                  onClick={function () {
                    props.onPaymentFilterChange("unpaid");
                  }}
                  className={getFilterButtonClass(
                    props.paymentFilter === "unpaid",
                  )}
                >
                  לא שולם
                </button>

                <div className="w-full max-w-sm md:w-72">
                  <input
                    type="text"
                    value={props.searchText}
                    onChange={function (event) {
                      props.onSearchTextChange(event.target.value);
                    }}
                    placeholder="חיפוש לפי סוס, רוכב, מאמן או משלם..."
                    className="h-11 w-full rounded-2xl border border-[#E2D5CE] bg-white px-4 text-right text-sm text-[#3F312B] outline-none transition-colors focus:border-[#8B6352]"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        {props.drawOrderError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {props.drawOrderError}
          </div>
        ) : null}

        {props.drawOrderSummaryMessage ? (
          <div className="mb-4 rounded-2xl border border-[#D8CBC3] bg-[#FAF5F1] px-4 py-3 text-sm font-semibold text-[#6D4C41]">
            {props.drawOrderSummaryMessage}
          </div>
        ) : null}

        {Array.isArray(props.drawOrderWarnings) &&
        props.drawOrderWarnings.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            <p className="font-bold">
              נמצאו {props.drawOrderWarnings.length} התראות רווח:
            </p>

            <ul className="mt-2 list-inside list-disc space-y-1">
              {props.drawOrderWarnings
                .slice(0, 6)
                .map(function (warning, index) {
                  return <li key={index}>{getWarningMessage(warning)}</li>;
                })}
            </ul>

            {props.drawOrderWarnings.length > 6 ? (
              <p className="mt-2 text-xs font-semibold">
                מוצגות 6 התראות ראשונות מתוך{" "}
                {props.drawOrderWarnings.length}
              </p>
            ) : null}
          </div>
        ) : null}

        {props.drawOrderEditMode ? (
          <div className="mb-4 rounded-2xl border border-[#EFE5DF] bg-[#FAF5F1] px-4 py-3 text-sm text-[#7A655C]">
            שימי לב: שמירה תעדכן את סדר ההגרלה של כל המקצים באותו יום ובאותו
            מספר.
          </div>
        ) : null}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <DataTableShell>
            <thead className="bg-[#FAF5F1] text-sm text-[#6B574F]">
              <tr>
                <th className="px-4 py-3">סדר הגרלה</th>
                <th className="px-4 py-3">מקצה</th>
                <th className="px-4 py-3">רוכב</th>
                <th className="px-4 py-3">סוס</th>
                <th className="px-4 py-3">מאמן</th>
                <th className="px-4 py-3">משלם</th>
                <th className="px-4 py-3">מקבל פרס</th>

                {canEditEntry && !props.drawOrderEditMode ? (
                  <th className="px-4 py-3">פעולות</th>
                ) : null}

                {props.drawOrderEditMode ? (
                  <>
                    <th className="px-4 py-3">התראות</th>
                    <th className="px-4 py-3">גרירה</th>
                  </>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {props.loading ? (
                <DataTableLoadingState
                  colSpan={colSpan}
                  message="טוען כניסות..."
                />
              ) : null}

              {!props.loading && items.length === 0 ? (
                <DataTableEmptyState
                  colSpan={colSpan}
                  message="לא נמצאו כניסות להצגה"
                />
              ) : null}

              {!props.loading
                ? items.map(function (item, index) {
                    return (
                      <SortableEntryRow
                        key={getEntryId(item) || index}
                        item={item}
                        index={index}
                        drawOrderEditMode={props.drawOrderEditMode}
                        canEditEntry={canEditEntry}
                        savingDrawOrder={props.savingDrawOrder}
                        onUpdateDraftDrawOrder={props.onUpdateDraftDrawOrder}
                        onEditEntry={props.onEditEntry}
                        onDeleteEntry={props.onDeleteEntry}
                      />
                    );
                  })
                : null}
            </tbody>
          </DataTableShell>
        </DndContext>
      </section>
    </div>
  );
}