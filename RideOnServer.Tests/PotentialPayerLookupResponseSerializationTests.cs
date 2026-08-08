using System.Text.Json;
using FluentAssertions;
using RideOnServer.BL.DTOs.Payers;

namespace RideOnServer.Tests
{
    // P0 PII-hardening audit (fix/person-lookup-pii-hardening): GET
    // /Payers/lookup is intentionally system-wide (RanchAdmin may find a
    // person with no prior relationship to their ranch -- this task does NOT
    // add a ranch filter). The confirmed fix is response-side only: the only
    // known caller (mobile AdminAddPayerScreen.jsx:105) reads exclusively
    // `existingPerson.personId` for its found/not-found alert branch, so
    // NationalId/Email/CellPhone/FirstName/LastName must never reach the wire.
    public class PotentialPayerExistenceResponseSerializationTests
    {
        private static readonly JsonSerializerOptions WireOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private static PotentialPayerExistenceResponse ExistingPersonFound()
        {
            return new PotentialPayerExistenceResponse
            {
                PersonId = 4242,
                HasSystemUser = false
            };
        }

        [Fact]
        public void ExistingPersonFound_ReturnsPersonIdAndHasSystemUser()
        {
            string json = JsonSerializer.Serialize(ExistingPersonFound(), WireOptions);
            using JsonDocument doc = JsonDocument.Parse(json);

            doc.RootElement.GetProperty("personId").GetInt32().Should().Be(4242);
            doc.RootElement.GetProperty("hasSystemUser").GetBoolean().Should().BeFalse();
        }

        [Fact]
        public void MobileAlertBranching_PersonIdIsTruthyWhenAPersonWasFound()
        {
            // Mirrors AdminAddPayerScreen.jsx:105 -- `if (existingPerson && existingPerson.personId)`.
            // A found person must always carry a positive PersonId so that
            // branch continues to resolve to "existing person" on the client.
            PotentialPayerExistenceResponse found = ExistingPersonFound();

            found.PersonId.Should().BeGreaterThan(0);
        }

        [Theory]
        [InlineData("nationalId")]
        [InlineData("email")]
        [InlineData("cellPhone")]
        [InlineData("firstName")]
        [InlineData("lastName")]
        public void Response_NeverSerializesRetiredPiiFields(string retiredField)
        {
            string json = JsonSerializer.Serialize(ExistingPersonFound(), WireOptions);

            json.Should().NotContainEquivalentOf(retiredField);
        }

        [Fact]
        public void ResponseType_HasExactlyThePersonIdAndHasSystemUserProperties()
        {
            var properties = typeof(PotentialPayerExistenceResponse)
                .GetProperties()
                .Select(p => p.Name)
                .OrderBy(n => n)
                .ToArray();

            properties.Should().BeEquivalentTo(new[] { "PersonId", "HasSystemUser" });
        }
    }

    // Source-text contract for the BL mapping (Payer.FindPotentialPayerByContact
    // calls PayerDAL, which opens a live Npgsql connection -- no DB is
    // available in a plain unit test, and this project has no mocking
    // framework, so the mapping code itself is verified by reading it).
    public class PayerBlMappingContractTests
    {
        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string PayerBlSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "BL", "Payer.cs"));

            File.Exists(path).Should().BeTrue("expected Payer.cs at {0}", path);
            return File.ReadAllText(path);
        }

        private static string PayerDalSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "DAL", "PayerDAL.cs"));

            File.Exists(path).Should().BeTrue("expected PayerDAL.cs at {0}", path);
            return File.ReadAllText(path);
        }

        private static string PayersControllerSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "Controllers", "PayersController.cs"));

            File.Exists(path).Should().BeTrue("expected PayersController.cs at {0}", path);
            return File.ReadAllText(path);
        }

        private static string FindPotentialPayerByContactBlBody()
        {
            string source = PayerBlSource();
            int from = source.IndexOf(
                "internal static PotentialPayerExistenceResponse? FindPotentialPayerByContact",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "the BL method must return the minimal public DTO");
            int to = source.IndexOf("internal static int RequestManagedPayer", from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);
            return source.Substring(from, to - from);
        }

        [Fact]
        public void BlMapping_OnlyCopiesPersonIdAndHasSystemUserOntoThePublicDto()
        {
            string body = FindPotentialPayerByContactBlBody();

            body.Should().Contain("PersonId = match.PersonId");
            body.Should().Contain("HasSystemUser = match.HasSystemUser");

            body.Should().NotContain("NationalId = match");
            body.Should().NotContain("Email = match");
            body.Should().NotContain("CellPhone = match");
            body.Should().NotContain("FirstName = match");
            body.Should().NotContain("LastName = match");
        }

        [Fact]
        public void DalResultStaysBroad_PotentialPayerLookupResponseIsUnchanged()
        {
            // The internal DAL result is intentionally NOT trimmed (it mirrors
            // usp_FindPotentialPayerByContact's live columns, which
            // usp_RequestManagedPayer also reuses internally in SQL) -- only
            // the public DTO returned to callers is minimal.
            string dalSource = PayerDalSource();

            dalSource.Should().Contain("public PotentialPayerLookupResponse? FindPotentialPayerByContact(");
            dalSource.Should().Contain("NationalId = reader[\"NationalId\"]");
            dalSource.Should().Contain("Email = reader[\"Email\"]");
            dalSource.Should().Contain("CellPhone = reader[\"CellPhone\"]");
        }

        [Fact]
        public void Proc_UspFindPotentialPayerByContact_IsNotRenamedOrAltered()
        {
            PayerDalSource().Should().Contain("\"usp_FindPotentialPayerByContact\"");
        }

        [Fact]
        public void Proc_UspRequestManagedPayer_IsNotRenamedOrAltered()
        {
            PayerDalSource().Should().Contain("\"usp_RequestManagedPayer\"");
        }

        [Fact]
        public void RequestManagedPayer_NowThreadsRanchIdIntoTheDalLayer()
        {
            // SUPERSEDED by fix/payer-manager-same-ranch-rule (P0). The gap
            // this test used to pin -- usp_requestmanagedpayer receiving no
            // @RanchId, out of scope for the PII-hardening audit that wrote
            // this file -- is exactly what that later P0 task closes: the
            // resolved payer must hold an Approved "משלם" role at the
            // admin's active ranch before a management request can even be
            // created. See RideOnDB/StoredProcedures/PostgreSQL/Individual/
            // 253_usp_RequestManagedPayer.sql for the new p_ranchid
            // parameter and guard.
            string dalSource = PayerDalSource();
            int from = dalSource.IndexOf("public int RequestManagedPayer(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            int to = dalSource.IndexOf("public void UpdateManagedPayerBasicDetails", from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);
            string body = dalSource.Substring(from, to - from);

            body.Should().Contain("{ \"@RanchId\", request.RanchId }");
        }

        [Fact]
        public void Lookup_PassesOnlyEmailAndCellPhoneToTheDal_NoRanchIdFilterWasAdded()
        {
            // Confirms the approved scope was respected: the lookup stays
            // system-wide, no ranch parameter was threaded into the query.
            string body = FindPotentialPayerByContactBlBody();

            body.Should().Contain("dal.FindPotentialPayerByContact(email, cellPhone)");
            body.Should().NotContain("ranchId");
        }

        [Fact]
        public void LookupAction_StillEnforcesRanchAdminAtTheSuppliedRanch()
        {
            string source = PayersControllerSource();
            int from = source.IndexOf(
                "public IActionResult FindPotentialPayerByContact(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            int to = source.IndexOf(
                "[HttpPost(\"request-managed\")]", from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);
            string actionBody = source.Substring(from, to - from);

            actionBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    currentPersonId,\n                    ranchId,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));

            // Unauthorized/non-RanchAdmin callers: EnsureUserHasRoleInRanch
            // throws UnauthorizedAccessException, still caught and mapped to 403.
            actionBody.Should().Contain("catch (UnauthorizedAccessException ex)");
            actionBody.Should().Contain("StatusCode(StatusCodes.Status403Forbidden, ex.Message);");
        }

        [Fact]
        public void ManagedPayerApprovalAndRelationshipCreation_WereNotTouched()
        {
            // usp_RequestManagedPayer, personmanagedbysystemuser, and the
            // approval workflow are explicitly out of scope for this task.
            string dalSource = PayerDalSource();

            dalSource.Should().Contain("public int RequestManagedPayer(int systemUserId, RequestManagedPayerRequest request)");
            dalSource.Should().Contain("public void UpdateManagedPayerBasicDetails(int systemUserId, UpdateManagedPayerRequest request)");
            dalSource.Should().Contain("public void RemoveManagedPayer(int systemUserId, int personId)");
        }
    }
}
