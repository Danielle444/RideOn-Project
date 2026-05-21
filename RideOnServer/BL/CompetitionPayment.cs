using RideOnServer.BL.DTOs.CompetitionPayments;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class CompetitionPayment
    {
        public static List<CompetitionPayerPaymentSummaryItem>
            GetPayersPaymentSummary(
                int competitionId,
                int ranchId)
        {
            ValidateCompetitionAndRanch(competitionId, ranchId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetPayersPaymentSummary(
                competitionId
            );
        }

        public static List<CompetitionPayerAccountSummaryItem>
            GetPayerAccountSummary(
                int competitionId,
                int ranchId,
                int payerPersonId)
        {
            ValidateCompetitionAndRanch(competitionId, ranchId);
            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetPayerAccountSummary(
                competitionId,
                payerPersonId
            );
        }

        public static List<CompetitionPayerCategorySummaryItem>
            GetPayerCategorySummary(
                int competitionId,
                int ranchId,
                int payerPersonId)
        {
            ValidateCompetitionAndRanch(competitionId, ranchId);
            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetPayerCategorySummary(
                competitionId,
                payerPersonId
            );
        }

        public static List<CompetitionPayerChargeItem>
            GetPayerCharges(
                int competitionId,
                int ranchId,
                int payerPersonId,
                string? chargeOwner,
                string? categoryKey)
        {
            ValidateCompetitionAndRanch(competitionId, ranchId);
            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetPayerCharges(
                competitionId,
                payerPersonId,
                NormalizeOptionalText(chargeOwner),
                NormalizeOptionalText(categoryKey)
            );
        }

        public static List<PaymentMethodItem>
            GetPaymentMethods()
        {
            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetPaymentMethods();
        }

        public static int CreateCompetitionPayment(
            CreateCompetitionPaymentRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid payment request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.PayerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            if (request.EnteredBySystemUserId <= 0)
            {
                throw new Exception("Invalid EnteredBySystemUserId");
            }

            request.ChargeOwner = NormalizeRequiredChargeOwner(request.ChargeOwner);

            if (string.IsNullOrWhiteSpace(request.InvoiceNumber))
            {
                throw new Exception("Invoice number is required");
            }

            if (
                request.SelectedCharges == null ||
                request.SelectedCharges.Count == 0
            )
            {
                throw new Exception("At least one charge must be selected");
            }

            if (
                request.PaymentMethods == null ||
                request.PaymentMethods.Count == 0
            )
            {
                throw new Exception("At least one payment method must be selected");
            }

            foreach (CreateCompetitionPaymentChargeItem charge in request.SelectedCharges)
            {
                if (charge.BillChargeId <= 0)
                {
                    throw new Exception("Invalid BillChargeId");
                }
            }

            foreach (CreateCompetitionPaymentMethodItem method in request.PaymentMethods)
            {
                if (method.PaymentMethodId <= 0)
                {
                    throw new Exception("Invalid PaymentMethodId");
                }

                if (method.Amount <= 0)
                {
                    throw new Exception("Payment amount must be greater than zero");
                }

                if (
                    request.ChargeOwner == "Federation" &&
                    method.PaymentMethodId != 1
                )
                {
                    throw new Exception("Federation payments must use credit card only");
                }
            }

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.CreateCompetitionPayment(request);
        }

        private static void ValidateCompetitionAndRanch(
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

        private static void ValidatePayer(int payerPersonId)
        {
            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }
        }

        private static string? NormalizeOptionalText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return value.Trim();
        }

        private static string NormalizeRequiredChargeOwner(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new Exception("ChargeOwner is required");
            }

            string normalized = value.Trim();

            if (normalized != "Organizer" && normalized != "Federation")
            {
                throw new Exception("ChargeOwner must be Organizer or Federation");
            }

            return normalized;
        }
    }
}