using RideOnServer.BL.DTOs;
using RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeSlotInCompetition
    {
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

        // UI helpers
        public string? TimeOfDay { get; set; }
        public string? ArenaName { get; set; }

        internal static List<PaidTimeSlotInCompetition> GetPaidTimeSlotsByCompetitionId(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            return dal.GetPaidTimeSlotsByCompetitionId(competitionId);
        }

        internal static int CreatePaidTimeSlotInCompetition(CreatePaidTimeSlotInCompetitionRequest request)
        {
            ValidateRequest(
                request.CompetitionId,
                request.PaidTimeSlotId,
                request.ArenaRanchId,
                request.ArenaId,
                request.StartTime,
                request.EndTime
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

        internal static void UpdatePaidTimeSlotInCompetition(UpdatePaidTimeSlotInCompetitionRequest request)
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
                request.StartTime,
                request.EndTime
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
            TimeSpan startTime,
            TimeSpan endTime)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            if (paidTimeSlotId <= 0)
            {
                throw new Exception("PaidTimeSlotId is invalid");
            }

            if (arenaRanchId <= 0)
            {
                throw new Exception("ArenaRanchId is invalid");
            }

            if (arenaId <= 0)
            {
                throw new Exception("ArenaId is invalid");
            }

            if (endTime <= startTime)
            {
                throw new Exception("EndTime must be later than StartTime");
            }
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