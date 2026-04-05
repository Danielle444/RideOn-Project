using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class JudgeDAL : DBServices
    {
        public List<Judge> GetAllJudges(byte? fieldId = null)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldId", fieldId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllJudges", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Judge> list = new List<Judge>();

                        while (reader.Read())
                        {
                            list.Add(new Judge
                            {
                                JudgeId = Convert.ToInt32(reader["JudgeId"]),
                                FirstNameHebrew = reader["FirstNameHebrew"].ToString() ?? string.Empty,
                                LastNameHebrew = reader["LastNameHebrew"].ToString() ?? string.Empty,
                                FirstNameEnglish = reader["FirstNameEnglish"].ToString() ?? string.Empty,
                                LastNameEnglish = reader["LastNameEnglish"].ToString() ?? string.Empty,
                                Country = reader["Country"].ToString() ?? string.Empty,
                                QualifiedFields = reader["QualifiedFields"] == DBNull.Value
                                    ? string.Empty
                                    : reader["QualifiedFields"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int InsertJudge(
            string firstNameHebrew,
            string lastNameHebrew,
            string firstNameEnglish,
            string lastNameEnglish,
            string country,
            string fieldIdsCsv)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FirstNameHebrew", firstNameHebrew },
                { "@LastNameHebrew", lastNameHebrew },
                { "@FirstNameEnglish", firstNameEnglish },
                { "@LastNameEnglish", lastNameEnglish },
                { "@Country", country },
                { "@FieldIdsCsv", fieldIdsCsv }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertJudge", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void UpdateJudge(
            int judgeId,
            string firstNameHebrew,
            string lastNameHebrew,
            string firstNameEnglish,
            string lastNameEnglish,
            string country,
            string fieldIdsCsv)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@JudgeId", judgeId },
                { "@FirstNameHebrew", firstNameHebrew },
                { "@LastNameHebrew", lastNameHebrew },
                { "@FirstNameEnglish", firstNameEnglish },
                { "@LastNameEnglish", lastNameEnglish },
                { "@Country", country },
                { "@FieldIdsCsv", fieldIdsCsv }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateJudge", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void DeleteJudge(int judgeId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@JudgeId", judgeId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteJudge", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}