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

        public static int CreateChangeRequestByPayer(int stallBookingId, int payerPersonId)
        {
            if (stallBookingId <= 0)
            {
                throw new Exception("Invalid StallBookingId");
            }

            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            return StallBookingDAL.CreateStallChangeRequestByPayer(stallBookingId, payerPersonId);
        }

        public static int SecretaryDeleteStallBooking(int stallBookingId, int secretarySystemUserId)
        {
            if (stallBookingId <= 0)
            {
                throw new Exception("Invalid StallBookingId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            return StallBookingDAL.SecretaryDeleteStallBooking(stallBookingId, secretarySystemUserId);
        }

        public static void SecretaryUpdateStallBooking(
            int stallBookingId,
            int secretarySystemUserId,
            DateTime newStartDate,
            DateTime newEndDate,
            string? newNotes,
            bool? isForTack,
            int? horseId)
        {
            if (stallBookingId <= 0)
            {
                throw new Exception("Invalid StallBookingId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            if (newStartDate == default || newEndDate == default)
            {
                throw new Exception("Start and end dates are required");
            }

            if (newEndDate.Date < newStartDate.Date)
            {
                throw new Exception("End date must be on or after start date");
            }

            StallBookingDAL.SecretaryUpdateStallBooking(
                stallBookingId,
                secretarySystemUserId,
                newStartDate,
                newEndDate,
                newNotes,
                isForTack,
                horseId);
        }

        public static int SecretaryCreateStallBookingForPayer(
            int competitionId,
            int secretarySystemUserId,
            int payerPersonId,
            int? horseId,
            DateTime startDate,
            DateTime endDate,
            bool isForTack,
            short productId,
            string? notes)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            if (productId <= 0)
            {
                throw new Exception("Invalid ProductId");
            }

            if (startDate == default || endDate == default)
            {
                throw new Exception("Start and end dates are required");
            }

            if (endDate.Date < startDate.Date)
            {
                throw new Exception("End date must be on or after start date");
            }

            if (!isForTack && (!horseId.HasValue || horseId.Value <= 0))
            {
                throw new Exception("Horse is required for a non-tack stall");
            }

            return StallBookingDAL.SecretaryCreateStallBookingForPayer(
                competitionId,
                secretarySystemUserId,
                payerPersonId,
                horseId,
                startDate,
                endDate,
                isForTack,
                productId,
                notes);
        }
    }
}