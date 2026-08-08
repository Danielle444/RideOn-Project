using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;

namespace RideOnServer.Tests
{
    // P0 fix (2026-08-08): SystemUser.ChangePassword had never called
    // PasswordPolicyValidator, unlike SuperUser.ChangePassword and
    // SystemUser.Register - any authenticated SystemUser (every mobile role plus
    // web Secretary) could set an arbitrarily weak or empty password via
    // change-password. The fix is one line: PasswordPolicyValidator.ValidateOrThrow
    // (request.NewPassword) after the current-password check and before hashing,
    // mirroring the existing SuperUser.ChangePassword/SystemUser.Register pattern
    // exactly - no controller/API/DTO shape change, no new policy.
    //
    // DB-free, matching every other contract test in this project (see
    // HealthCertificateRejectionContractTests / PayerProc212SelfServiceContractTests
    // for the precedent): SystemUserDAL has no interface and instantiates its own
    // connection, so ChangePassword cannot be exercised end-to-end without a live
    // DB. This proves the C# contract via reflection and bounded source-text
    // assertions; PasswordPolicyValidatorTests proves the validator's actual
    // reject/accept behavior.
    public class SystemUserChangePasswordPolicyContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string SystemUserBlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "BL", "SystemUser.cs"));

            File.Exists(path).Should().BeTrue("SystemUser.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string ChangePasswordMethodBody()
        {
            string source = SystemUserBlSource();

            int from = source.IndexOf(
                "internal static void ChangePassword(ChangePasswordRequest request)",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "ChangePassword was expected in SystemUser.cs");

            string rest = source.Substring(from);

            int to = rest.IndexOf("internal static void SetMustChangePassword", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void SystemUser_ChangePassword_method_still_exists_with_its_original_signature()
        {
            MethodInfo method = typeof(SystemUser)
                .GetMethod(
                    "ChangePassword",
                    BindingFlags.NonPublic | BindingFlags.Static)
                ?? throw new InvalidOperationException("SystemUser.ChangePassword was not found.");

            method.ReturnType.Should().Be(typeof(void));

            ParameterInfo[] parameters = method.GetParameters();
            parameters.Should().HaveCount(1);
            parameters[0].ParameterType.Name.Should().Be("ChangePasswordRequest");
        }

        [Fact]
        public void ChangePassword_calls_PasswordPolicyValidator_ValidateOrThrow_on_the_new_password()
        {
            string body = ChangePasswordMethodBody();

            body.Should().Contain("PasswordPolicyValidator.ValidateOrThrow(request.NewPassword);");
        }

        [Fact]
        public void ChangePassword_still_verifies_the_current_password_before_anything_else_writes()
        {
            string body = ChangePasswordMethodBody();

            body.Should().Contain("PasswordHelper.VerifyPassword(");
            body.Should().Contain("Current password is incorrect");
        }

        [Fact]
        public void ChangePassword_still_rejects_unknown_or_inactive_users()
        {
            string body = ChangePasswordMethodBody();

            body.Should().Contain("User not found");
            body.Should().Contain("User is inactive");
        }

        [Fact]
        public void ChangePassword_validates_the_new_password_after_verifying_the_current_one_and_before_hashing()
        {
            string body = ChangePasswordMethodBody();

            int verifyIndex = body.IndexOf("PasswordHelper.VerifyPassword(", StringComparison.Ordinal);
            int validateIndex = body.IndexOf("PasswordPolicyValidator.ValidateOrThrow(", StringComparison.Ordinal);
            int hashIndex = body.IndexOf("PasswordHelper.HashPassword(", StringComparison.Ordinal);

            verifyIndex.Should().BeGreaterThan(-1);
            validateIndex.Should().BeGreaterThan(-1);
            hashIndex.Should().BeGreaterThan(-1);

            validateIndex.Should().BeGreaterThan(verifyIndex,
                "the new password must not be policy-checked before the caller has proven they know the current password");
            validateIndex.Should().BeLessThan(hashIndex,
                "a weak new password must never reach hashing/storage");
        }

        [Fact]
        public void ChangePassword_does_not_alter_the_persistence_call()
        {
            string body = ChangePasswordMethodBody();

            body.Should().Contain("dal.UpdateSystemUserPassword(request.PersonId, newHash, newSalt);");
        }
    }
}
