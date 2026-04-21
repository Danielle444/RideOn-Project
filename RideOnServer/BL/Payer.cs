using RideOnServer.DAL;
using RideOnServer.BL.DTOs.Payers;
using System.Security.Cryptography;

namespace RideOnServer.BL
{
    public class Payer
    {
        internal static List<ManagedPayerListItem> GetManagedPayersBySystemUser(
            int systemUserId,
            GetManagedPayersFiltersRequest filters)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetManagedPayersBySystemUser(systemUserId, filters);
        }

        internal static PotentialPayerLookupResponse? FindPotentialPayerByContact(string? email, string? cellPhone)
        {
            if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(cellPhone))
            {
                throw new Exception("Email or CellPhone is required");
            }

            PayerDAL dal = new PayerDAL();
            return dal.FindPotentialPayerByContact(email, cellPhone);
        }

        internal static int RequestManagedPayer(int systemUserId, RequestManagedPayerRequest request)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                throw new Exception("FirstName is required");
            }

            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                throw new Exception("LastName is required");
            }

            if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.CellPhone))
            {
                throw new Exception("Email or CellPhone is required");
            }

            PayerDAL dal = new PayerDAL();
            return dal.RequestManagedPayer(systemUserId, request);
        }

        internal static void UpdateManagedPayerBasicDetails(int systemUserId, UpdateManagedPayerRequest request)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                throw new Exception("FirstName is required");
            }

            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                throw new Exception("LastName is required");
            }

            PayerDAL dal = new PayerDAL();
            dal.UpdateManagedPayerBasicDetails(systemUserId, request);
        }

        internal static void RemoveManagedPayer(int systemUserId, int personId)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            dal.RemoveManagedPayer(systemUserId, personId);
        }

        internal static List<CompetitionPayerListItem> GetCompetitionPayersBySystemUser(int systemUserId,GetCompetitionPayersFiltersRequest filters)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetCompetitionPayersBySystemUser(systemUserId, filters);
        }

        internal static List<PayerManagerItem> GetPayerManagers(int personId)
        {
            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetPayerManagers(personId);
        }

        internal static List<AvailablePayerManagerItem> GetAvailablePayerManagers(int personId, string? searchText)
        {
            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetAvailablePayerManagers(personId, searchText);
        }

        internal static void AddPayerManager(int currentPersonId, AddPayerManagerRequest request)
        {
            if (currentPersonId <= 0)
            {
                throw new Exception("Invalid current PersonId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.AdminPersonId <= 0)
            {
                throw new Exception("Invalid AdminPersonId");
            }

            if (currentPersonId != request.PersonId)
            {
                throw new UnauthorizedAccessException("You can only update your own managing admins");
            }

            PayerDAL dal = new PayerDAL();
            dal.AddPayerManager(request.PersonId, request.AdminPersonId);
        }

        internal static void RemovePayerManager(int currentPersonId, RemovePayerManagerRequest request)
        {
            if (currentPersonId <= 0)
            {
                throw new Exception("Invalid current PersonId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.AdminPersonId <= 0)
            {
                throw new Exception("Invalid AdminPersonId");
            }

            if (currentPersonId != request.PersonId)
            {
                throw new UnauthorizedAccessException("You can only update your own managing admins");
            }

            PayerDAL dal = new PayerDAL();
            dal.RemovePayerManager(request.PersonId, request.AdminPersonId);
        }

        internal static int CreatePayerWithCredentials(
            CreatePayerWithCredentialsRequest request,
            string ranchName,
            IConfiguration configuration)
        {
            if (string.IsNullOrWhiteSpace(request.FirstName))
                throw new Exception("First name is required");

            if (string.IsNullOrWhiteSpace(request.LastName))
                throw new Exception("Last name is required");

            if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
                throw new Exception("Valid email is required");

            if (request.RanchId <= 0)
                throw new Exception("Valid RanchId is required");

            RoleDAL roleDAL = new RoleDAL();
            List<Role> roles = roleDAL.GetAllRoles();
            Role? payerRole = roles.Find(r => r.RoleName == RoleNames.Payer);

            if (payerRole == null)
                throw new Exception("Payer role not found in system");

            // שם משתמש אוטומטי — placeholder hash שלא ניתן לנחש
            string username = "p" + Guid.NewGuid().ToString("N").Substring(0, 8);
            string placeholderSalt = PasswordHelper.GenerateSalt();
            string placeholderHash = PasswordHelper.HashPassword(
                Guid.NewGuid().ToString(), placeholderSalt);

            PayerDAL payerDal = new PayerDAL();
            var result = payerDal.CreatePayerWithCredentials(
                request.FirstName.Trim(),
                request.LastName.Trim(),
                request.Email.Trim(),
                string.IsNullOrWhiteSpace(request.CellPhone) ? null : request.CellPhone.Trim(),
                username,
                placeholderHash,
                placeholderSalt,
                request.RanchId,
                payerRole.RoleId
            );

            // יצירת registration token
            string rawToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            string tokenHash = PasswordHelper.HashPassword(rawToken, "registration-salt");
            DateTime expiresAt = DateTime.UtcNow.AddHours(72);

            RegistrationDAL regDal = new RegistrationDAL();
            regDal.SaveRegistrationToken(result.NewPersonId, tokenHash, expiresAt);

            // בניית קישור הרשמה
            string baseUrl = configuration["App:WebBaseUrl"] ?? "http://localhost:5173";
            string registrationLink = $"{baseUrl}/complete-registration?token={rawToken}";

            // שליחת מייל
            EmailService emailService = new EmailService(configuration);
            emailService.SendPayerRegistrationLinkEmail(
                request.Email.Trim(),
                request.FirstName.Trim(),
                ranchName,
                registrationLink
            );

            return result.NewPersonId;
        }

        internal static List<PendingPayerRegistrationItem> GetPendingPayerRegistrations()
        {
            PayerDAL dal = new PayerDAL();
            return dal.GetPendingPayerRegistrations();
        }

        internal static void ApprovePendingPayer(PayerRegistrationActionRequest request)
        {
            if (request.PersonId <= 0) throw new Exception("Invalid PersonId");
            if (request.RanchId <= 0) throw new Exception("Invalid RanchId");
            if (request.RoleId <= 0) throw new Exception("Invalid RoleId");

            PayerDAL dal = new PayerDAL();
            dal.ApprovePendingPayer(request.PersonId, request.RanchId, request.RoleId);
        }

        internal static void RejectPendingPayer(PayerRegistrationActionRequest request)
        {
            if (request.PersonId <= 0) throw new Exception("Invalid PersonId");
            if (request.RanchId <= 0) throw new Exception("Invalid RanchId");
            if (request.RoleId <= 0) throw new Exception("Invalid RoleId");

            PayerDAL dal = new PayerDAL();
            dal.RejectPendingPayer(request.PersonId, request.RanchId, request.RoleId);
        }

        private static string GenerateTempPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
            char[] password = new char[8];

            using RandomNumberGenerator rng = RandomNumberGenerator.Create();
            byte[] buffer = new byte[8];
            rng.GetBytes(buffer);

            for (int i = 0; i < 8; i++)
            {
                password[i] = chars[buffer[i] % chars.Length];
            }

            return new string(password);
        }

    }
}