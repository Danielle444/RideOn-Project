using RideOnServer.BL.DTOs.Competition.ClassInCompetition;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ClassInCompetition
    {
        public int ClassInCompId { get; set; }
        public int CompetitionId { get; set; }
        public short ClassTypeId { get; set; }
        public int ArenaRanchId { get; set; }
        public byte ArenaId { get; set; }
        public DateTime? ClassDateTime { get; set; }
        public decimal? OrganizerCost { get; set; }
        public decimal? FederationCost { get; set; }
        public string? ClassNotes { get; set; }
        public TimeSpan? StartTime { get; set; }
        public byte? OrderInDay { get; set; }

        public List<int> JudgeIds { get; set; } = new List<int>();
        public byte? PrizeTypeId { get; set; }
        public string? PrizeTypeName { get; set; }
        public decimal? PrizeAmount { get; set; }

        public short? PatternNumber { get; set; }

        public string? ClassName { get; set; }
        public string? ArenaName { get; set; }
        public string? JudgesDisplay { get; set; }

        internal static List<ClassInCompetition> GetClassesByCompetitionId(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            return dal.GetClassesByCompetitionId(competitionId);
        }

        internal static int CreateClassInCompetition(CreateClassInCompetitionRequest request)
        {
            ValidateRequest(
                request.CompetitionId,
                request.ClassTypeId,
                request.ArenaRanchId,
                request.ArenaId,
                request.OrganizerCost,
                request.FederationCost,
                request.JudgeIds,
                request.PrizeTypeId,
                request.PrizeAmount,
                request.PatternNumber
            );

            ClassInCompetition item = new ClassInCompetition
            {
                CompetitionId = request.CompetitionId,
                ClassTypeId = request.ClassTypeId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                ClassDateTime = request.ClassDateTime?.Date,
                StartTime = request.StartTime,
                OrderInDay = request.OrderInDay,
                OrganizerCost = request.OrganizerCost,
                FederationCost = request.FederationCost,
                ClassNotes = string.IsNullOrWhiteSpace(request.ClassNotes) ? null : request.ClassNotes.Trim(),
                JudgeIds = request.JudgeIds?.Distinct().ToList() ?? new List<int>(),
                PrizeTypeId = request.PrizeTypeId,
                PrizeAmount = request.PrizeAmount,
                PatternNumber = request.PatternNumber
            };

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            return dal.InsertClassInCompetition(item);
        }

        internal static void UpdateClassInCompetition(UpdateClassInCompetitionRequest request)
        {
            if (request.ClassInCompId <= 0)
            {
                throw new Exception("ClassInCompId is invalid");
            }

            ValidateRequest(
                request.CompetitionId,
                request.ClassTypeId,
                request.ArenaRanchId,
                request.ArenaId,
                request.OrganizerCost,
                request.FederationCost,
                request.JudgeIds,
                request.PrizeTypeId,
                request.PrizeAmount,
                request.PatternNumber
            );

            ClassInCompetition item = new ClassInCompetition
            {
                ClassInCompId = request.ClassInCompId,
                CompetitionId = request.CompetitionId,
                ClassTypeId = request.ClassTypeId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                ClassDateTime = request.ClassDateTime?.Date,
                StartTime = request.StartTime,
                OrderInDay = request.OrderInDay,
                OrganizerCost = request.OrganizerCost,
                FederationCost = request.FederationCost,
                ClassNotes = string.IsNullOrWhiteSpace(request.ClassNotes) ? null : request.ClassNotes.Trim(),
                JudgeIds = request.JudgeIds?.Distinct().ToList() ?? new List<int>(),
                PrizeTypeId = request.PrizeTypeId,
                PrizeAmount = request.PrizeAmount,
                PatternNumber = request.PatternNumber
            };

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            dal.UpdateClassInCompetition(item);
        }

        internal static void DeleteClassInCompetition(int classInCompId)
        {
            if (classInCompId <= 0)
            {
                throw new Exception("ClassInCompId is invalid");
            }

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            dal.DeleteClassInCompetition(classInCompId);
        }

        private static void ValidateRequest(
            int competitionId,
            short classTypeId,
            int arenaRanchId,
            byte arenaId,
            decimal? organizerCost,
            decimal? federationCost,
            List<int>? judgeIds,
            byte? prizeTypeId,
            decimal? prizeAmount,
            short? patternNumber)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            if (classTypeId <= 0)
            {
                throw new Exception("ClassTypeId is invalid");
            }

            if (arenaRanchId <= 0)
            {
                throw new Exception("ArenaRanchId is invalid");
            }

            if (arenaId <= 0)
            {
                throw new Exception("ArenaId is invalid");
            }

            if (organizerCost.HasValue && organizerCost.Value < 0)
            {
                throw new Exception("OrganizerCost cannot be negative");
            }

            if (federationCost.HasValue && federationCost.Value < 0)
            {
                throw new Exception("FederationCost cannot be negative");
            }

            if (judgeIds == null || judgeIds.Count == 0)
            {
                throw new Exception("At least one judge must be selected for the class");
            }

            if (judgeIds.Any(id => id <= 0))
            {
                throw new Exception("JudgeIds contain invalid values");
            }

            bool hasPrizeType = prizeTypeId.HasValue;
            bool hasPrizeAmount = prizeAmount.HasValue;

            if (hasPrizeType && !hasPrizeAmount)
            {
                throw new Exception("Prize amount is required when prize type is selected");
            }

            if (!hasPrizeType && hasPrizeAmount)
            {
                throw new Exception("Prize type is required when prize amount is entered");
            }

            if (prizeAmount.HasValue && prizeAmount.Value < 0)
            {
                throw new Exception("Prize amount cannot be negative");
            }

            if (patternNumber.HasValue && patternNumber.Value <= 0)
            {
                throw new Exception("PatternNumber is invalid");
            }
        }
    }
}