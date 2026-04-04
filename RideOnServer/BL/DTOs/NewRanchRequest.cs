namespace RideOnServer.BL.DTOs
{
    public class NewRanchRequest
    {
        public int RequestId { get; set; }
        public int RanchId { get; set; }
        public int SubmittedBySystemUserId { get; set; }

        public DateTime RequestDate { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public int PersonId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string NationalId { get; set; } = string.Empty;

        public string? Email { get; set; }
        public string? CellPhone { get; set; }

        public string RequestStatus { get; set; } = string.Empty;

        public int? ResolvedBySuperUserId { get; set; }
        public string? ResolvedBySuperUserEmail { get; set; }
        public DateTime? ResolvedDate { get; set; }
    }
}