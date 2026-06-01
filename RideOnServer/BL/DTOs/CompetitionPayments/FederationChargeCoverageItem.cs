namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationChargeCoverageItem
    {
        public int BillChargeId { get; set; }

        public int BillId { get; set; }

        public int CompetitionId { get; set; }

        public int PayerPersonId { get; set; }

        public string PayerFullName { get; set; } = string.Empty;

        public int EntryId { get; set; }

        public int ClassInCompId { get; set; }

        public string ClassName { get; set; } = string.Empty;

        public DateTime? ClassDateTime { get; set; }

        public int? RiderFederationMemberId { get; set; }

        public string? RiderFullName { get; set; }

        public int? HorseId { get; set; }

        public string? HorseName { get; set; }

        public decimal ChargeAmount { get; set; }

        public decimal CoveredAmount { get; set; }

        public decimal MissingAmount { get; set; }

        public string ChargeStatus { get; set; } = string.Empty;

        public string CoverageStatus { get; set; } = string.Empty;
    }
}