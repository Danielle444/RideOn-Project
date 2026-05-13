using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ChangeEntryRequestDAL : DBServices
    {
        public int InsertChangeEntryRequest(
            int originalEntryId,
            int? newEntryId,
            bool isCancelled,
            int? fineId,
            decimal? fineAmountSnapshot
        )
        {
            Dictionary<string, object> paramDic =
                new Dictionary<string, object>
                {
                    { "@originalentryid_param", originalEntryId },

                    {
                        "@newentryid_param",
                        newEntryId == null
                            ? DBNull.Value
                            : newEntryId
                    },

                    { "@status_param", "Pending" },

                    { "@iscancelled_param", isCancelled },

                    {
                        "@fineid_param",
                        fineId == null
                            ? DBNull.Value
                            : fineId
                    },

                    {
                        "@fineamountsnapshot_param",
                        fineAmountSnapshot == null
                            ? DBNull.Value
                            : fineAmountSnapshot
                    }
                };

            try
            {
                using (
                    NpgsqlConnection connection =
                        Connect("DefaultConnection")
                )
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command =
                            CreateCommandWithStoredProcedure(
                                "usp_InsertChangeEntryRequest",
                                connection,
                                paramDic
                            )
                    )
                    {
                        object result =
                            command.ExecuteScalar()!;

                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}