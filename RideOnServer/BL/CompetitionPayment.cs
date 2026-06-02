using RideOnServer.BL.DTOs.CompetitionPayments;
using RideOnServer.DAL;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Http;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

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

            if (request.ChargeOwner == "Federation")
            {
                throw new Exception(
                    "Federation charges must be closed through the federation coverage flow"
                );
            }

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

        public static FederationExternalCreditItem CreateFederationExternalCredit(
    CreateFederationExternalCreditRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid federation external credit request");
            }

            ValidateCompetitionAndRanch(
                request.CompetitionId,
                request.RanchId
            );

            if (request.CreatedBySystemUserId <= 0)
            {
                throw new Exception("Invalid CreatedBySystemUserId");
            }

            request.SourceType = NormalizeRequiredFederationCreditSourceType(
                request.SourceType
            );

            if (request.OriginalAmount <= 0)
            {
                throw new Exception("Original amount must be greater than zero");
            }

            request.ExternalReference = NormalizeOptionalText(
                request.ExternalReference
            );

            request.ExternalName = NormalizeOptionalText(
                request.ExternalName
            );

            request.ExternalClubName = NormalizeOptionalText(
                request.ExternalClubName
            );

            request.ExternalIdNumber = NormalizeOptionalText(
                request.ExternalIdNumber
            );

            request.Notes = NormalizeOptionalText(
                request.Notes
            );

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.CreateFederationExternalCredit(request);
        }

        public static List<FederationExternalCreditItem> SearchFederationExternalCredits(
            int competitionId,
            int ranchId,
            string? searchText,
            bool onlyAvailable)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.SearchFederationExternalCredits(
                competitionId,
                NormalizeOptionalText(searchText),
                onlyAvailable
            );
        }

        public static AllocateFederationCreditResponse AllocateFederationCreditToCharge(
            AllocateFederationCreditRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid federation credit allocation request");
            }

            ValidateCompetitionAndRanch(
                request.CompetitionId,
                request.RanchId
            );

            if (request.FederationExternalCreditId <= 0)
            {
                throw new Exception("Invalid FederationExternalCreditId");
            }

            if (request.BillChargeId <= 0)
            {
                throw new Exception("Invalid BillChargeId");
            }

            if (request.AllocatedAmount <= 0)
            {
                throw new Exception("Allocated amount must be greater than zero");
            }

            if (request.AllocatedBySystemUserId <= 0)
            {
                throw new Exception("Invalid AllocatedBySystemUserId");
            }

            request.Notes = NormalizeOptionalText(
                request.Notes
            );

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.AllocateFederationCreditToCharge(request);
        }

        public static List<FederationCreditAllocationItem> GetFederationCreditAllocations(
            int competitionId,
            int ranchId,
            int federationExternalCreditId)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            if (federationExternalCreditId <= 0)
            {
                throw new Exception("Invalid FederationExternalCreditId");
            }

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetFederationCreditAllocations(
                federationExternalCreditId
            );
        }

        public static FederationCoverageStatusItem GetFederationCoverageStatusForPayer(
            int competitionId,
            int ranchId,
            int payerPersonId)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetFederationCoverageStatusForPayer(
                competitionId,
                payerPersonId
            );
        }

        public static List<FederationChargeCoverageItem> GetFederationChargesForPayer(
            int competitionId,
            int ranchId,
            int payerPersonId)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetFederationChargesForPayer(
                competitionId,
                payerPersonId
            );
        }

        public static ValidateFederationCoverageResponse
            ValidateFederationCoverageBeforeOrganizerPayment(
                int competitionId,
                int ranchId,
                int payerPersonId)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            ValidatePayer(payerPersonId);

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.ValidateFederationCoverageBeforeOrganizerPayment(
                competitionId,
                payerPersonId
            );
        }

        public static FederationExcelImportResult ImportFederationExcelCreditsFromExcel(
    int competitionId,
    int ranchId,
    int createdBySystemUserId,
    IFormFile file)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            if (createdBySystemUserId <= 0)
            {
                throw new Exception("Invalid CreatedBySystemUserId");
            }

            if (file == null || file.Length == 0)
            {
                throw new Exception("Excel file is required");
            }

            List<FederationExcelCreditImportRow> rows =
                new List<FederationExcelCreditImportRow>();

            using (Stream stream = file.OpenReadStream())
            using (XLWorkbook workbook = new XLWorkbook(stream))
            {
                IXLWorksheet worksheet = workbook.Worksheets.First();

                IXLRow? headerRow = worksheet.FirstRowUsed();

                if (headerRow == null)
                {
                    throw new Exception("Excel file is empty");
                }

                IXLRow? lastRow = worksheet.LastRowUsed();

                if (lastRow == null)
                {
                    throw new Exception("Excel file is empty");
                }

                Dictionary<int, string> headers = ReadExcelHeaders(headerRow);

                List<int> paidColumnIndexes =
                    headers
                        .Where(header => header.Value.Contains("שולם"))
                        .Select(header => header.Key)
                        .ToList();

                if (paidColumnIndexes.Count == 0)
                {
                    throw new Exception("לא נמצאו באקסל עמודות שמכילות את המילה שולם");
                }

                int receiptColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "מס' קבלה",
                "מספר קבלה",
                "קבלה"
                    }
                );

                int idNumberColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "ת\"ז",
                "ת.ז",
                "תעודת זהות"
                    }
                );

                int firstNameColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "שם פרטי"
                    }
                );

                int lastNameColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "שם משפחה"
                    }
                );

                int clubColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "מועדון",
                "חווה",
                "שם מועדון"
                    }
                );

                int registrationDateColumnIndex = FindExcelColumn(
                    headers,
                    new List<string>
                    {
                "תאריך הרשמה",
                "תאריך"
                    }
                );

                int firstDataRowNumber = headerRow.RowNumber() + 1;
                int lastDataRowNumber = lastRow.RowNumber();

                for (
                    int rowNumber = firstDataRowNumber;
                    rowNumber <= lastDataRowNumber;
                    rowNumber++
                )
                {
                    IXLRow row = worksheet.Row(rowNumber);

                    string? externalReference = ReadExcelCellText(
                        row,
                        receiptColumnIndex
                    );

                    string? externalIdNumber = ReadExcelCellText(
                        row,
                        idNumberColumnIndex
                    );

                    string? firstName = ReadExcelCellText(
                        row,
                        firstNameColumnIndex
                    );

                    string? lastName = ReadExcelCellText(
                        row,
                        lastNameColumnIndex
                    );

                    string? externalClubName = ReadExcelCellText(
                        row,
                        clubColumnIndex
                    );

                    string? registrationDate = ReadExcelCellText(
                        row,
                        registrationDateColumnIndex
                    );

                    string? externalName = BuildFullName(
                        firstName,
                        lastName
                    );

                    decimal totalPaidAmount = 0;

                    List<Dictionary<string, object>> paidColumnsData =
                        new List<Dictionary<string, object>>();

                    foreach (int paidColumnIndex in paidColumnIndexes)
                    {
                        decimal paidAmount = ReadExcelDecimal(
                            row.Cell(paidColumnIndex)
                        );

                        if (paidAmount > 0)
                        {
                            totalPaidAmount += paidAmount;

                            paidColumnsData.Add(
                                new Dictionary<string, object>
                                {
                            {
                                "columnName",
                                headers[paidColumnIndex]
                            },
                            {
                                "amount",
                                paidAmount
                            }
                                }
                            );
                        }
                    }

                    if (
                        totalPaidAmount <= 0 &&
                        string.IsNullOrWhiteSpace(externalReference) &&
                        string.IsNullOrWhiteSpace(externalIdNumber) &&
                        string.IsNullOrWhiteSpace(externalName) &&
                        string.IsNullOrWhiteSpace(externalClubName)
                    )
                    {
                        continue;
                    }

                    string importFingerprint = BuildFederationExcelImportFingerprint(
                        competitionId,
                        externalReference,
                        externalIdNumber,
                        externalName,
                        externalClubName,
                        registrationDate,
                        totalPaidAmount
                    );

                    string rawDataJson = JsonSerializer.Serialize(
                        new
                        {
                            rowNumber = rowNumber,
                            receiptNumber = externalReference,
                            idNumber = externalIdNumber,
                            firstName = firstName,
                            lastName = lastName,
                            fullName = externalName,
                            clubName = externalClubName,
                            registrationDate = registrationDate,
                            totalPaidAmount = totalPaidAmount,
                            paidColumns = paidColumnsData
                        }
                    );

                    rows.Add(
                        new FederationExcelCreditImportRow
                        {
                            RowNumber = rowNumber,
                            CompetitionId = competitionId,
                            SourceType = "ExcelReceipt",
                            ExternalReference = NormalizeOptionalText(
                                externalReference
                            ),
                            ExternalName = NormalizeOptionalText(
                                externalName
                            ),
                            ExternalClubName = NormalizeOptionalText(
                                externalClubName
                            ),
                            ExternalIdNumber = NormalizeOptionalText(
                                externalIdNumber
                            ),
                            OriginalAmount = totalPaidAmount,
                            CreatedBySystemUserId = createdBySystemUserId,
                            Notes = "נוצר מייבוא אקסל תשלומי התאחדות",
                            ImportFingerprint = importFingerprint,
                            RawDataJson = rawDataJson
                        }
                    );
                }
            }

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            FederationExcelImportResult result =
                dal.ImportFederationExcelCredits(rows);

            result.Message =
                "ייבוא אקסל התאחדות הסתיים בהצלחה. נקלטו " +
                result.ImportedCreditsCount +
                " יתרות, דולגו " +
                result.SkippedDuplicatesCount +
                " כפילויות ו-" +
                result.SkippedZeroAmountCount +
                " שורות ללא סכום.";

            return result;
        }


        private static Dictionary<int, string> ReadExcelHeaders(
    IXLRow headerRow)
        {
            Dictionary<int, string> headers =
                new Dictionary<int, string>();

            foreach (IXLCell cell in headerRow.CellsUsed())
            {
                string header = NormalizeExcelText(
                    cell.GetFormattedString()
                );

                if (!string.IsNullOrWhiteSpace(header))
                {
                    headers[cell.Address.ColumnNumber] = header;
                }
            }

            return headers;
        }

        private static int FindExcelColumn(
            Dictionary<int, string> headers,
            List<string> possibleNames)
        {
            foreach (KeyValuePair<int, string> header in headers)
            {
                foreach (string possibleName in possibleNames)
                {
                    if (header.Value == NormalizeExcelText(possibleName))
                    {
                        return header.Key;
                    }
                }
            }

            foreach (KeyValuePair<int, string> header in headers)
            {
                foreach (string possibleName in possibleNames)
                {
                    if (header.Value.Contains(NormalizeExcelText(possibleName)))
                    {
                        return header.Key;
                    }
                }
            }

            return 0;
        }

        private static string? ReadExcelCellText(
            IXLRow row,
            int columnIndex)
        {
            if (columnIndex <= 0)
            {
                return null;
            }

            string value = row.Cell(columnIndex).GetFormattedString();

            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return value.Trim();
        }

        private static decimal ReadExcelDecimal(
            IXLCell cell)
        {
            string value = cell.GetFormattedString();

            if (string.IsNullOrWhiteSpace(value))
            {
                return 0;
            }

            string normalized = value
                .Replace("₪", "")
                .Replace(",", "")
                .Trim();

            decimal amount;

            if (
                decimal.TryParse(
                    normalized,
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out amount
                )
            )
            {
                return amount;
            }

            if (
                decimal.TryParse(
                    normalized,
                    NumberStyles.Any,
                    new CultureInfo("he-IL"),
                    out amount
                )
            )
            {
                return amount;
            }

            return 0;
        }

        private static string? BuildFullName(
            string? firstName,
            string? lastName)
        {
            string fullName =
                ((firstName ?? "") + " " + (lastName ?? "")).Trim();

            if (string.IsNullOrWhiteSpace(fullName))
            {
                return null;
            }

            return fullName;
        }

        private static string NormalizeExcelText(
            string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            return value
                .Replace("\u200f", "")
                .Replace("\u200e", "")
                .Trim();
        }

        private static string BuildFederationExcelImportFingerprint(
            int competitionId,
            string? externalReference,
            string? externalIdNumber,
            string? externalName,
            string? externalClubName,
            string? registrationDate,
            decimal originalAmount)
        {
            string raw =
                competitionId.ToString() +
                "|" +
                NormalizeForFingerprint(externalReference) +
                "|" +
                NormalizeForFingerprint(externalIdNumber) +
                "|" +
                NormalizeForFingerprint(externalName) +
                "|" +
                NormalizeForFingerprint(externalClubName) +
                "|" +
                NormalizeForFingerprint(registrationDate) +
                "|" +
                originalAmount.ToString("0.00", CultureInfo.InvariantCulture);

            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = Encoding.UTF8.GetBytes(raw);
                byte[] hash = sha256.ComputeHash(bytes);

                return Convert.ToHexString(hash).ToLowerInvariant();
            }
        }

        public static List<FederationMatchingSuggestionItem>
    GetFederationMatchingSuggestions(
        int competitionId,
        int ranchId)
        {
            ValidateCompetitionAndRanch(
                competitionId,
                ranchId
            );

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.GetFederationMatchingSuggestions(
                competitionId
            );
        }

        public static ApproveFederationMatchingSuggestionResponse ApproveFederationMatchingSuggestion(
    ApproveFederationMatchingSuggestionRequest request,
    int approvedBySystemUserId)
        {
            ValidateCompetitionAndRanch(
                request.CompetitionId,
                request.RanchId
            );

            if (request.FederationExternalCreditId <= 0)
            {
                throw new Exception("Invalid FederationExternalCreditId");
            }

            if (request.PaidByPersonId <= 0)
            {
                throw new Exception("Invalid PaidByPersonId");
            }

            if (request.Amount <= 0)
            {
                throw new Exception("Amount must be greater than zero");
            }

            if (approvedBySystemUserId <= 0)
            {
                throw new Exception("Invalid approved user");
            }

            CompetitionPaymentDAL dal = new CompetitionPaymentDAL();

            return dal.ApproveFederationMatchingSuggestion(
                request,
                approvedBySystemUserId
            );
        }

        private static string NormalizeForFingerprint(
            string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "";
            }

            return value
                .Replace("\u200f", "")
                .Replace("\u200e", "")
                .Replace(" ", "")
                .Trim()
                .ToLowerInvariant();
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

        private static string NormalizeRequiredFederationCreditSourceType(
    string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new Exception("SourceType is required");
            }

            string normalized = value.Trim();

            if (
                normalized != "ExcelReceipt" &&
                normalized != "BankTransfer" &&
                normalized != "PreviousCredit" &&
                normalized != "Manual" &&
                normalized != "Exception"
            )
            {
                throw new Exception(
                    "SourceType must be ExcelReceipt, BankTransfer, PreviousCredit, Manual or Exception"
                );
            }

            return normalized;
        }
    }
}