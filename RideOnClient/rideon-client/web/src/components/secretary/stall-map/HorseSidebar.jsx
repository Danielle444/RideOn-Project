import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Search } from "lucide-react";
import DraggableItem from "../../common/dnd/DraggableItem";

function getHorseDisplayName(horse) {
  return horse.barnName || horse.horseName || "סוס ללא שם";
}

function getHorseSecondaryName(horse) {
  if (horse.barnName && horse.horseName) {
    return horse.horseName;
  }

  return horse.federationNumber ? "מס׳ התאחדות: " + horse.federationNumber : "";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function DraggableHorse({ horse, isAssigned }) {
  return (
    <DraggableItem
      id={`horse-${horse.horseId}`}
      data={{ horse: horse }}
      disabled={isAssigned}
      className={[
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-right transition-all",
        isAssigned
          ? "cursor-default border-[#E0D0C8] bg-[#F9F5F2] opacity-55"
          : "cursor-grab border-[#D7CCC8] bg-white hover:border-[#A5836A] hover:shadow-sm active:cursor-grabbing",
      ].join(" ")}
      draggingClassName="border-[#795548] bg-[#F5EDE8] shadow-lg opacity-90 z-50"
    >
      <span className="text-lg leading-none">🐴</span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-bold text-[#3F312B]">
          {getHorseDisplayName(horse)}
        </span>

        {getHorseSecondaryName(horse) && (
          <span className="truncate text-[10px] leading-4 text-[#8D6E63]">
            {getHorseSecondaryName(horse)}
          </span>
        )}
      </div>

      {isAssigned && (
        <span className="shrink-0 rounded-full bg-[#E8DDD8] px-1.5 py-0.5 text-[10px] font-medium text-[#7B5A4D]">
          משובץ
        </span>
      )}
    </DraggableItem>
  );
}

function RanchHorseGroup({ group, isOpen, onToggle, assignedHorseIds }) {
  const assignedCount = group.horses.filter(function (horse) {
    return assignedHorseIds.has(horse.horseId);
  }).length;

  const waitingCount = group.horses.length - assignedCount;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EFE5DF] bg-[#FFFDFC]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-right transition hover:bg-[#FAF5F1]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3ECE8] text-[#7B5A4D]">
          {isOpen ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[#3F312B]">
            {group.ranchName}
          </div>

          <div className="text-[11px] text-[#8D6E63]">
            {waitingCount} ממתינים • {assignedCount} משובצים
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-[#EFE5DF] px-2 py-0.5 text-[11px] font-semibold text-[#7B5A4D]">
          {group.horses.length}
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-1.5 border-t border-[#F1E5DE] bg-[#FBF7F4] p-2">
          {group.horses.map(function (horse) {
            const isAssigned = assignedHorseIds.has(horse.horseId);

            return (
              <DraggableHorse
                key={horse.horseId}
                horse={horse}
                isAssigned={isAssigned}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupHorsesByRanch(horses, searchValue) {
  const search = normalizeText(searchValue);
  const groupsMap = {};

  horses.forEach(function (horse) {
    const ranchId = horse.ranchId || 0;
    const ranchName = horse.ranchName || "חווה לא ידועה";

    const horseName = normalizeText(horse.horseName);
    const barnName = normalizeText(horse.barnName);
    const federationNumber = normalizeText(horse.federationNumber);
    const normalizedRanchName = normalizeText(ranchName);

    const matchesSearch =
      !search ||
      horseName.includes(search) ||
      barnName.includes(search) ||
      federationNumber.includes(search) ||
      normalizedRanchName.includes(search);

    if (!matchesSearch) return;

    if (!groupsMap[ranchId]) {
      groupsMap[ranchId] = {
        ranchId: ranchId,
        ranchName: ranchName,
        horses: [],
      };
    }

    groupsMap[ranchId].horses.push(horse);
  });

  return Object.values(groupsMap)
    .map(function (group) {
      return {
        ...group,
        horses: group.horses.sort(function (a, b) {
          return getHorseDisplayName(a).localeCompare(
            getHorseDisplayName(b),
            "he",
          );
        }),
      };
    })
    .sort(function (a, b) {
      return a.ranchName.localeCompare(b.ranchName, "he");
    });
}

export default function HorseSidebar({ horses, assignments }) {
  const [searchValue, setSearchValue] = useState("");
  const [openRanches, setOpenRanches] = useState({});

  const assignedHorseIds = useMemo(
    function () {
      return new Set(
        assignments.map(function (assignment) {
          return assignment.horseId;
        }),
      );
    },
    [assignments],
  );

  const groupedHorses = useMemo(
    function () {
      return groupHorsesByRanch(horses, searchValue);
    },
    [horses, searchValue],
  );

  const totalAssigned = horses.filter(function (horse) {
    return assignedHorseIds.has(horse.horseId);
  }).length;

  const totalWaiting = horses.length - totalAssigned;

  function handleToggleRanch(ranchId) {
    setOpenRanches(function (prev) {
      return {
        ...prev,
        [ranchId]: !prev[ranchId],
      };
    });
  }

  function isGroupOpen(group, index) {
    if (openRanches[group.ranchId] !== undefined) {
      return openRanches[group.ranchId];
    }

    return index === 0;
  }

  return (
    <div className="flex h-full flex-col gap-3" dir="rtl">
      <div className="px-1">
        <h3 className="text-sm font-bold text-[#3F312B]">סוסים לשיבוץ</h3>
        <p className="text-xs text-[#8D6E63]">
          {groupedHorses.length} חוות • {totalWaiting} ממתינים • {totalAssigned}{" "}
          משובצים
        </p>
      </div>

      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A1887F]"
        />

        <input
          type="text"
          value={searchValue}
          onChange={function (event) {
            setSearchValue(event.target.value);
          }}
          placeholder="חיפוש חווה / סוס"
          className="w-full rounded-2xl border border-[#E6D8D0] bg-[#FFFDFC] py-2 pr-9 pl-3 text-xs text-[#3F312B] outline-none transition placeholder:text-[#BCAAA4] focus:border-[#A5836A] focus:ring-2 focus:ring-[#F3ECE8]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1">
        {horses.length === 0 && (
          <p className="py-4 text-center text-xs text-[#BCAAA4]">
            אין סוסים עם הזמנת תא בתחרות זו
          </p>
        )}

        {horses.length > 0 && groupedHorses.length === 0 && (
          <p className="py-4 text-center text-xs text-[#BCAAA4]">
            לא נמצאו סוסים לפי החיפוש
          </p>
        )}

        {groupedHorses.map(function (group, index) {
          return (
            <RanchHorseGroup
              key={group.ranchId}
              group={group}
              isOpen={isGroupOpen(group, index)}
              onToggle={function () {
                handleToggleRanch(group.ranchId);
              }}
              assignedHorseIds={assignedHorseIds}
            />
          );
        })}
      </div>
    </div>
  );
}
