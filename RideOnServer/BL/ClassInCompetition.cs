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

        // UI helper
        public string? ClassName { get; set; }

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
                request.FederationCost
            );

            ClassInCompetition item = new ClassInCompetition
            {
                CompetitionId = request.CompetitionId,
                ClassTypeId = request.ClassTypeId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                ClassDateTime = request.ClassDateTime,
                StartTime = request.StartTime,
                OrderInDay = request.OrderInDay,
                OrganizerCost = request.OrganizerCost,
                FederationCost = request.FederationCost,
                ClassNotes = string.IsNullOrWhiteSpace(request.ClassNotes) ? null : request.ClassNotes.Trim()
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
                request.FederationCost
            );

            ClassInCompetition item = new ClassInCompetition
            {
                ClassInCompId = request.ClassInCompId,
                CompetitionId = request.CompetitionId,
                ClassTypeId = request.ClassTypeId,
                ArenaRanchId = request.ArenaRanchId,
                ArenaId = request.ArenaId,
                ClassDateTime = request.ClassDateTime,
                StartTime = request.StartTime,
                OrderInDay = request.OrderInDay,
                OrganizerCost = request.OrganizerCost,
                FederationCost = request.FederationCost,
                ClassNotes = string.IsNullOrWhiteSpace(request.ClassNotes) ? null : request.ClassNotes.Trim()
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
            decimal? federationCost)
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
        }
    }
}