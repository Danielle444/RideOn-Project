using System.Text.Json;
using FluentAssertions;
using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.Tests
{
    // P0 PII-hardening audit (fix/person-lookup-pii-hardening): GET
    // /Persons/by-national-id must keep serving everything the registration
    // autofill uses (FirstName/LastName/Gender/DateOfBirth/CellPhone/Email/
    // HasSystemUser -- confirmed the only fields read by both
    // mobile/src/screens/auth/RegisterScreen.jsx and
    // web/src/pages/auth/RegisterScreen.jsx) while never putting PersonId or
    // NationalId on the wire (confirmed unread by either client).
    //
    // No HTTP test host exists in this project, so these tests exercise the
    // exact serializer ASP.NET Core uses for [ApiController] JSON responses
    // (System.Text.Json, camelCase property naming is the framework default)
    // directly against the DTO -- proving the wire shape without needing a
    // live server. PersonDAL's reader-to-DTO mapping is covered separately by
    // PersonDalMapping_* below via source-text contract, the same technique
    // already used in this project (see StallAssignmentsHostRanchAuthorizationTests).
    public class PersonRegistrationLookupResponseSerializationTests
    {
        private static readonly JsonSerializerOptions WireOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        private static PersonRegistrationLookupResponse MatchingPersonWithoutSystemUser()
        {
            return new PersonRegistrationLookupResponse
            {
                FirstName = "דוד",
                LastName = "כהן",
                Gender = "Male",
                DateOfBirth = new DateTime(1990, 5, 12),
                CellPhone = "0501234567",
                Email = "david@example.com",
                HasSystemUser = false
            };
        }

        [Fact]
        public void MatchingPersonWithoutSystemUser_SerializesAllAutofillFieldsWithCorrectValues()
        {
            PersonRegistrationLookupResponse response = MatchingPersonWithoutSystemUser();

            string json = JsonSerializer.Serialize(response, WireOptions);
            using JsonDocument doc = JsonDocument.Parse(json);
            JsonElement root = doc.RootElement;

            root.GetProperty("firstName").GetString().Should().Be("דוד");
            root.GetProperty("lastName").GetString().Should().Be("כהן");
            root.GetProperty("gender").GetString().Should().Be("Male");
            root.GetProperty("dateOfBirth").GetDateTime().Should().Be(new DateTime(1990, 5, 12));
            root.GetProperty("cellPhone").GetString().Should().Be("0501234567");
            root.GetProperty("email").GetString().Should().Be("david@example.com");
            root.GetProperty("hasSystemUser").GetBoolean().Should().BeFalse();
        }

        [Fact]
        public void MatchingPersonWithSystemUser_StillReturnsHasSystemUserTrue()
        {
            PersonRegistrationLookupResponse response = MatchingPersonWithoutSystemUser();
            response.HasSystemUser = true;

            string json = JsonSerializer.Serialize(response, WireOptions);
            using JsonDocument doc = JsonDocument.Parse(json);

            doc.RootElement.GetProperty("hasSystemUser").GetBoolean().Should().BeTrue();
        }

        [Fact]
        public void Response_NeverSerializesPersonId()
        {
            string json = JsonSerializer.Serialize(MatchingPersonWithoutSystemUser(), WireOptions);

            json.Should().NotContainEquivalentOf("personId");
        }

        [Fact]
        public void Response_NeverSerializesNationalId()
        {
            string json = JsonSerializer.Serialize(MatchingPersonWithoutSystemUser(), WireOptions);

            json.Should().NotContainEquivalentOf("nationalId");
        }

        [Fact]
        public void ResponseType_HasNoPersonIdOrNationalIdProperty()
        {
            // Belt-and-suspenders over the JSON check above: proves the fields
            // are gone from the type itself, not merely omitted by a
            // [JsonIgnore] that a future refactor could remove without
            // anyone noticing the wire contract changed.
            Type type = typeof(PersonRegistrationLookupResponse);

            type.GetProperty("PersonId").Should().BeNull();
            type.GetProperty("NationalId").Should().BeNull();
        }

        [Fact]
        public void ResponseType_StillExposesEveryFieldTheClientsAutofillFrom()
        {
            Type type = typeof(PersonRegistrationLookupResponse);

            foreach (string expected in new[]
                     {
                         "FirstName", "LastName", "Gender", "DateOfBirth",
                         "CellPhone", "Email", "HasSystemUser"
                     })
            {
                type.GetProperty(expected).Should().NotBeNull($"{expected} is read by both clients' autofill");
            }
        }
    }

    // Source-text contract for the DAL mapping. PersonDAL.GetPersonByNationalIdForRegistration
    // opens a live Npgsql connection and reads by column name, so it cannot be
    // exercised without a database (no mocking framework / fake ADO.NET
    // provider exists in this project). Reading the real source and asserting
    // on it directly is the established pattern here for exactly this
    // situation (see StallAssignmentsHostRanchAuthorizationTests /
    // StallBookingRanchModelAuthorizationTests).
    public class PersonDalMappingContractTests
    {
        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "DAL", "PersonDAL.cs"));

            File.Exists(path).Should().BeTrue("expected PersonDAL.cs at {0}", path);
            return File.ReadAllText(path);
        }

        private static string MappingBody()
        {
            string source = DalSource();
            int from = source.IndexOf("return new PersonRegistrationLookupResponse", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            int to = source.IndexOf("return null;", from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);
            return source.Substring(from, to - from);
        }

        [Fact]
        public void Mapping_DoesNotReadPersonIdOrNationalIdColumns()
        {
            string body = MappingBody();

            body.Should().NotContain("reader[\"PersonId\"]");
            body.Should().NotContain("reader[\"NationalId\"]");
            body.Should().NotContain("PersonId =");
            body.Should().NotContain("NationalId =");
        }

        [Fact]
        public void Mapping_StillReadsEveryAutofillColumn()
        {
            string body = MappingBody();

            foreach (string column in new[]
                     {
                         "FirstName", "LastName", "Gender", "DateOfBirth",
                         "CellPhone", "Email", "HasSystemUser"
                     })
            {
                body.Should().Contain($"reader[\"{column}\"]", $"the {column} column must still be mapped");
            }
        }
    }

    // Not-found behavior (404) is unchanged by this task -- a source check
    // that the controller line is still exactly what it was, so a future edit
    // that alters the not-found contract does so knowingly, not by accident.
    public class PersonsControllerNotFoundContractTests
    {
        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "Controllers", "PersonsController.cs"));

            File.Exists(path).Should().BeTrue("expected PersonsController.cs at {0}", path);
            return File.ReadAllText(path);
        }

        [Fact]
        public void GetPersonByNationalIdForRegistration_StillReturns404WhenPersonIsNull()
        {
            ControllerSource().Should().Contain("return NotFound(\"Person not found\");");
        }

        [Fact]
        public void GetPersonByNationalIdForRegistration_StillReturns200WithBodyWhenFound()
        {
            ControllerSource().Should().Contain("return Ok(person);");
        }
    }
}
