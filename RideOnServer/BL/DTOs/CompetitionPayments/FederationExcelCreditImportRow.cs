namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class FederationExcelCreditImportRow
    {
        public int RowNumber { get; set; }

        public int CompetitionId { get; set; }

        public string SourceType { get; set; } = "ExcelReceipt";

        public string? ExternalReference { get; set; }

        public string? ExternalName { get; set; }

        public string? ExternalClubName { get; set; }

        public string? ExternalIdNumber { get; set; }

        public decimal OriginalAmount { get; set; }

        public int CreatedBySystemUserId { get; set; }

        public string? Notes { get; set; }

        public string ImportFingerprint { get; set; } = string.Empty;

        public string RawDataJson { get; set; } = "{}";
    }
}