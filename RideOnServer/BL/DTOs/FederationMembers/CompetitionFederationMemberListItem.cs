namespace RideOnServer.BL.DTOs.FederationMembers
{
    public class CompetitionFederationMemberListItem
    {
        public int FederationMemberId { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string FullName
        {
            get
            {
                return (FirstName + " " + LastName).Trim();
            }
        }
    }
}