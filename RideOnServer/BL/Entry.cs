using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.DAL;
using RideOnServer.BL.Services;

namespace RideOnServer.BL
{
    public class Entry : ServiceRequest
    {
        public int ClassInCompId { get; set; }

        public int? FineId { get; set; }

        public string? PrizeRecipientName { get; set; }

        public byte? DrawOrder { get; set; }

        public static int CreateEntry(CreateEntryRequest request)
        {
            EntryDAL dal = new EntryDAL();
            return dal.InsertEntry(request);
        }

        public static List<PaidTimeCandidateItem> GetPaidTimeCandidatesByRanch(int competitionId, int ranchId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }
            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            EntryDAL dal = new EntryDAL();
            return dal.GetPaidTimeCandidatesByRanch(competitionId, ranchId);
        }


        public static List<MyCompetitionEntryItem>
            GetMyCompetitionEntries(
                int competitionId,
                int orderedBySystemUserId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (orderedBySystemUserId <= 0)
            {
                throw new Exception(
                    "Invalid OrderedBySystemUserId"
                );
            }

            EntryDAL dal = new EntryDAL();

            return dal.GetMyCompetitionEntries(
                competitionId,
                orderedBySystemUserId
            );
        }

        public static List<SecretaryCompetitionEntryItem> GetSecretaryCompetitionEntries(
           int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            EntryDAL dal = new EntryDAL();

            return dal.GetSecretaryCompetitionEntries(competitionId);
        }

        public static void UpdateClassEntriesDrawOrder(
          UpdateClassEntriesDrawOrderRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.ClassInCompId <= 0)
            {
                throw new Exception("Invalid ClassInCompId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.Entries == null || request.Entries.Count == 0)
            {
                throw new Exception("Entries list is empty");
            }

            if (request.Entries.Any(item => item.EntryId <= 0))
            {
                throw new Exception("Entries contain invalid EntryId");
            }

            if (request.Entries.Any(item => item.DrawOrder <= 0))
            {
                throw new Exception("Entries contain invalid DrawOrder");
            }

            var duplicateEntryIds = request.Entries
                .GroupBy(item => item.EntryId)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateEntryIds.Count > 0)
            {
                throw new Exception("Entries contain duplicate EntryId values");
            }

            var duplicateDrawOrders = request.Entries
                .GroupBy(item => item.DrawOrder)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateDrawOrders.Count > 0)
            {
                throw new Exception("Entries contain duplicate DrawOrder values");
            }

            EntryDAL dal = new EntryDAL();

            dal.UpdateClassEntriesDrawOrder(request);
        }

        public static void UpdateGroupEntriesDrawOrder(
           UpdateGroupEntriesDrawOrderRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.ClassDate == default)
            {
                throw new Exception("Invalid ClassDate");
            }

            if (request.OrderInDay <= 0)
            {
                throw new Exception("Invalid OrderInDay");
            }

            if (request.Entries == null || request.Entries.Count == 0)
            {
                throw new Exception("Entries list is empty");
            }

            if (request.Entries.Any(item => item.EntryId <= 0))
            {
                throw new Exception("Entries contain invalid EntryId");
            }

            if (request.Entries.Any(item => item.DrawOrder <= 0))
            {
                throw new Exception("Entries contain invalid DrawOrder");
            }

            var duplicateEntryIds = request.Entries
                .GroupBy(item => item.EntryId)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateEntryIds.Count > 0)
            {
                throw new Exception("Entries contain duplicate EntryId values");
            }

            var duplicateDrawOrders = request.Entries
                .GroupBy(item => item.DrawOrder)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicateDrawOrders.Count > 0)
            {
                throw new Exception("Entries contain duplicate DrawOrder values");
            }

            EntryDAL dal = new EntryDAL();

            dal.UpdateGroupEntriesDrawOrder(request);
        }

        public static GroupDrawOrderPreviewResponse GenerateGroupDrawOrderPreview(
    GenerateGroupDrawOrderPreviewRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.ClassDate == default)
            {
                throw new Exception("Invalid ClassDate");
            }

            if (request.OrderInDay <= 0)
            {
                throw new Exception("Invalid OrderInDay");
            }

            if (request.MinimumGap <= 0)
            {
                request.MinimumGap = 7;
            }

            EntryDAL dal = new EntryDAL();

            List<SecretaryCompetitionEntryItem> allEntries =
                dal.GetSecretaryCompetitionEntries(request.CompetitionId);

            List<SecretaryCompetitionEntryItem> groupEntries =
                allEntries
                    .Where(item =>
                        item.ClassDate.HasValue &&
                        item.ClassDate.Value.Date == request.ClassDate.Date &&
                        item.OrderInDay.HasValue &&
                        item.OrderInDay.Value == request.OrderInDay
                    )
                    .ToList();

            if (groupEntries.Count == 0)
            {
                throw new Exception("No entries found for selected draw group");
            }

            return DrawOrderGenerator.GeneratePreview(
                groupEntries,
                request.MinimumGap
            );
        }

        public static void ClearGroupEntriesDrawOrder(
    ClearGroupEntriesDrawOrderRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.ClassDate == default)
            {
                throw new Exception("Invalid ClassDate");
            }

            if (request.OrderInDay <= 0)
            {
                throw new Exception("Invalid OrderInDay");
            }

            EntryDAL dal = new EntryDAL();

            dal.ClearGroupEntriesDrawOrder(request);
        }




    }
}