namespace RideOnServer.BL.DTOs.StallMap
{
    public class AssignStallBookingRequest
    {
        public int CompetitionId { get; set; }

        // החווה המארחת שבה נמצאים המתחמים והתאים
        public int RanchId { get; set; }

        public short CompoundId { get; set; }
        public short StallId { get; set; }

        // ההזמנה הספציפית: תא סוס או תא ציוד
        public int StallBookingId { get; set; }
    }

    public class UnassignStallBookingRequest
    {
        public int CompetitionId { get; set; }

        // החווה המארחת שבה נמצאים המתחמים והתאים
        public int RanchId { get; set; }

        public short CompoundId { get; set; }
        public short StallId { get; set; }
    }

    public class SaveLayoutRequest
    {
        public int RanchId { get; set; }
        public short CompoundId { get; set; }
        public string LayoutJson { get; set; } = string.Empty;
    }
}