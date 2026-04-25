using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.DAL
{
    public class PaidTimeRequestDAL : DBServices
    {
        public int CreatePaidTimeRequest(CreatePaidTimeRequestRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_insertpaidtimerequest(
                            p_orderedbysystemuserid := @orderedBySystemUserId,
                            p_ranchid := @ranchId,
                            p_horseid := @horseId,
                            p_riderfederationmemberid := @riderFederationMemberId,
                            p_coachfederationmemberid := @coachFederationMemberId,
                            p_paidbypersonid := @paidByPersonId,
                            p_pricecatalogid := @priceCatalogId,
                            p_requestedcompslotid := @requestedCompSlotId,
                            p_notes := @notes
                        );", connection))
                    {
                        command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value =
                            request.OrderedBySystemUserId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value =
                            request.RanchId;

                        command.Parameters.Add("@horseId", NpgsqlDbType.Integer).Value =
                            request.HorseId;

                        command.Parameters.Add("@riderFederationMemberId", NpgsqlDbType.Integer).Value =
                            request.RiderFederationMemberId;

                        command.Parameters.Add("@coachFederationMemberId", NpgsqlDbType.Integer).Value =
                            request.CoachFederationMemberId;

                        command.Parameters.Add("@paidByPersonId", NpgsqlDbType.Integer).Value =
                            request.PaidByPersonId;

                        command.Parameters.Add("@priceCatalogId", NpgsqlDbType.Integer).Value =
                            request.PriceCatalogId;

                        command.Parameters.Add("@requestedCompSlotId", NpgsqlDbType.Integer).Value =
                            request.RequestedCompSlotId;

                        command.Parameters.Add("@notes", NpgsqlDbType.Varchar).Value =
                            string.IsNullOrWhiteSpace(request.Notes)
                                ? DBNull.Value
                                : request.Notes;

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