using RideOnServer.BL.DTOs;
using RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeSlotInCompetition
    {
        private const int BeforeWindowDays = 3;

        private static readonly HashSet<string> DuringTimeOfDayValues = new HashSet<string> { "בוקר", "ערב" };
        private static readonly HashSet<string> BeforeTimeOfDayValues = new HashSet<string> { "בוקר", "צהריים", "ערב" };

        private static readonly Dictionary<DayOfWeek, string> HebrewDayNameByDayOfWeek = new Dictionary<DayOfWeek, string>
        {
            { DayOfWeek.Sunday, "ראשון" },
            { DayOfWeek.Monday, "שני" },
            { DayOfWeek.Tuesday, "שלישי" },
            { DayOfWeek.Wednesday, "רביעי" },
            { DayOfWeek.Thursday, "חמישי" },
            { DayOfWeek.Friday, "שישי" },
            { DayOfWeek.Saturday, "שבת" }
        };

        public int PaidTimeSlotInCompId { get; set; }
        public int CompetitionId { get; set; }
        public int PaidTimeSlotId { get; set; }
        public int ArenaRanchId { get; set; }
        public byte ArenaId { get; set; }
        public DateTime SlotDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? SlotStatus { get; set; }
        public string? SlotNotes { get; set; }
        public string? TimeOfDay { get; set; }
        public string? ArenaName { get; set; }
        public int TotalCapacityMinutes { get; set; }
        public int UsedCapacityMinutes { get; set; }
        public int RemainingCapacityMinutes { get; set; }
        public int EstimatedAvailablePlaces { get; set; }
        public int AssignedCount { get; set; }
        public int PendingRequestsCount { get; set; }

        internal static List<PaidTimeSlotInCompetition> GetPaidTimeSlotsByCompetitionId(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            return dal.GetPaidTimeSlotsByCompetitionId(competitionId);
        }

        internal static int CreatePaidTimeSlotInCompetition(
            CreatePaidTimeSlotInCompetitionRequest request,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            ValidateRequest(
                request.CompetitionId,
                request.PaidTimeSlotId,
                request.ArenaRanchId,
                request.ArenaId,
                request.SlotDate,
                request.StartTime,
                request.EndTime,
                competitionStartDate,
                competitionEndDate
            );

            PaidTimeSlotInCompetition item = new PaidTimeSlotInCompetition
            {
                CompetitionId = request.CompetitionId,
                PaidTimeSlotId = request.PaidTimeSlotId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                SlotDate = request.SlotDate,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                SlotStatus = string.IsNullOrWhiteSpace(request.SlotStatus) ? null : request.SlotStatus.Trim(),
                SlotNotes = string.IsNullOrWhiteSpace(request.SlotNotes) ? null : request.SlotNotes.Trim()
            };

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            return dal.InsertPaidTimeSlotInCompetition(item);
        }

        internal static void UpdatePaidTimeSlotInCompetition(
            UpdatePaidTimeSlotInCompetitionRequest request,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            if (request.PaidTimeSlotInCompId <= 0)
            {
                throw new Exception("PaidTimeSlotInCompId is invalid");
            }

            ValidateRequest(
                request.CompetitionId,
                request.PaidTimeSlotId,
                request.ArenaRanchId,
                request.ArenaId,
                request.SlotDate,
                request.StartTime,
                request.EndTime,
                competitionStartDate,
                competitionEndDate
            );

            PaidTimeSlotInCompetition item = new PaidTimeSlotInCompetition
            {
                PaidTimeSlotInCompId = request.PaidTimeSlotInCompId,
                CompetitionId = request.CompetitionId,
                PaidTimeSlotId = request.PaidTimeSlotId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                SlotDate = request.SlotDate,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                SlotStatus = string.IsNullOrWhiteSpace(request.SlotStatus) ? null : request.SlotStatus.Trim(),
                SlotNotes = string.IsNullOrWhiteSpace(request.SlotNotes) ? null : request.SlotNotes.Trim()
            };

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            dal.UpdatePaidTimeSlotInCompetition(item);
        }

        internal static void DeletePaidTimeSlotInCompetition(int PaidTimeSlotInCompId, bool forceDelete)
        {
            if (PaidTimeSlotInCompId <= 0)
            {
                throw new Exception("PaidTimeSlotInCompId is invalid");
            }

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            dal.DeletePaidTimeSlotInCompetition(PaidTimeSlotInCompId, forceDelete);
        }

        private static void ValidateRequest(
            int competitionId,
            int paidTimeSlotId,
            int arenaRanchId,
            byte arenaId,
            DateTime slotDate,
            TimeSpan startTime,
            TimeSpan endTime,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            if (arenaRanchId <= 0)
            {
                throw new Exception("ArenaRanchId is invalid");
            }

            if (paidTimeSlotId <= 0)
            {
                throw new ValidationException("יש לבחור יום בשבוע");
            }

            if (arenaId <= 0)
            {
                throw new ValidationException("יש לבחור מגרש");
            }

            if (endTime <= startTime)
            {
                throw new ValidationException("שעת הסיום חייבת להיות מאוחרת משעת ההתחלה");
            }

            if (!IsOnQuarterHourBoundary(startTime) || !IsOnQuarterHourBoundary(endTime))
            {
                throw new ValidationException("השעות חייבות להיות בכפולות של רבע שעה (00, 15, 30, 45 דקות)");
            }

            PaidTimeSlot? baseSlot = PaidTimeSlot.GetAllPaidTimeBaseSlots()
                .FirstOrDefault(slot => slot.PaidTimeSlotId == paidTimeSlotId);

            if (baseSlot == null)
            {
                throw new ValidationException("יש לבחור יום בשבוע");
            }

            DateTime beforeWindowStart = competitionStartDate.Date.AddDays(-BeforeWindowDays);
            DateTime beforeWindowEnd = competitionStartDate.Date.AddDays(-1);
            DateTime slotDateOnly = slotDate.Date;

            bool isDuringWindow = slotDateOnly >= competitionStartDate.Date && slotDateOnly <= competitionEndDate.Date;
            bool isBeforeWindow = slotDateOnly >= beforeWindowStart && slotDateOnly <= beforeWindowEnd;

            if (!isDuringWindow && !isBeforeWindow)
            {
                throw new ValidationException("התאריך אינו תואם את זמן התחרות");
            }

            if (!HebrewDayNameByDayOfWeek.TryGetValue(slotDateOnly.DayOfWeek, out string? expectedDayName) ||
                expectedDayName != baseSlot.DayOfWeek)
            {
                throw new ValidationException("התאריך אינו תואם את זמן התחרות");
            }

            HashSet<string> allowedTimeOfDayValues = isDuringWindow ? DuringTimeOfDayValues : BeforeTimeOfDayValues;

            if (!allowedTimeOfDayValues.Contains(baseSlot.TimeOfDay))
            {
                throw new ValidationException("מועד זה אינו זמין עבור הבחירה שנעשתה (לפני/במהלך התחרות)");
            }
        }

        private static bool IsOnQuarterHourBoundary(TimeSpan value)
        {
            return value.Seconds == 0 && value.Minutes % 15 == 0;
        }

        internal static PaidTimeSlotInCompetition? GetById(int PaidTimeSlotInCompId)
        {
            if (PaidTimeSlotInCompId <= 0)
            {
                throw new Exception("PaidTimeSlotInCompId is invalid");
            }

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            return dal.GetById(PaidTimeSlotInCompId);
        }
    }
}
