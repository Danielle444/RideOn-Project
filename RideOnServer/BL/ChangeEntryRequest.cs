using RideOnServer.BL.DTOs.ChangeEntryRequest;
using RideOnServer.BL.Services;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ChangeEntryRequest
    {
        public int ChangeEntryRequestId { get; set; }

        public int OriginalEntryId { get; set; }

        public int? NewEntryId { get; set; }

        public DateTime RequestDateTime { get; set; }

        public string? Status { get; set; }

        public bool IsCancelled { get; set; }

        public int? FineId { get; set; }

        public decimal? FineAmountSnapshot { get; set; }

        // Thin passthrough to the read-only authorization-context lookup (218).
        // Called by the controller BEFORE CreateRequest, so 404/400/403/409 can
        // be classified from plain booleans - never from exception text.
        internal static ChangeEntryRequestAuthorizationContext GetAuthorizationContext(
            int originalEntryId,
            int? newEntryId,
            int competitionId,
            int personId
        )
        {
            ChangeEntryRequestDAL dal = new ChangeEntryRequestDAL();

            return dal.GetAuthorizationContext(
                originalEntryId,
                newEntryId,
                competitionId,
                personId
            );
        }

        internal static int CreateRequest(
            Competition competition,
            int originalEntryId,
            int? newEntryId,
            bool isCancelled,
            int personId,
            int competitionId
        )
        {
            string fineReason =
                isCancelled
                    ? "EntryCancellation"
                    : "EntryChange";

            Fine? fine =
                FineResolver.ResolveFine(
                    competition,
                    fineReason,
                    DateTime.UtcNow
                );

            ChangeEntryRequestDAL dal =
                new ChangeEntryRequestDAL();

            return dal.InsertChangeEntryRequest(
                originalEntryId,
                newEntryId,
                isCancelled,
                fine?.FineId,
                fine?.FineAmount,
                personId,
                competitionId
            );
        }

        internal static int CancelByPayer(int entryId, int payerPersonId)
        {
            if (entryId <= 0)
            {
                throw new Exception("Invalid EntryId");
            }

            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            ChangeEntryRequestDAL dal = new ChangeEntryRequestDAL();
            return dal.CancelEntryByPayer(entryId, payerPersonId);
        }
    }

}