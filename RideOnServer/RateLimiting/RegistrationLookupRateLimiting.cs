namespace RideOnServer.RateLimiting
{
    // P0 PII-hardening audit (fix/person-lookup-pii-hardening): centralizes the
    // sliding-window limits for GET /Persons/by-national-id so the policy name
    // and the permit/window values are defined in exactly one place and can be
    // unit-tested directly without spinning up the ASP.NET Core pipeline.
    // Public rather than internal, matching this project's existing
    // preference for that over adding InternalsVisibleTo just for tests
    // (see PredictionService.ComputePrediction).
    public static class RegistrationLookupRateLimiting
    {
        public const string PolicyName = "registration-national-id-lookup";

        // Conservative manual-registration budget: a person retyping/correcting
        // a national ID a handful of times per minute stays well under this,
        // while brute-force enumeration of the ~10^8 valid-checksum ID space is
        // throttled to a crawl.
        public const int PermitLimit = 8;

        public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

        public const int SegmentsPerWindow = 4;

        // No queueing: once the window's permits are exhausted, reject
        // immediately (429) rather than making the caller wait.
        public const int QueueLimit = 0;
    }
}
