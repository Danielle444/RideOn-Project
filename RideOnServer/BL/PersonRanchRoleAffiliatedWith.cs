namespace RideOnServer.BL
{
    public class PersonRanchRoleAffiliatedWith
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }

        public byte RoleId { get; set; }

        public string RollStatus { get; set; }
    }
}