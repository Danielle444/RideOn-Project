namespace RideOnServer.BL.DTOs.StallMap
{
    public class StallMapCompoundDto
    {
        public short CompoundId { get; set; }
        public string CompoundName { get; set; } = string.Empty;
        public string? LayoutJson { get; set; }
    }

    public class StallAssignmentDto
    {
        public int AssignmentId { get; set; }
        public int StallBookingId { get; set; }

        public short CompoundId { get; set; }
        public short StallId { get; set; }
        public string? StallNumber { get; set; }

        public int BookingRanchId { get; set; }
        public string BookingRanchName { get; set; } = string.Empty;

        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public string? BarnName { get; set; }

        public bool IsForTack { get; set; }
        public string ProductName { get; set; } = string.Empty;
    }

    public class StallAssignmentOverviewItemDto
    {
        public int StallBookingId { get; set; }

        public int BookingRanchId { get; set; }
        public string BookingRanchName { get; set; } = string.Empty;

        public int? HorseId { get; set; }
        public string? HorseName { get; set; }
        public string? BarnName { get; set; }

        public bool IsForTack { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int StayDays { get; set; }

        public int PriceCatalogId { get; set; }
        public short ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;

        public decimal ItemPrice { get; set; }
        public decimal TotalAmount { get; set; }

        public bool IsPaid { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;

        public string PayerNames { get; set; } = string.Empty;
        public string? Notes { get; set; }

        public short? AssignedCompoundId { get; set; }
        public short? AssignedStallId { get; set; }
        public string? AssignedStallNumber { get; set; }

        public bool IsAssigned { get; set; }
    }

    public class StallMapPublishStatusDto
    {
        public int CompetitionId { get; set; }
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
        public int? PublishedBySystemUserId { get; set; }
        public string? PublishedByName { get; set; }
    }

    public class PublishStallMapRequest
    {
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public int SystemUserId { get; set; }
    }

    public class UnpublishStallMapRequest
    {
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
    }
}