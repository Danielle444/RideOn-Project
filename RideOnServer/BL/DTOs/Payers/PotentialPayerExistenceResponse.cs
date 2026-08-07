namespace RideOnServer.BL.DTOs.Payers
{
    // P0 PII-hardening audit (fix/person-lookup-pii-hardening): the minimal
    // public shape for GET /Payers/lookup. The RanchAdmin caller only ever
    // branches on whether a match was found (PersonId) and whether that person
    // already has a system user (HasSystemUser) -- NationalId/Email/CellPhone/
    // FirstName/LastName are never read by the client and must not leave the
    // server for this system-wide, cross-tenant-by-design lookup.
    public class PotentialPayerExistenceResponse
    {
        public int PersonId { get; set; }

        public bool HasSystemUser { get; set; }
    }
}
