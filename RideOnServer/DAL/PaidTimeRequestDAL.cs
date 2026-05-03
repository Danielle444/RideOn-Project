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
                        command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value = request.OrderedBySystemUserId;
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = request.RanchId;
                        command.Parameters.Add("@horseId", NpgsqlDbType.Integer).Value = request.HorseId;
                        command.Parameters.Add("@riderFederationMemberId", NpgsqlDbType.Integer).Value = request.RiderFederationMemberId;
                        command.Parameters.Add("@coachFederationMemberId", NpgsqlDbType.Integer).Value = request.CoachFederationMemberId;
                        command.Parameters.Add("@paidByPersonId", NpgsqlDbType.Integer).Value = request.PaidByPersonId;
                        command.Parameters.Add("@priceCatalogId", NpgsqlDbType.Integer).Value = request.PriceCatalogId;
                        command.Parameters.Add("@requestedCompSlotId", NpgsqlDbType.Integer).Value = request.RequestedCompSlotId;
                        command.Parameters.Add("@notes", NpgsqlDbType.Varchar).Value =
                            string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes;

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

        public List<PaidTimeAssignmentItemResponse> GetPaidTimeRequestsForAssignment(
            int competitionId,
            int[] selectedCompSlotIds,
            bool includeAllPending)
        {
            try
            {
                List<PaidTimeAssignmentItemResponse> requests = new List<PaidTimeAssignmentItemResponse>();

                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_getpaidtimerequestsforassignment(
                            p_competitionid := @competitionId,
                            p_selectedcompslotids := @selectedCompSlotIds,
                            p_includeallpending := @includeAllPending
                        );", connection))
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
                        command.Parameters.Add("@selectedCompSlotIds", NpgsqlDbType.Array | NpgsqlDbType.Integer).Value = selectedCompSlotIds;
                        command.Parameters.Add("@includeAllPending", NpgsqlDbType.Boolean).Value = includeAllPending;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                PaidTimeAssignmentItemResponse item = new PaidTimeAssignmentItemResponse
                                {
                                    PaidTimeRequestId = Convert.ToInt32(reader["PaidTimeRequestId"]),
                                    RequestedCompSlotId = Convert.ToInt32(reader["RequestedCompSlotId"]),
                                    AssignedCompSlotId = reader["AssignedCompSlotId"] == DBNull.Value ? null : Convert.ToInt32(reader["AssignedCompSlotId"]),
                                    AssignedStartTime = reader["AssignedStartTime"] == DBNull.Value ? null : Convert.ToDateTime(reader["AssignedStartTime"]),
                                    AssignedOrder = reader["AssignedOrder"] == DBNull.Value ? null : Convert.ToInt32(reader["AssignedOrder"]),
                                    Status = reader["Status"]?.ToString() ?? string.Empty,
                                    Notes = reader["Notes"] == DBNull.Value ? null : reader["Notes"].ToString(),

                                    HorseId = Convert.ToInt32(reader["HorseId"]),
                                    HorseName = reader["HorseName"]?.ToString() ?? string.Empty,
                                    BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),
                                    RanchId = Convert.ToInt32(reader["RanchId"]),

                                    RiderFederationMemberId = Convert.ToInt32(reader["RiderFederationMemberId"]),
                                    RiderName = reader["RiderName"]?.ToString() ?? string.Empty,

                                    CoachFederationMemberId = reader["CoachFederationMemberId"] == DBNull.Value ? null : Convert.ToInt32(reader["CoachFederationMemberId"]),
                                    CoachName = reader["CoachName"] == DBNull.Value ? null : reader["CoachName"].ToString(),

                                    PaidByPersonId = Convert.ToInt32(reader["PaidByPersonId"]),
                                    PayerName = reader["PayerName"]?.ToString() ?? string.Empty,

                                    ProductId = Convert.ToInt16(reader["ProductId"]),
                                    ProductName = reader["ProductName"]?.ToString() ?? string.Empty,
                                    DurationMinutes = Convert.ToInt32(reader["DurationMinutes"]),
                                    EffectiveDurationMinutes = Convert.ToInt32(reader["EffectiveDurationMinutes"]),

                                    RequestedSlotDate = DateOnly.FromDateTime(Convert.ToDateTime(reader["RequestedSlotDate"])),
                                    RequestedStartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["RequestedStartTime"]),
                                    RequestedEndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["RequestedEndTime"]),
                                    RequestedArenaName = reader["RequestedArenaName"]?.ToString() ?? string.Empty,

                                    AssignedSlotDate = reader["AssignedSlotDate"] == DBNull.Value ? null : DateOnly.FromDateTime(Convert.ToDateTime(reader["AssignedSlotDate"])),
                                    AssignedSlotStartTime = reader["AssignedSlotStartTime"] == DBNull.Value ? null : TimeOnly.FromTimeSpan((TimeSpan)reader["AssignedSlotStartTime"]),
                                    AssignedSlotEndTime = reader["AssignedSlotEndTime"] == DBNull.Value ? null : TimeOnly.FromTimeSpan((TimeSpan)reader["AssignedSlotEndTime"]),
                                    AssignedArenaName = reader["AssignedArenaName"] == DBNull.Value ? null : reader["AssignedArenaName"].ToString()
                                };

                                requests.Add(item);
                            }
                        }
                    }
                }

                return requests;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void AssignPaidTimeRequest(AssignPaidTimeRequestRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT public.usp_assignpaidtimerequest(
                    p_ranchid := @ranchId,
                    p_paidtimerequestid := @paidTimeRequestId,
                    p_assignedcompslotid := @assignedCompSlotId,
                    p_assignedorder := @assignedOrder
                );", connection))
                    {
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = request.RanchId;
                        command.Parameters.Add("@paidTimeRequestId", NpgsqlDbType.Integer).Value = request.PaidTimeRequestId;
                        command.Parameters.Add("@assignedCompSlotId", NpgsqlDbType.Integer).Value = request.AssignedCompSlotId;
                        command.Parameters.Add("@assignedOrder", NpgsqlDbType.Integer).Value = request.AssignedOrder;

                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UnassignPaidTimeRequest(UnassignPaidTimeRequestRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_unassignpaidtimerequest(
                            p_ranchid := @ranchId,
                            p_paidtimerequestid := @paidTimeRequestId
                        );", connection))
                    {
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = request.RanchId;
                        command.Parameters.Add("@paidTimeRequestId", NpgsqlDbType.Integer).Value = request.PaidTimeRequestId;

                        command.ExecuteNonQuery();
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