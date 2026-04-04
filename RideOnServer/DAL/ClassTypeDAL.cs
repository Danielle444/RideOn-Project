using Microsoft.Data.SqlClient;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ClassTypeDAL : DBServices
    {
        public List<ClassType> GetAllClassTypes(byte? fieldId = null)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldId", fieldId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllClassTypes", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<ClassType> list = new List<ClassType>();

                        while (reader.Read())
                        {
                            list.Add(new ClassType
                            {
                                ClassTypeId = Convert.ToInt16(reader["ClassTypeId"]),
                                FieldId = Convert.ToByte(reader["FieldId"]),
                                FieldName = reader["FieldName"] == DBNull.Value
                                    ? string.Empty
                                    : reader["FieldName"].ToString() ?? string.Empty,
                                ClassName = reader["ClassName"].ToString() ?? string.Empty,
                                JudgingSheetFormat = reader["JudgingSheetFormat"] == DBNull.Value
                                    ? string.Empty
                                    : reader["JudgingSheetFormat"].ToString() ?? string.Empty,
                                QualificationDescription = reader["QualificationDescription"] == DBNull.Value
                                    ? string.Empty
                                    : reader["QualificationDescription"].ToString() ?? string.Empty
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

        public int InsertClassType(
            byte fieldId,
            string className,
            string judgingSheetFormat,
            string qualificationDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldId", fieldId },
                { "@ClassName", className },
                { "@JudgingSheetFormat", string.IsNullOrWhiteSpace(judgingSheetFormat) ? DBNull.Value : judgingSheetFormat },
                { "@QualificationDescription", string.IsNullOrWhiteSpace(qualificationDescription) ? DBNull.Value : qualificationDescription }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertClassType", connection, paramDic))
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

        public void UpdateClassType(
            short classTypeId,
            byte fieldId,
            string className,
            string judgingSheetFormat,
            string qualificationDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassTypeId", classTypeId },
                { "@FieldId", fieldId },
                { "@ClassName", className },
                { "@JudgingSheetFormat", string.IsNullOrWhiteSpace(judgingSheetFormat) ? DBNull.Value : judgingSheetFormat },
                { "@QualificationDescription", string.IsNullOrWhiteSpace(qualificationDescription) ? DBNull.Value : qualificationDescription }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateClassType", connection, paramDic))
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

        public void DeleteClassType(short classTypeId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassTypeId", classTypeId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteClassType", connection, paramDic))
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