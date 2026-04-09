namespace RideOnServer.BL.DTOs.Workers
{
    public class RemoveWorkerFromRanchRequest
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }
    }
}