namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationCreditAllocationItem
    {
        public int FederationCreditAllocationId { get; set; }

        public int FederationExternalCreditId { get; set; }

        public int BillChargeId { get; set; }

        public int? EntryId { get; set; }

        public decimal AllocatedAmount { get; set; }

        public DateTime AllocatedAt { get; set; }

        public string? AllocationNotes { get; set; }

        public int BillId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerFullName { get; set; } = string.Empty;

        public int? RiderFederationMemberId { get; set; }

        public string? RiderFullName { get; set; }

        public int? HorseId { get; set; }

        public string? HorseName { get; set; }

        public int? ClassInCompId { get; set; }

        public string? ClassName { get; set; }

        public DateTime? ClassDateTime { get; set; }

        public decimal BillChargeAmount { get; set; }

        public string BillChargeStatus { get; set; } = string.Empty;
    }
}