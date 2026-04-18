using Npgsql;
using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.DAL
{
    public class EntryDAL : DBServices
    {
        public int InsertEntry(CreateEntryRequest request)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@p_classincompid", request.ClassInCompId },
                { "@p_orderedbysystemuserid", request.OrderedBySystemUserId },
                { "@p_ranchid", request.RanchId }, 
                { "@p_horseid", request.HorseId },
                { "@p_riderfederationmemberid", request.RiderFederationMemberId },
                { "@p_paidbypersonid", request.PaidByPersonId },
                { "@p_coachfederationmemberid", request.CoachFederationMemberId },
                { "@p_prizerecipientname", request.PrizeRecipientName }
            };

            using var connection = Connect("DefaultConnection");
            connection.Open();

            using var command = CreateCommandWithStoredProcedure(
                "usp_insertentry",
                connection,
                paramDic
            );

            object? result = command.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create entry");
            }

            return Convert.ToInt32(result);
        }
    }
}