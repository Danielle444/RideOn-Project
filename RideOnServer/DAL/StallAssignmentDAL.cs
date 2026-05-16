using Npgsql;
using RideOnServer.BL.DTOs.StallMap;

namespace RideOnServer.DAL
{
    public class StallAssignmentDAL : DBServices
    {
        public List<StallMapCompoundDto> GetCompoundsWithLayout(int ranchId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@RanchId", ranchId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_GetCompoundsWithLayout",
                    connection,
                    paramDic
                );

                using var reader = command.ExecuteReader();

                var list = new List<StallMapCompoundDto>();

                while (reader.Read())
                {
                    list.Add(new StallMapCompoundDto
                    {
                        CompoundId = Convert.ToInt16(reader["CompoundId"]),
                        CompoundName = reader["CompoundName"].ToString()!,
                        LayoutJson = reader["Layout"] == DBNull.Value ? null : reader["Layout"].ToString()
                    });
                }

                return list;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void SaveCompoundLayout(int ranchId, short compoundId, string layoutJson)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@RanchId", ranchId },
                { "@CompoundId", compoundId },
                { "@LayoutJson", layoutJson }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_SaveCompoundLayout",
                    connection,
                    paramDic
                );

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<StallAssignmentOverviewItemDto> GetAssignmentOverview(int competitionId, int hostRanchId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId },
                { "@HostRanchId", hostRanchId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_GetStallBookingAssignmentOverview",
                    connection,
                    paramDic
                );

                using var reader = command.ExecuteReader();

                var list = new List<StallAssignmentOverviewItemDto>();

                while (reader.Read())
                {
                    list.Add(new StallAssignmentOverviewItemDto
                    {
                        StallBookingId = Convert.ToInt32(reader["StallBookingId"]),

                        BookingRanchId = Convert.ToInt32(reader["BookingRanchId"]),
                        BookingRanchName = reader["BookingRanchName"].ToString()!,

                        HorseId = reader["HorseId"] == DBNull.Value ? null : Convert.ToInt32(reader["HorseId"]),
                        HorseName = reader["HorseName"] == DBNull.Value ? null : reader["HorseName"].ToString(),
                        BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),

                        IsForTack = Convert.ToBoolean(reader["IsForTack"]),

                        StartDate = Convert.ToDateTime(reader["StartDate"]),
                        EndDate = Convert.ToDateTime(reader["EndDate"]),
                        StayDays = Convert.ToInt32(reader["StayDays"]),

                        PriceCatalogId = Convert.ToInt32(reader["PriceCatalogId"]),
                        ProductId = Convert.ToInt16(reader["ProductId"]),
                        ProductName = reader["ProductName"].ToString()!,

                        ItemPrice = Convert.ToDecimal(reader["ItemPrice"]),
                        TotalAmount = Convert.ToDecimal(reader["TotalAmount"]),

                        IsPaid = Convert.ToBoolean(reader["IsPaid"]),
                        PaymentStatus = reader["PaymentStatus"].ToString()!,

                        PayerNames = reader["PayerNames"] == DBNull.Value ? string.Empty : reader["PayerNames"].ToString()!,
                        Notes = reader["Notes"] == DBNull.Value ? null : reader["Notes"].ToString(),

                        AssignedCompoundId = reader["AssignedCompoundId"] == DBNull.Value ? null : Convert.ToInt16(reader["AssignedCompoundId"]),
                        AssignedStallId = reader["AssignedStallId"] == DBNull.Value ? null : Convert.ToInt16(reader["AssignedStallId"]),
                        AssignedStallNumber = reader["AssignedStallNumber"] == DBNull.Value ? null : reader["AssignedStallNumber"].ToString(),

                        IsAssigned = Convert.ToBoolean(reader["IsAssigned"])
                    });
                }

                return list;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<StallAssignmentDto> GetAssignments(int competitionId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_GetStallAssignmentsForCompetition",
                    connection,
                    paramDic
                );

                using var reader = command.ExecuteReader();

                var list = new List<StallAssignmentDto>();

                while (reader.Read())
                {
                    list.Add(new StallAssignmentDto
                    {
                        AssignmentId = Convert.ToInt32(reader["AssignmentId"]),
                        StallBookingId = Convert.ToInt32(reader["StallBookingId"]),

                        CompoundId = Convert.ToInt16(reader["CompoundId"]),
                        StallId = Convert.ToInt16(reader["StallId"]),
                        StallNumber = reader["StallNumber"] == DBNull.Value ? null : reader["StallNumber"].ToString(),

                        BookingRanchId = Convert.ToInt32(reader["BookingRanchId"]),
                        BookingRanchName = reader["BookingRanchName"].ToString()!,

                        HorseId = reader["HorseId"] == DBNull.Value ? null : Convert.ToInt32(reader["HorseId"]),
                        HorseName = reader["HorseName"] == DBNull.Value ? null : reader["HorseName"].ToString(),
                        BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),

                        IsForTack = Convert.ToBoolean(reader["IsForTack"]),
                        ProductName = reader["ProductName"].ToString()!
                    });
                }

                return list;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void AssignStallBooking(
            int competitionId,
            int hostRanchId,
            short compoundId,
            short stallId,
            int stallBookingId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId },
                { "@HostRanchId", hostRanchId },
                { "@CompoundId", compoundId },
                { "@StallId", stallId },
                { "@StallBookingId", stallBookingId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_AssignStallBookingToStall",
                    connection,
                    paramDic
                );

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UnassignStallBooking(
            int competitionId,
            int hostRanchId,
            short compoundId,
            short stallId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId },
                { "@HostRanchId", hostRanchId },
                { "@CompoundId", compoundId },
                { "@StallId", stallId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_UnassignStallBookingFromStall",
                    connection,
                    paramDic
                );

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public StallMapPublishStatusDto? GetPublishStatus(int competitionId, int hostRanchId)
        {
            var paramDic = new Dictionary<string, object?>
    {
        { "@CompetitionId", competitionId },
        { "@HostRanchId", hostRanchId }
    };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_GetStallMapPublishStatus",
                    connection,
                    paramDic
                );

                using var reader = command.ExecuteReader();

                if (!reader.Read())
                {
                    return null;
                }

                return new StallMapPublishStatusDto
                {
                    CompetitionId = Convert.ToInt32(reader["CompetitionId"]),
                    IsPublished = Convert.ToBoolean(reader["IsPublished"]),
                    PublishedAt = reader["PublishedAt"] == DBNull.Value ? null : Convert.ToDateTime(reader["PublishedAt"]),
                    PublishedBySystemUserId = reader["PublishedBySystemUserId"] == DBNull.Value ? null : Convert.ToInt32(reader["PublishedBySystemUserId"]),
                    PublishedByName = reader["PublishedByName"] == DBNull.Value ? null : reader["PublishedByName"].ToString()
                };
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void PublishStallMap(int competitionId, int hostRanchId, int publishedBySystemUserId)
        {
            var paramDic = new Dictionary<string, object?>
    {
        { "@CompetitionId", competitionId },
        { "@HostRanchId", hostRanchId },
        { "@PublishedBySystemUserId", publishedBySystemUserId }
    };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_PublishStallMap",
                    connection,
                    paramDic
                );

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UnpublishStallMap(int competitionId, int hostRanchId)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId },
                { "@HostRanchId", hostRanchId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_UnpublishStallMap",
                    connection,
                    paramDic
                );

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }


    }
}