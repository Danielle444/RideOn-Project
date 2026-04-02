using RideOnServer.DAL;
using RideOnServer.BL.DTOs;

namespace RideOnServer.BL
{
    public class Person
    {
        public int PersonId { get; set; }

        public string NationalId { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }

        internal static PersonRegistrationLookupResponse? GetPersonByNationalIdForRegistration(string nationalId)
        {
            PersonDAL dal = new PersonDAL();
            return dal.GetPersonByNationalIdForRegistration(nationalId);
        }
    }
}