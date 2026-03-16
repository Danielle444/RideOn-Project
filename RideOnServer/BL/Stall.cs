namespace RideOnServer.BL
{
    public class Stall
    {
        public int RanchId { get; set; }

        public byte CompoundId { get; set; }

        public int StallId { get; set; }

        public string StallNumber { get; set; }

        public int StallType { get; set; }

        public string? StallNotes { get; set; }
    }
}