namespace RideOnServer.BL.DTOs
{
    public class RegisterResponse
    {
        public int PersonId { get; set; }

        public string Username { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;
    }
}