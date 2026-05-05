namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class PaidTimeCandidateItem
    {
        public int EntryId { get; set; }

        public int ClassInCompId { get; set; }

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public int CoachFederationMemberId { get; set; }

        public string CoachName { get; set; } = string.Empty;

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int PaidByPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;
    }
}
