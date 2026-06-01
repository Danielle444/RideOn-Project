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

        public int CancelEntryByPayer(int entryId, int payerPersonId)
        {
            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT public.usp_cancelentrybypayer(
                        p_entryid       := @entryId,
                        p_payerpersonid := @payerPersonId
                    );", connection);

                command.Parameters.Add("@entryId", NpgsqlTypes.NpgsqlDbType.Integer).Value = entryId;
                command.Parameters.Add("@payerPersonId", NpgsqlTypes.NpgsqlDbType.Integer).Value = payerPersonId;

                object? result = command.ExecuteScalar();

                if (result == null || result == DBNull.Value)
                {
                    throw new Exception("Failed to create payer cancel request");
                }

                return Convert.ToInt32(result);
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}