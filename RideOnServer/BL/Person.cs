namespace RideOnServer.BL
{
    public class Person
    {
        public int PersonId { get; set; }

        public string? NationalId { get; set; }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public string Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? CellPhone { get; set; }

        public string? Email { get; set; }
    }
}