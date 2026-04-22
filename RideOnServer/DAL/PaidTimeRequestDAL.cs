using Npgsql;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.DAL
{
    public class PaidTimeRequestDAL : DBServices
    {
        public int CreatePaidTimeRequest(CreatePaidTimeRequestRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@OrderedBySystemUserId", request.OrderedBySystemUserId },
                { "@RanchId", request.RanchId },
                { "@HorseId", request.HorseId },
                { "@RiderFederationMemberId", request.RiderFederationMemberId },
                { "@CoachFederationMemberId", request.CoachFederationMemberId },
                { "@PaidByPersonId", request.PaidByPersonId },
                { "@PriceCatalogId", request.PriceCatalogId },
                { "@RequestedCompSlotId", request.RequestedCompSlotId },
                { "@Notes", (object?)request.Notes ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_InsertPaidTimeRequest",
                        connection,
                        paramDic))
                    {
                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            throw new Exception("Failed to create paid time request");
                        }

                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}