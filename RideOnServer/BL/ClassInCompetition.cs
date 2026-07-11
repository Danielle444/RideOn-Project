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
        public List<ClassPrizeItem> Prizes { get; set; } = new List<ClassPrizeItem>();
        public string? PrizesDisplay { get; set; }

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

        internal static ClassInCompetition? GetClassById(int classInCompId)
        {
            if (classInCompId <= 0)
            {
                throw new Exception("ClassInCompId is invalid");
            }

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            return dal.GetClassById(classInCompId);
        }

        internal static int CreateClassInCompetition(
            CreateClassInCompetitionRequest request,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            List<ClassPrizeItem> prizes = NormalizePrizes(request.Prizes);

            ValidateRequest(
                request.CompetitionId,
                request.ClassTypeId,
                request.ArenaRanchId,
                request.ArenaId,
                request.ClassDateTime,
                request.OrganizerCost,
                request.FederationCost,
                request.JudgeIds,
                prizes,
                request.PatternNumber,
                competitionStartDate,
                competitionEndDate
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
                Prizes = prizes,
                PatternNumber = request.PatternNumber
            };

            ClassInCompetitionDAL dal = new ClassInCompetitionDAL();
            return dal.InsertClassInCompetition(item);
        }

        internal static void UpdateClassInCompetition(
            UpdateClassInCompetitionRequest request,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            if (request.ClassInCompId <= 0)
            {
                throw new Exception("ClassInCompId is invalid");
            }

            List<ClassPrizeItem> prizes = NormalizePrizes(request.Prizes);

            ValidateRequest(
                request.CompetitionId,
                request.ClassTypeId,
                request.ArenaRanchId,
                request.ArenaId,
                request.ClassDateTime,
                request.OrganizerCost,
                request.FederationCost,
                request.JudgeIds,
                prizes,
                request.PatternNumber,
                competitionStartDate,
                competitionEndDate
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
                Prizes = prizes,
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

        private static List<ClassPrizeItem> NormalizePrizes(List<ClassPrizeItem>? prizes)
        {
            if (prizes == null)
            {
                return new List<ClassPrizeItem>();
            }

            return prizes
                .Where(prize => prize.PrizeTypeId.HasValue || prize.PrizeAmount.HasValue)
                .ToList();
        }

        private static void ValidateRequest(
            int competitionId,
            short classTypeId,
            int arenaRanchId,
            byte arenaId,
            DateTime? classDateTime,
            decimal? organizerCost,
            decimal? federationCost,
            List<int>? judgeIds,
            List<ClassPrizeItem> prizes,
            short? patternNumber,
            DateTime competitionStartDate,
            DateTime competitionEndDate)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            if (classTypeId <= 0)
            {
                throw new ValidationException("יש לבחור סוג מקצה");
            }

            if (arenaRanchId <= 0)
            {
                throw new Exception("ArenaRanchId is invalid");
            }

            if (arenaId <= 0)
            {
                throw new ValidationException("יש לבחור מגרש");
            }

            if (classDateTime.HasValue &&
                (classDateTime.Value.Date < competitionStartDate.Date ||
                 classDateTime.Value.Date > competitionEndDate.Date))
            {
                throw new ValidationException("תאריך המקצה חייב להיות בטווח תאריכי התחרות");
            }

            if (!organizerCost.HasValue || organizerCost.Value < 0)
            {
                throw new ValidationException("יש להזין עלות מארגן (0 ומעלה)");
            }

            if (!federationCost.HasValue || federationCost.Value < 0)
            {
                throw new ValidationException("יש להזין עלות התאחדות (0 ומעלה)");
            }

            if (judgeIds != null && judgeIds.Any(id => id <= 0))
            {
                throw new Exception("JudgeIds contain invalid values");
            }

            ValidatePrizes(prizes);

            if (patternNumber.HasValue && patternNumber.Value <= 0)
            {
                throw new Exception("PatternNumber is invalid");
            }
        }

        private static void ValidatePrizes(List<ClassPrizeItem> prizes)
        {
            foreach (ClassPrizeItem prize in prizes)
            {
                bool hasPrizeType = prize.PrizeTypeId.HasValue;
                bool hasPrizeAmount = prize.PrizeAmount.HasValue;

                if (hasPrizeType && !hasPrizeAmount)
                {
                    throw new ValidationException("יש להזין סכום פרס עבור כל סוג פרס שנבחר");
                }

                if (!hasPrizeType && hasPrizeAmount)
                {
                    throw new ValidationException("יש לבחור סוג פרס עבור כל סכום שהוזן");
                }

                if (prize.PrizeAmount.HasValue && prize.PrizeAmount.Value < 0)
                {
                    throw new ValidationException("סכום הפרס אינו יכול להיות שלילי");
                }
            }

            var duplicateTypeIds = prizes
                .Where(prize => prize.PrizeTypeId.HasValue)
                .GroupBy(prize => prize.PrizeTypeId!.Value)
                .Where(group => group.Count() > 1);

            if (duplicateTypeIds.Any())
            {
                throw new ValidationException("לא ניתן לבחור אותו סוג פרס יותר מפעם אחת באותו מקצה");
            }
        }
    }
}
