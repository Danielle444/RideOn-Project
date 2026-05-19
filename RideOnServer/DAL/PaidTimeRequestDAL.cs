using System.Text.Json;
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
                                    AssignedArenaName = reader["AssignedArenaName"] == DBNull.Value ? null : reader["AssignedArenaName"].ToString(),

                                    BatchId = reader["BatchId"] == DBNull.Value ? null : Convert.ToInt32(reader["BatchId"]),
                                    BatchPayload = reader["BatchPayload"] == DBNull.Value ? null : reader["BatchPayload"].ToString()
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

        public List<PaidTimeSlotCapacityWarning> CheckSlotCapacity(List<BulkPaidTimeRequestItem> items)
        {
            List<PaidTimeSlotCapacityWarning> result = new List<PaidTimeSlotCapacityWarning>();

            var minimal = items.Select(i => new
            {
                requestedCompSlotId = i.RequestedCompSlotId,
                priceCatalogId = i.PriceCatalogId
            });
            string itemsJson = JsonSerializer.Serialize(minimal);

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_checkpaidtimeslotcapacity(
                            p_items := @items::jsonb
                        );", connection))
                    {
                        command.Parameters.Add("@items", NpgsqlDbType.Jsonb).Value = itemsJson;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new PaidTimeSlotCapacityWarning
                                {
                                    RequestedCompSlotId = Convert.ToInt32(reader["RequestedCompSlotId"]),
                                    TotalCapacityMinutes = Convert.ToInt32(reader["TotalCapacityMinutes"]),
                                    UsedCapacityMinutes = Convert.ToInt32(reader["UsedCapacityMinutes"]),
                                    NewRequestMinutes = Convert.ToInt32(reader["NewRequestMinutes"]),
                                    WouldOverflow = Convert.ToBoolean(reader["WouldOverflow"])
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        public (List<int> CreatedRequestIds, int BatchId) BulkCreatePaidTimeRequests(BulkCreatePaidTimeRequestsRequest request, int createdByPersonId)
        {
            List<int> createdIds = new List<int>();
            int batchId = 0;

            string itemsJson = JsonSerializer.Serialize(request.Items.Select(i => new
            {
                horseId = i.HorseId,
                riderFederationMemberId = i.RiderFederationMemberId,
                coachFederationMemberId = i.CoachFederationMemberId,
                paidByPersonId = i.PaidByPersonId,
                priceCatalogId = i.PriceCatalogId,
                requestedCompSlotId = i.RequestedCompSlotId,
                notes = i.Notes
            }));

            string metadataJson = request.Metadata.HasValue
                ? request.Metadata.Value.GetRawText()
                : "{}";

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_bulkinsertpaidtimerequests(
                            p_orderedbysystemuserid := @orderedBySystemUserId,
                            p_ranchid               := @ranchId,
                            p_competitionid         := @competitionId,
                            p_createdbypersonid     := @createdByPersonId,
                            p_items                 := @items::jsonb,
                            p_metadata              := @metadata::jsonb
                        );", connection))
                    {
                        command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value = request.OrderedBySystemUserId;
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = request.RanchId;
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = request.CompetitionId;
                        command.Parameters.Add("@createdByPersonId", NpgsqlDbType.Integer).Value = createdByPersonId;
                        command.Parameters.Add("@items", NpgsqlDbType.Jsonb).Value = itemsJson;
                        command.Parameters.Add("@metadata", NpgsqlDbType.Jsonb).Value = metadataJson;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                createdIds.Add(Convert.ToInt32(reader["PaidTimeRequestId"]));
                                batchId = Convert.ToInt32(reader["BatchId"]);
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return (createdIds, batchId);
        }


        public List<MyCompetitionPaidTimeRequestItem> GetMyPaidTimeRequestsForCompetition(
    int competitionId,
    int orderedBySystemUserId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@p_competitionid", competitionId },
        { "@p_orderedbysystemuserid", orderedBySystemUserId }
    };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_getmypaidtimerequestsforcompetition",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<MyCompetitionPaidTimeRequestItem> list = new List<MyCompetitionPaidTimeRequestItem>();

                        while (reader.Read())
                        {
                            list.Add(MapMyCompetitionPaidTimeRequestItem(reader));
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }


        private MyCompetitionPaidTimeRequestItem MapMyCompetitionPaidTimeRequestItem(NpgsqlDataReader reader)
        {
            return new MyCompetitionPaidTimeRequestItem
            {
                PaidTimeRequestId = Convert.ToInt32(reader["paidtimerequestid"]),

                HorseName = reader["horsename"]?.ToString() ?? string.Empty,
                BarnName = reader["barnname"] == DBNull.Value ? null : reader["barnname"].ToString(),

                CoachName = reader["coachname"] == DBNull.Value ? null : reader["coachname"].ToString(),
                PayerName = reader["payername"]?.ToString() ?? string.Empty,

                ProductName = reader["productname"]?.ToString() ?? string.Empty,
                AmountToPay = Convert.ToDecimal(reader["amounttopay"]),

                IsPaid = Convert.ToBoolean(reader["ispaid"]),
                IsAssigned = Convert.ToBoolean(reader["isassigned"]),

                DisplayStatus = reader["displaystatus"]?.ToString() ?? string.Empty,

                DisplaySlotDate = DateOnly.FromDateTime(Convert.ToDateTime(reader["displayslotdate"])),
                DisplayStartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["displaystarttime"]),
                DisplayEndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["displayendtime"]),
                DisplayArenaName = reader["displayarenaname"]?.ToString() ?? string.Empty,

                RequestedSlotDate = DateOnly.FromDateTime(Convert.ToDateTime(reader["requestedslotdate"])),
                RequestedStartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["requestedstarttime"]),
                RequestedEndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["requestedendtime"]),
                RequestedArenaName = reader["requestedarenaname"]?.ToString() ?? string.Empty,

                AssignedSlotDate = reader["assignedslotdate"] == DBNull.Value
                    ? null
                    : DateOnly.FromDateTime(Convert.ToDateTime(reader["assignedslotdate"])),

                AssignedSlotStartTime = reader["assignedslotstarttime"] == DBNull.Value
                    ? null
                    : TimeOnly.FromTimeSpan((TimeSpan)reader["assignedslotstarttime"]),

                AssignedSlotEndTime = reader["assignedslotendtime"] == DBNull.Value
                    ? null
                    : TimeOnly.FromTimeSpan((TimeSpan)reader["assignedslotendtime"]),

                AssignedArenaName = reader["assignedarenaname"] == DBNull.Value
                    ? null
                    : reader["assignedarenaname"].ToString(),

                Notes = reader["notes"] == DBNull.Value ? null : reader["notes"].ToString(),
                Status = reader["status"]?.ToString() ?? string.Empty,

                CreatedAt = Convert.ToDateTime(reader["createdat"]),

                HoursUntilStart = reader["hoursuntilstart"] == DBNull.Value
                    ? 0m
                    : Convert.ToDecimal(reader["hoursuntilstart"]),
                CanModify = reader["canmodify"] != DBNull.Value && Convert.ToBoolean(reader["canmodify"]),
                CanCancel = reader["cancancel"] != DBNull.Value && Convert.ToBoolean(reader["cancancel"]),
                BatchId = reader["batchid"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["batchid"]),
                HorseId = reader["horseid"] == DBNull.Value ? 0 : Convert.ToInt32(reader["horseid"]),
                CoachFederationMemberId = reader["coachfederationmemberid"] == DBNull.Value
                    ? (int?)null
                    : Convert.ToInt32(reader["coachfederationmemberid"]),
                AssignedStartTimeActual = reader["assignedstarttimeactual"] == DBNull.Value
                    ? (DateTime?)null
                    : Convert.ToDateTime(reader["assignedstarttimeactual"]),
                AssignedOrder = reader["assignedorder"] == DBNull.Value
                    ? (int?)null
                    : Convert.ToInt32(reader["assignedorder"]),
                AssignedSlotIsPublished = reader["assignedslotispublished"] != DBNull.Value
                    && Convert.ToBoolean(reader["assignedslotispublished"])
            };
        }

        public List<SlotScheduleItem> GetSlotScheduleForViewing(int slotId, int competitionId, int ranchId)
        {
            List<SlotScheduleItem> result = new List<SlotScheduleItem>();
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_getslotscheduleforviewing(
                            p_paidtimeslotincompid := @slotId,
                            p_competitionid        := @competitionId,
                            p_ranchid              := @ranchId
                        );", connection))
                    {
                        command.Parameters.Add("@slotId", NpgsqlDbType.Integer).Value = slotId;
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new SlotScheduleItem
                                {
                                    PaidTimeRequestId = Convert.ToInt32(reader["PaidTimeRequestId"]),
                                    HorseId = Convert.ToInt32(reader["HorseId"]),
                                    HorseName = reader["HorseName"]?.ToString() ?? string.Empty,
                                    BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),
                                    CoachName = reader["CoachName"] == DBNull.Value ? null : reader["CoachName"].ToString(),
                                    RiderName = reader["RiderName"]?.ToString() ?? string.Empty,
                                    ProductName = reader["ProductName"]?.ToString() ?? string.Empty,
                                    DurationMinutes = Convert.ToInt32(reader["DurationMinutes"]),
                                    AssignedStartTime = reader["AssignedStartTime"] == DBNull.Value
                                        ? (DateTime?)null
                                        : Convert.ToDateTime(reader["AssignedStartTime"]),
                                    AssignedOrder = reader["AssignedOrder"] == DBNull.Value
                                        ? (int?)null
                                        : Convert.ToInt32(reader["AssignedOrder"]),
                                    SlotDate = DateOnly.FromDateTime(Convert.ToDateTime(reader["SlotDate"])),
                                    SlotStartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["SlotStartTime"]),
                                    SlotEndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["SlotEndTime"]),
                                    ArenaName = reader["ArenaName"]?.ToString() ?? string.Empty,
                                    IsPublished = Convert.ToBoolean(reader["IsPublished"]),
                                    IsMine = Convert.ToBoolean(reader["IsMine"])
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
            return result;
        }

        public List<PublishedSlotItem> GetPublishedSlotsForCompetition(int competitionId, int ranchId)
        {
            List<PublishedSlotItem> result = new List<PublishedSlotItem>();
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_getpublishedslotsforcompetition(
                            p_competitionid := @competitionId,
                            p_ranchid       := @ranchId
                        );", connection))
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new PublishedSlotItem
                                {
                                    PaidTimeSlotInCompId = Convert.ToInt32(reader["PaidTimeSlotInCompId"]),
                                    SlotDate = DateOnly.FromDateTime(Convert.ToDateTime(reader["SlotDate"])),
                                    StartTime = TimeOnly.FromTimeSpan((TimeSpan)reader["StartTime"]),
                                    EndTime = TimeOnly.FromTimeSpan((TimeSpan)reader["EndTime"]),
                                    ArenaName = reader["ArenaName"]?.ToString() ?? string.Empty,
                                    SlotStatus = reader["SlotStatus"] == DBNull.Value ? null : reader["SlotStatus"].ToString(),
                                    AssignedCount = Convert.ToInt32(reader["AssignedCount"]),
                                    MyAssignedCount = Convert.ToInt32(reader["MyAssignedCount"])
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
            return result;
        }

        public void CancelPaidTimeRequest(int paidTimeRequestId, int orderedBySystemUserId)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_cancelpaidtimerequest(
                            p_paidtimerequestid     := @id,
                            p_orderedbysystemuserid := @orderedBy
                        );", connection))
                    {
                        command.Parameters.Add("@id", NpgsqlDbType.Integer).Value = paidTimeRequestId;
                        command.Parameters.Add("@orderedBy", NpgsqlDbType.Integer).Value = orderedBySystemUserId;
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdatePaidTimeRequest(
            int paidTimeRequestId,
            int orderedBySystemUserId,
            string? notes,
            bool notesProvided,
            int? priceCatalogId,
            int? requestedCompSlotId)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_updatepaidtimerequest(
                            p_paidtimerequestid     := @id,
                            p_orderedbysystemuserid := @orderedBy,
                            p_notes                 := @notes,
                            p_pricecatalogid        := @priceCatalogId,
                            p_requestedcompslotid   := @requestedCompSlotId
                        );", connection))
                    {
                        command.Parameters.Add("@id", NpgsqlDbType.Integer).Value = paidTimeRequestId;
                        command.Parameters.Add("@orderedBy", NpgsqlDbType.Integer).Value = orderedBySystemUserId;

                        // NULL = USP מבין כ"אל תשנה"; '' = "נקה הערות".
                        if (!notesProvided)
                        {
                            command.Parameters.Add("@notes", NpgsqlDbType.Text).Value = DBNull.Value;
                        }
                        else
                        {
                            command.Parameters.Add("@notes", NpgsqlDbType.Text).Value = (object?)notes ?? "";
                        }

                        command.Parameters.Add("@priceCatalogId", NpgsqlDbType.Integer).Value =
                            priceCatalogId.HasValue ? (object)priceCatalogId.Value : DBNull.Value;
                        command.Parameters.Add("@requestedCompSlotId", NpgsqlDbType.Integer).Value =
                            requestedCompSlotId.HasValue ? (object)requestedCompSlotId.Value : DBNull.Value;

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