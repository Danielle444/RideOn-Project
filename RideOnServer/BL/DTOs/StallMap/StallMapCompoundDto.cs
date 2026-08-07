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

    // Payer-safe projection (mobile stall-map slice 1, 2026-08-07). Deliberately
    // narrower than StallAssignmentDto: no StallBookingId, BookingRanchId,
    // BookingRanchName, ProductName, or HorseId - none of those are needed to
    // render occupied/mine/tack, and each identifies another participant or
    // ranch. HorseName/BarnName are null at the SQL layer (never transmitted)
    // whenever IsMine is false - see usp_GetStallAssignmentsForCompetitionPayer.
    // IsMyRanch (2026-08-07, "My ranch" UX) is the ONE deliberate exception:
    // a same-ranch boolean computed server-side (sb.requestingranchid = the
    // caller's own active ranch), never the raw ranch id/name. It still never
    // reveals which OTHER ranch a stall belongs to, only same/not-same versus
    // the caller.
    public class PayerStallAssignmentDto
    {
        public int AssignmentId { get; set; }
        public short CompoundId { get; set; }
        public short StallId { get; set; }
        public string? StallNumber { get; set; }

        public bool IsOccupied { get; set; }
        public bool IsMine { get; set; }
        public bool IsForTack { get; set; }

        public string? HorseName { get; set; }
        public string? BarnName { get; set; }

        public bool IsMyRanch { get; set; }
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