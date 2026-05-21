using RideOnServer.BL.DTOs.CompetitionSummary;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class CompetitionSummary
    {
        public static CompetitionSummaryResponse GetCompetitionSummary(
            int competitionId,
            int ranchId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            List<CompetitionSummaryCategoryItem> items =
                dal.GetCompetitionSummaryByCategory(
                    competitionId,
                    ranchId
                );

            CompetitionSummaryResponse response =
                new CompetitionSummaryResponse();

            response.OrganizerCategories =
                items
                    .Where(item => item.SectionKey == "organizer")
                    .ToList();

            response.FederationCategories =
                items
                    .Where(item => item.SectionKey == "federation")
                    .ToList();

            response.Organizer =
                BuildTotals(response.OrganizerCategories);

            response.Federation =
                BuildTotals(response.FederationCategories);

            return response;
        }

        private static CompetitionSummaryAmountDto BuildTotals(
            List<CompetitionSummaryCategoryItem> items)
        {
            return new CompetitionSummaryAmountDto
            {
                ExpectedAmount =
                    items.Sum(item => item.ExpectedAmount),

                PaidAmount =
                    items.Sum(item => item.PaidAmount),

                UnpaidAmount =
                    items.Sum(item => item.UnpaidAmount)
            };
        }

        public static List<CompetitionSummaryClassDetailItem>
        GetCompetitionSummaryClassDetails(
            int competitionId,
            int ranchId,
            string sectionKey)
        {
            ValidateSummaryRequest(competitionId, ranchId, sectionKey);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryClassDetails(
                competitionId,
                ranchId,
                sectionKey
            );
        }

        public static List<CompetitionSummaryClassEntryItem>
            GetCompetitionSummaryClassEntries(
                int competitionId,
                int ranchId,
                int classInCompId,
                string sectionKey)
        {
            ValidateSummaryRequest(competitionId, ranchId, sectionKey);

            if (classInCompId <= 0)
            {
                throw new Exception("Invalid ClassInCompId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryClassEntries(
                competitionId,
                ranchId,
                classInCompId,
                sectionKey
            );
        }

        private static void ValidateSummaryRequest(
            int competitionId,
            int ranchId,
            string sectionKey)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (
                sectionKey != "organizer" &&
                sectionKey != "federation"
            )
            {
                throw new Exception("Invalid SectionKey");
            }
        }

        public static List<CompetitionSummaryPaidTimeDetailItem>
    GetCompetitionSummaryPaidTimeDetails(
        int competitionId,
        int ranchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryPaidTimeDetails(
                competitionId,
                ranchId
            );
        }

        public static List<CompetitionSummaryPaidTimeEntryItem>
            GetCompetitionSummaryPaidTimeEntries(
                int competitionId,
                int ranchId,
                int paidTimeSlotInCompId,
                short productId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            if (paidTimeSlotInCompId <= 0)
            {
                throw new Exception("Invalid PaidTimeSlotInCompId");
            }

            if (productId <= 0)
            {
                throw new Exception("Invalid ProductId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryPaidTimeEntries(
                competitionId,
                ranchId,
                paidTimeSlotInCompId,
                productId
            );
        }

        public static List<CompetitionSummaryStallDetailItem>
            GetCompetitionSummaryStallDetails(
                int competitionId,
                int ranchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryStallDetails(
                competitionId,
                ranchId
            );
        }

        public static List<CompetitionSummaryStallEntryItem>
            GetCompetitionSummaryStallEntries(
                int competitionId,
                int ranchId,
                int bookingRanchId,
                short productId,
                bool isForTack)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            if (bookingRanchId <= 0)
            {
                throw new Exception("Invalid BookingRanchId");
            }

            if (productId <= 0)
            {
                throw new Exception("Invalid ProductId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryStallEntries(
                competitionId,
                ranchId,
                bookingRanchId,
                productId,
                isForTack
            );
        }

        public static List<CompetitionSummaryShavingsDetailItem>
            GetCompetitionSummaryShavingsDetails(
                int competitionId,
                int ranchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryShavingsDetails(
                competitionId,
                ranchId
            );
        }

        public static List<CompetitionSummaryShavingsEntryItem>
            GetCompetitionSummaryShavingsEntries(
                int competitionId,
                int ranchId,
                int bookingRanchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            if (bookingRanchId <= 0)
            {
                throw new Exception("Invalid BookingRanchId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryShavingsEntries(
                competitionId,
                ranchId,
                bookingRanchId
            );
        }

        public static List<CompetitionSummaryCashDetailItem>
            GetCompetitionSummaryCashDetails(
                int competitionId,
                int ranchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetCompetitionSummaryCashDetails(
                competitionId,
                ranchId
            );
        }

        public static List<CompetitionSummaryPaymentMethodBreakdownItem>
    GetPaymentMethodBreakdown(
        int competitionId,
        int ranchId,
        string chargeOwner)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);
            ValidateChargeOwner(chargeOwner);

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetPaymentMethodBreakdown(
                competitionId,
                ranchId,
                chargeOwner
            );
        }

        public static List<CompetitionSummaryPaymentBatchItem>
            GetPaymentBatches(
                int competitionId,
                int ranchId,
                string chargeOwner,
                int? paymentMethodId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);
            ValidateChargeOwner(chargeOwner);

            if (paymentMethodId != null && paymentMethodId <= 0)
            {
                throw new Exception("Invalid PaymentMethodId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetPaymentBatches(
                competitionId,
                ranchId,
                chargeOwner,
                paymentMethodId
            );
        }

        public static List<CompetitionSummaryPaymentBatchMethodItem>
            GetPaymentBatchMethods(
                int competitionId,
                int ranchId,
                int paymentBatchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            if (paymentBatchId <= 0)
            {
                throw new Exception("Invalid PaymentBatchId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetPaymentBatchMethods(
                competitionId,
                ranchId,
                paymentBatchId
            );
        }

        public static List<CompetitionSummaryPaymentBatchChargeItem>
            GetPaymentBatchCharges(
                int competitionId,
                int ranchId,
                int paymentBatchId)
        {
            ValidateBasicSummaryRequest(competitionId, ranchId);

            if (paymentBatchId <= 0)
            {
                throw new Exception("Invalid PaymentBatchId");
            }

            CompetitionSummaryDAL dal = new CompetitionSummaryDAL();

            return dal.GetPaymentBatchCharges(
                competitionId,
                ranchId,
                paymentBatchId
            );
        }

        private static void ValidateChargeOwner(string chargeOwner)
        {
            if (
                chargeOwner != "Organizer" &&
                chargeOwner != "Federation"
            )
            {
                throw new Exception("Invalid ChargeOwner");
            }
        }

        private static void ValidateBasicSummaryRequest(
            int competitionId,
            int ranchId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }
        }
    }
}