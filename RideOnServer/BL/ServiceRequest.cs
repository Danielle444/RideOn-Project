namespace RideOnServer.BL
{
    public class ServiceRequest
    {
        public int SRequestId { get; set; }

        public int OrderedBySystemUserId { get; set; }

        public int HorseId { get; set; }

        public int? RiderFederationMemberId { get; set; }

        public int? CoachFederationMemberId { get; set; }

        public int BillId { get; set; }

        public int? PaymentId { get; set; }

        public DateTime SRequestDateTime { get; set; }
    }
}