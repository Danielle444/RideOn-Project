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


        internal static int CreateRequest(
            Competition competition,
            int originalEntryId,
            int? newEntryId,
            bool isCancelled
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
                fine?.FineAmount
            );
        }
    }

}