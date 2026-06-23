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

        public static List<PastCompetitionWithEntriesItem> GetMyPastCompetitionsWithEntries(
            int orderedBySystemUserId,
            int excludeCompetitionId)
        {
            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            if (excludeCompetitionId <= 0)
            {
                throw new Exception("Invalid ExcludeCompetitionId");
            }

            EntryDAL dal = new EntryDAL();
            return dal.GetMyPastCompetitionsWithEntries(
                orderedBySystemUserId,
                excludeCompetitionId
            );
        }

        public static List<DuplicatableEntryItem> GetDuplicatableEntriesFromCompetition(
            int sourceCompetitionId,
            int targetCompetitionId,
            int orderedBySystemUserId)
        {
            if (sourceCompetitionId <= 0)
            {
                throw new Exception("Invalid SourceCompetitionId");
            }

            if (targetCompetitionId <= 0)
            {
                throw new Exception("Invalid TargetCompetitionId");
            }

            if (sourceCompetitionId == targetCompetitionId)
            {
                throw new Exception("Source and target competition must differ");
            }

            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            EntryDAL dal = new EntryDAL();
            return dal.GetDuplicatableEntriesFromCompetition(
                sourceCompetitionId,
                targetCompetitionId,
                orderedBySystemUserId
            );
        }

        public static BulkDuplicateEntriesResponse BulkDuplicateEntries(
            BulkDuplicateEntriesRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.SourceCompetitionId <= 0)
            {
                throw new Exception("Invalid SourceCompetitionId");
            }

            if (request.TargetCompetitionId <= 0)
            {
                throw new Exception("Invalid TargetCompetitionId");
            }

            if (request.SourceCompetitionId == request.TargetCompetitionId)
            {
                throw new Exception("Source and target competition must differ");
            }

            if (request.OrderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.Entries == null || request.Entries.Count == 0)
            {
                throw new Exception("Entries list is empty");
            }

            EntryDAL dal = new EntryDAL();

            // Source-of-truth data lookup: pull the full duplicatable set for
            // the requested source+target, then index by sourceEntryId.
            List<DuplicatableEntryItem> available =
                dal.GetDuplicatableEntriesFromCompetition(
                    request.SourceCompetitionId,
                    request.TargetCompetitionId,
                    request.OrderedBySystemUserId
                );

            Dictionary<int, DuplicatableEntryItem> bySourceId =
                available.ToDictionary(e => e.SourceEntryId);

            BulkDuplicateEntriesResponse response = new BulkDuplicateEntriesResponse();

            foreach (BulkDuplicateEntryItem requested in request.Entries)
            {
                BulkDuplicateEntryResult itemResult = new BulkDuplicateEntryResult
                {
                    SourceEntryId = requested.SourceEntryId
                };

                try
                {
                    if (!bySourceId.TryGetValue(requested.SourceEntryId, out var src) || src == null)
                    {
                        throw new Exception("Source entry not found or no longer eligible");
                    }

                    if (src.AlreadyExists)
                    {
                        throw new Exception("הרשמה כבר קיימת בתחרות החדשה");
                    }

                    if (!src.TargetClassInCompId.HasValue ||
                        src.TargetClassInCompId.Value != requested.TargetClassInCompId)
                    {
                        throw new Exception("המקצה ביעד אינו תואם למקצה במקור");
                    }

                    CreateEntryRequest createRequest = new CreateEntryRequest
                    {
                        ClassInCompId = requested.TargetClassInCompId,
                        OrderedBySystemUserId = request.OrderedBySystemUserId,
                        RanchId = request.RanchId,
                        HorseId = src.HorseId,
                        RiderFederationMemberId = src.RiderFederationMemberId,
                        PaidByPersonId = src.PaidByPersonId,
                        CoachFederationMemberId = src.CoachFederationMemberId,
                        PrizeRecipientName = src.PrizeRecipientName
                    };

                    int newEntryId = dal.InsertEntry(createRequest);

                    itemResult.NewEntryId = newEntryId;
                    itemResult.Success = true;
                    response.SuccessCount++;
                }
                catch (Exception ex)
                {
                    itemResult.Success = false;
                    itemResult.ErrorMessage = ex.Message;
                    response.FailureCount++;
                }

                response.Results.Add(itemResult);
            }

            return response;
        }

        public static int SecretaryDeleteEntry(int entryId, int secretarySystemUserId)
        {
            if (entryId <= 0)
            {
                throw new Exception("Invalid EntryId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            EntryDAL dal = new EntryDAL();
            return dal.SecretaryDeleteEntry(entryId, secretarySystemUserId);
        }
    }
}