using Microsoft.Data.SqlClient;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class FieldDAL : DBServices
    {
        public List<Field> GetAllFields()
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllFields", connection, null))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<Field> list = new List<Field>();

                        while (reader.Read())
                        {
                            list.Add(new Field
                            {
                                FieldId = Convert.ToInt16(reader["FieldId"]),
                                FieldName = reader["FieldName"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertField(string fieldName)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldName", fieldName }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertField", connection, paramDic))
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

        public void UpdateField(short fieldId, string fieldName)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldId", fieldId },
                { "@FieldName", fieldName }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateField", connection, paramDic))
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

        public void DeleteField(short fieldId)
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

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteField", connection, paramDic))
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