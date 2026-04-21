namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class CreateEntryRequest
    {
        public int ClassInCompId { get; set; }

        public int OrderedBySystemUserId { get; set; }

        public int RanchId { get; set; }   

        public int HorseId { get; set; }

        public int RiderFederationMemberId { get; set; }

        public int? CoachFederationMemberId { get; set; }

        public int PaidByPersonId { get; set; }

        public string? PrizeRecipientName { get; set; }
    }
}