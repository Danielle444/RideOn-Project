import { getCompetitionInvitationDetails } from "./competitionService";
import { getPaidTimeCandidatesByRanch } from "./entriesService";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function findPaidTimeSection(sections) {
  return (
    safeArray(sections).find(function (section) {
      return (
        String(section?.categoryName || "").trim() === "פייד טיים" ||
        Number(section?.categoryId) === 1
      );
    }) || null
  );
}

function buildPriceCatalog(items) {
  const all = safeArray(items).map(function (item) {
    return {
      priceCatalogId: item.priceCatalogId || item.PriceCatalogId,
      productId: item.productId || item.ProductId,
      productName: item.productName || item.ProductName || "",
      durationMinutes:
        item.durationMinutes || item.DurationMinutes || 0,
      itemPrice: item.itemPrice || item.ItemPrice || 0,
    };
  });

  const sorted = [...all].sort(function (a, b) {
    return (a.durationMinutes || 0) - (b.durationMinutes || 0);
  });

  const short = sorted[0] || null;
  const long = sorted.length > 1 ? sorted[sorted.length - 1] : sorted[0] || null;

  return { short: short, long: long, all: all };
}

function normalizeSlot(slot) {
  if (!slot) return null;
  return {
    paidTimeSlotInCompId:
      slot.paidTimeSlotInCompId || slot.PaidTimeSlotInCompId,
    competitionId: slot.competitionId || slot.CompetitionId,
    paidTimeSlotId: slot.paidTimeSlotId || slot.PaidTimeSlotId,
    slotDate: slot.slotDate || slot.SlotDate,
    timeOfDay: slot.timeOfDay || slot.TimeOfDay,
    startTime: slot.startTime || slot.StartTime,
    endTime: slot.endTime || slot.EndTime,
    arenaRanchId: slot.arenaRanchId || slot.ArenaRanchId,
    arenaId: slot.arenaId || slot.ArenaId,
    arenaName: slot.arenaName || slot.ArenaName || "",
    slotStatus: slot.slotStatus || slot.SlotStatus,
  };
}

function buildSlotsByDay(slots) {
  const out = {};
  for (const raw of safeArray(slots)) {
    const s = normalizeSlot(raw);
    if (!s || !s.slotDate) continue;
    const key = String(s.slotDate).slice(0, 10);
    if (!out[key]) out[key] = [];
    out[key].push(s);
  }
  return out;
}

function buildArenas(slotsByDay) {
  const seen = {};
  for (const day of Object.keys(slotsByDay)) {
    for (const s of slotsByDay[day]) {
      const key = s.arenaRanchId + "-" + s.arenaId;
      if (!seen[key]) {
        seen[key] = {
          key: key,
          arenaRanchId: s.arenaRanchId,
          arenaId: s.arenaId,
          arenaName: s.arenaName,
        };
      }
    }
  }
  return Object.values(seen);
}

function buildDays(slotsByDay) {
  return Object.keys(slotsByDay)
    .sort()
    .map(function (key) {
      return { date: key, hasSlots: true };
    });
}

function lookupKey(coachId, horseId) {
  return String(coachId) + "-" + String(horseId);
}

function buildCoachesWithHorses(candidates) {
  const byCoach = new Map();

  for (const c of safeArray(candidates)) {
    const coachId = c.coachFederationMemberId;
    if (!coachId) continue;

    if (!byCoach.has(coachId)) {
      byCoach.set(coachId, {
        coachFederationMemberId: coachId,
        coachName: c.coachName || "מאמן",
        horses: new Map(),
      });
    }

    const entry = byCoach.get(coachId);
    if (!entry.horses.has(c.horseId)) {
      entry.horses.set(c.horseId, {
        horseId: c.horseId,
        horseName: c.horseName || "",
        barnName: c.barnName || "",
      });
    }
  }

  return Array.from(byCoach.values()).map(function (e) {
    return {
      coachFederationMemberId: e.coachFederationMemberId,
      coachName: e.coachName,
      horses: Array.from(e.horses.values()),
    };
  });
}

function buildEntryLookup(candidates) {
  const out = {};
  for (const c of safeArray(candidates)) {
    if (!c.coachFederationMemberId || !c.horseId) continue;
    const key = lookupKey(c.coachFederationMemberId, c.horseId);
    if (!out[key]) {
      out[key] = {
        entryId: c.entryId,
        classInCompId: c.classInCompId,
        riderFederationMemberId: c.riderFederationMemberId,
        riderName: c.riderName || "",
        paidByPersonId: c.paidByPersonId,
        payerName: c.payerName || "",
      };
    }
  }
  return out;
}

function extractCompetitionDates(invitation) {
  const comp = invitation?.competition || {};
  return {
    competitionStartDate:
      comp.competitionStartDate || comp.CompetitionStartDate || null,
    competitionEndDate:
      comp.competitionEndDate || comp.CompetitionEndDate || null,
  };
}

async function loadPaidTimeChatbotContext({ ranchId, competitionId, roleId }) {
  const results = await Promise.all([
    getCompetitionInvitationDetails(competitionId, roleId, ranchId),
    getPaidTimeCandidatesByRanch(competitionId, ranchId),
  ]);

  const invitation = results[0]?.data || {};
  const candidates = safeArray(results[1]?.data);

  const paidTimeSection = findPaidTimeSection(invitation.servicePriceSections);
  const priceCatalog = buildPriceCatalog(paidTimeSection?.items);

  const slotsByDay = buildSlotsByDay(invitation.paidTimeSlots);
  const arenas = buildArenas(slotsByDay);
  const days = buildDays(slotsByDay);

  const coachesWithHorses = buildCoachesWithHorses(candidates);
  const entryLookup = buildEntryLookup(candidates);

  const competitionDates = extractCompetitionDates(invitation);

  return {
    coachesWithHorses: coachesWithHorses,
    entryLookup: entryLookup,
    days: days,
    arenas: arenas,
    slotsByDay: slotsByDay,
    priceCatalog: priceCatalog,
    competitionStartDate: competitionDates.competitionStartDate,
    competitionEndDate: competitionDates.competitionEndDate,
  };
}

export { loadPaidTimeChatbotContext, lookupKey };
