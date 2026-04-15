using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ClassInCompetitionDAL : DBServices
    {
        public List<ClassInCompetition> GetClassesByCompetitionId(int competitionId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    List<ClassInCompetition> list = new List<ClassInCompetition>();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetClassesByCompetitionId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new ClassInCompetition
                            {
                                ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                                CompetitionId = competitionId,
                                ClassTypeId = Convert.ToInt16(reader["ClassTypeId"]),
                                ArenaRanchId = reader["ArenaRanchId"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ArenaRanchId"]),
                                ArenaId = reader["ArenaId"] == DBNull.Value ? (byte)0 : Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"] == DBNull.Value ? null : reader["ArenaName"].ToString(),
                                ClassDateTime = reader["ClassDateTime"] == DBNull.Value ? null : (DateTime?)reader["ClassDateTime"],
                                ClassName = reader["ClassName"] == DBNull.Value ? null : reader["ClassName"].ToString(),
                                OrganizerCost = reader["OrganizerCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["OrganizerCost"]),
                                FederationCost = reader["FederationCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["FederationCost"]),
                                StartTime = reader["StartTime"] == DBNull.Value ? null : (TimeSpan?)reader["StartTime"],
                                OrderInDay = reader["OrderInDay"] == DBNull.Value ? null : Convert.ToByte(reader["OrderInDay"]),
                                ClassNotes = reader["ClassNotes"] == DBNull.Value ? null : reader["ClassNotes"].ToString(),
                                JudgesDisplay = reader["JudgesDisplay"] == DBNull.Value ? null : reader["JudgesDisplay"].ToString(),
                                PrizeTypeId = reader["PrizeTypeId"] == DBNull.Value ? null : Convert.ToByte(reader["PrizeTypeId"]),
                                PrizeTypeName = reader["PrizeTypeName"] == DBNull.Value ? null : reader["PrizeTypeName"].ToString(),
                                PrizeAmount = reader["PrizeAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["PrizeAmount"]),
                                PatternNumber = reader["PatternNumber"] == DBNull.Value ? null : Convert.ToInt16(reader["PatternNumber"]),
                                JudgeIds = reader["JudgeIds"] == DBNull.Value
                                    ? new List<int>()
                                    : ((int[])reader["JudgeIds"]).ToList()
                            });
                        }
                    }
                    return list;
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public ClassInCompetition? GetClassById(int classInCompId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    ClassInCompetition? item = null;

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetClassById", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            item = new ClassInCompetition
                            {
                                ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                                CompetitionId = Convert.ToInt32(reader["CompetitionId"]),
                                ClassTypeId = Convert.ToInt16(reader["ClassTypeId"]),
                                ArenaRanchId = reader["ArenaRanchId"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ArenaRanchId"]),
                                ArenaId = reader["ArenaId"] == DBNull.Value ? (byte)0 : Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"] == DBNull.Value ? null : reader["ArenaName"].ToString(),
                                ClassDateTime = reader["ClassDateTime"] == DBNull.Value ? null : (DateTime?)reader["ClassDateTime"],
                                ClassName = reader["ClassName"] == DBNull.Value ? null : reader["ClassName"].ToString(),
                                OrganizerCost = reader["OrganizerCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["OrganizerCost"]),
                                FederationCost = reader["FederationCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["FederationCost"]),
                                StartTime = reader["StartTime"] == DBNull.Value ? null : (TimeSpan?)reader["StartTime"],
                                OrderInDay = reader["OrderInDay"] == DBNull.Value ? null : Convert.ToByte(reader["OrderInDay"]),
                                ClassNotes = reader["ClassNotes"] == DBNull.Value ? null : reader["ClassNotes"].ToString(),
                                JudgesDisplay = reader["JudgesDisplay"] == DBNull.Value ? null : reader["JudgesDisplay"].ToString(),
                                PrizeTypeId = reader["PrizeTypeId"] == DBNull.Value ? null : Convert.ToByte(reader["PrizeTypeId"]),
                                PrizeTypeName = reader["PrizeTypeName"] == DBNull.Value ? null : reader["PrizeTypeName"].ToString(),
                                PrizeAmount = reader["PrizeAmount"] == DBNull.Value ? null : Convert.ToDecimal(reader["PrizeAmount"]),
                                PatternNumber = reader["PatternNumber"] == DBNull.Value ? null : Convert.ToInt16(reader["PatternNumber"]),
                                JudgeIds = new List<int>()
                            };
                        }
                    }

                    if (item != null)
                    {
                        item.JudgeIds = GetJudgeIdsByClassId(item.ClassInCompId, connection);
                    }

                    return item;
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertClassInCompetition(ClassInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", item.CompetitionId },
                { "@ClassTypeId", item.ClassTypeId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@ClassDateTime", item.ClassDateTime },
                { "@StartTime", item.StartTime },
                { "@OrderInDay", item.OrderInDay },
                { "@OrganizerCost", item.OrganizerCost },
                { "@FederationCost", item.FederationCost },
                { "@ClassNotes", item.ClassNotes }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            int newClassInCompId;

                            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertClassInCompetition", connection, paramDic))
                            {
                                command.Transaction = transaction;
                                object result = command.ExecuteScalar()!;
                                newClassInCompId = Convert.ToInt32(result);
                            }

                            ReplaceClassJudges(newClassInCompId, item.JudgeIds, connection, transaction);
                            SaveClassPrize(newClassInCompId, item.PrizeTypeId, item.PrizeAmount, connection, transaction);
                            SaveReiningType(newClassInCompId, item.PatternNumber, connection, transaction);

                            transaction.Commit();
                            return newClassInCompId;
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateClassInCompetition(ClassInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", item.ClassInCompId },
                { "@ClassTypeId", item.ClassTypeId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@ClassDateTime", item.ClassDateTime },
                { "@StartTime", item.StartTime },
                { "@OrderInDay", item.OrderInDay },
                { "@OrganizerCost", item.OrganizerCost },
                { "@FederationCost", item.FederationCost },
                { "@ClassNotes", item.ClassNotes }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateClassInCompetition", connection, paramDic))
                            {
                                command.Transaction = transaction;
                                command.ExecuteNonQuery();
                            }

                            ReplaceClassJudges(item.ClassInCompId, item.JudgeIds, connection, transaction);
                            SaveClassPrize(item.ClassInCompId, item.PrizeTypeId, item.PrizeAmount, connection, transaction);
                            SaveReiningType(item.ClassInCompId, item.PatternNumber, connection, transaction);

                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void DeleteClassInCompetition(int classInCompId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            DeleteReiningTypeByClassId(classInCompId, connection, transaction);
                            DeleteClassJudgesByClassId(classInCompId, connection, transaction);
                            DeleteClassPrizeByClassId(classInCompId, connection, transaction);

                            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteClassInCompetition", connection, paramDic))
                            {
                                command.Transaction = transaction;
                                command.ExecuteNonQuery();
                            }

                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private List<int> GetJudgeIdsByClassId(int classInCompId, NpgsqlConnection connection)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            List<int> judgeIds = new List<int>();

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetJudgesByClassId", connection, paramDic))
            using (NpgsqlDataReader reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    judgeIds.Add(Convert.ToInt32(reader["JudgeId"]));
                }
            }

            return judgeIds;
        }

        private void ReplaceClassJudges(
            int classInCompId,
            List<int> judgeIds,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            DeleteClassJudgesByClassId(classInCompId, connection, transaction);

            foreach (int judgeId in judgeIds.Distinct())
            {
                Dictionary<string, object> paramDic = new Dictionary<string, object>
                {
                    { "@ClassInCompId", classInCompId },
                    { "@JudgeId", judgeId }
                };

                using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertClassJudge", connection, paramDic))
                {
                    command.Transaction = transaction;
                    command.ExecuteNonQuery();
                }
            }
        }

        private void SaveClassPrize(
            int classInCompId,
            byte? prizeTypeId,
            decimal? prizeAmount,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            DeleteClassPrizeByClassId(classInCompId, connection, transaction);

            if (!prizeTypeId.HasValue || !prizeAmount.HasValue)
            {
                return;
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId },
                { "@PrizeTypeId", prizeTypeId.Value },
                { "@PrizeAmount", prizeAmount.Value }
            };

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpsertClassPrize", connection, paramDic))
            {
                command.Transaction = transaction;
                command.ExecuteNonQuery();
            }
        }

        private void SaveReiningType(
            int classInCompId,
            short? patternNumber,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            DeleteReiningTypeByClassId(classInCompId, connection, transaction);

            if (!patternNumber.HasValue)
            {
                return;
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ReiningClassInCompId", classInCompId },
                { "@PatternNumber", patternNumber.Value }
            };

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpsertReiningType", connection, paramDic))
            {
                command.Transaction = transaction;
                command.ExecuteNonQuery();
            }
        }

        private void DeleteClassJudgesByClassId(
            int classInCompId,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteClassJudgesByClassId", connection, paramDic))
            {
                command.Transaction = transaction;
                command.ExecuteNonQuery();
            }
        }

        private void DeleteClassPrizeByClassId(
            int classInCompId,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteClassPrizeByClassId", connection, paramDic))
            {
                command.Transaction = transaction;
                command.ExecuteNonQuery();
            }
        }

        private void DeleteReiningTypeByClassId(
            int classInCompId,
            NpgsqlConnection connection,
            NpgsqlTransaction transaction)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteReiningTypeByClassId", connection, paramDic))
            {
                command.Transaction = transaction;
                command.ExecuteNonQuery();
            }
        }
    }
}