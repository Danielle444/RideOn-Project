namespace RideOnServer.BL
{
    public class FederationMember : Person
    {
        public bool? HasValidMembership { get; set; }

        public DateTime? MedicalCheckValidUntil { get; set; }

        public string CertificationLevel { get; set; }
    }
}