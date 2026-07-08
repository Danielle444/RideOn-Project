namespace RideOnServer.BL
{
    internal static class IdentifierNormalizer
    {
        internal static string Normalize(string? value)
        {
            return value?.Trim().ToLowerInvariant() ?? string.Empty;
        }
    }
}
