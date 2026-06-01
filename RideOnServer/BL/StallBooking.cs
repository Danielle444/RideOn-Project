using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class StallBooking : ProductRequest
    {
        public int RanchId { get; set; }

        public byte? CompoundId { get; set; }

        public int? StallId { get; set; }

        public int? HorseId { get; set; }

        public DateTime startDate { get; set; }

        public DateTime endDate { get; set; }

        public bool IsForTack { get; set; }

        public static int CancelByPayer(int stallBookingId, int payerPersonId)
        {
            if (stallBookingId <= 0)
            {
                throw new Exception("Invalid StallBookingId");
            }

            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            return StallBookingDAL.CancelStallBookingByPayer(stallBookingId, payerPersonId);
        }
    }
}