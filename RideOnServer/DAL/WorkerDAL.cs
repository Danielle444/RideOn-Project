using Npgsql;
using RideOnServer.BL.DTOs.Workers;

namespace RideOnServer.DAL
{
    public class WorkerDAL : DBServices
    {
        public List<WorkerListItem> GetWorkersByRanch(GetWorkersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", filters.RanchId },
                { "@RoleStatus", (object?)filters.RoleStatus ?? DBNull.Value },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetWorkersByRanch", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<WorkerListItem> workers = new List<WorkerListItem>();

                        while (reader.Read())
                        {
                            workers.Add(new WorkerListItem
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FullName = reader["FullName"].ToString() ?? string.Empty,
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                NationalId = reader["NationalId"].ToString() ?? string.Empty,
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Username = reader["Username"] == DBNull.Value ? null : reader["Username"].ToString(),
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString() ?? string.Empty,
                                RoleStatus = reader["RoleStatus"].ToString() ?? string.Empty
                            });
                        }

                        return workers;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public WorkerDetails? GetWorkerById(int personId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId },
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetWorkerById", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new WorkerDetails
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                NationalId = reader["NationalId"].ToString() ?? string.Empty,
                                Gender = reader["Gender"] == DBNull.Value ? null : reader["Gender"].ToString(),
                                DateOfBirth = reader["DateOfBirth"] == DBNull.Value ? null : Convert.ToDateTime(reader["DateOfBirth"]),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Username = reader["Username"] == DBNull.Value ? null : reader["Username"].ToString(),
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString() ?? string.Empty,
                                RoleStatus = reader["RoleStatus"].ToString() ?? string.Empty
                            };
                        }

                        return null;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateWorker(UpdateWorkerRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", request.PersonId },
                { "@RanchId", request.RanchId },
                { "@FirstName", request.FirstName },
                { "@LastName", request.LastName },
                { "@Gender", (object?)request.Gender ?? DBNull.Value },
                { "@CellPhone", (object?)request.CellPhone ?? DBNull.Value },
                { "@Email", (object?)request.Email ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateWorkerInRanch", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateWorkerRoleStatus(int personId, int ranchId, string roleStatus)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId },
                { "@RanchId", ranchId },
                { "@RoleStatus", roleStatus }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateWorkerRoleStatus", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void RemoveWorkerFromRanch(int personId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId },
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_RemoveWorkerFromRanch", connection, paramDic))
                    {
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