using FluentAssertions;
using RideOnServer.BL;

namespace RideOnServer.Tests
{
    // P0 fix (2026-08-08): SystemUser.ChangePassword now calls
    // PasswordPolicyValidator.ValidateOrThrow(request.NewPassword) before hashing,
    // closing the gap where any authenticated SystemUser could set an arbitrarily
    // weak or empty password via change-password regardless of the registration
    // policy. This file proves the validator itself - pure, no DB - actually
    // rejects weak/empty passwords and accepts a compliant one, i.e. the exact
    // behavior SystemUser.ChangePassword now relies on.
    public class PasswordPolicyValidatorTests
    {
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("Ab1")]                 // too short
        [InlineData("abcdefgh1")]           // no uppercase
        [InlineData("ABCDEFGH1")]           // no lowercase
        [InlineData("Abcdefgh")]            // no digit
        [InlineData("Abcdef g1")]           // contains whitespace
        public void GetValidationMessage_ReturnsNonEmptyMessage_ForWeakOrEmptyPassword(string? password)
        {
            string message = PasswordPolicyValidator.GetValidationMessage(password);

            message.Should().NotBeNullOrEmpty();
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("weak")]
        public void ValidateOrThrow_Throws_ForWeakOrEmptyPassword(string? password)
        {
            Action act = () => PasswordPolicyValidator.ValidateOrThrow(password);

            act.Should().Throw<Exception>();
        }

        [Theory]
        [InlineData("Abcdefg1")]
        [InlineData("StrongPass9")]
        [InlineData("Xy9zzzzzzzzzzzz")]
        public void GetValidationMessage_ReturnsEmpty_ForCompliantPassword(string password)
        {
            string message = PasswordPolicyValidator.GetValidationMessage(password);

            message.Should().BeEmpty();
        }

        [Fact]
        public void ValidateOrThrow_DoesNotThrow_ForCompliantPassword()
        {
            Action act = () => PasswordPolicyValidator.ValidateOrThrow("Abcdefg1");

            act.Should().NotThrow();
        }
    }
}
