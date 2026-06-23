namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class TransferPaidTimeRequestToSlotRequest
    {
        public int PaidTimeRequestId { get; set; }

        public int RanchId { get; set; }

        // Pass null to UNASSIGN the request (sets status back to Pending).
        public int? NewSlotInCompId { get; set; }
    }
}
